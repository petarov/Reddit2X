const { logger } = require("firebase-functions");
const admin = require('firebase-admin');
const { TwitterApi } = require('twitter-api-v2');

async function doPost(config) {
    const { firebase, twitter } = config;

    const db = admin.firestore();
    const redditPostsRef = db.collection(firebase.collectionName);

    let xSettings;
    let xAccessToken;

    // get X configuration tokens
    const settingsRef = db.collection(firebase.collectionName)
        .doc(firebase.subCollectionName).collection('settings');
    const xRef = settingsRef.doc('x');
    const xDoc = await xRef.get();

    if (xDoc.exists) {
        xSettings = xDoc.data();
    } else {
        xSettings = twitter;
        await xRef.set(twitter);
        logger.info('Saved x settings from config.json');
    }

    const result = await refreshXToken(xSettings);
    if (result.updated) {
        // update expired access token and refresh token
        const { accessToken,
            refreshToken,
            accessTokenCreateTime,
            accessTokenExpiresIn } = result;
        logger.info('Saving new x access and refresh tokens...');
        await xRef.update({
            accessToken,
            refreshToken,
            accessTokenCreateTime,
            accessTokenExpiresIn
        });
        xAccessToken = accessToken;
    } else {
        // use current access token from storage
        xAccessToken = xSettings.accessToken;
    }

    // query unreposted Reddit posts ordered by timestamp (oldest first)
    const postsQuery = await redditPostsRef.where('is_on_x', '==', false).orderBy('created_at').limit(1).get();

    if (!postsQuery.empty) {
        const unposted = postsQuery.docs[0];
        const post = unposted.data();

        logger.debug(`Found something to post on X`, post);

        const xDoc = await xRef.get();
        await doX(post, xAccessToken);

        // mark as posted
        await unposted.ref.update({ is_on_x: true });

        return post;
    } else {
        logger.info('Nothing to post');
    }

    return null;
}

async function doX(post, accessToken) {
    logger.info(`Crapping on X: ${post.permalink}`);

    const client = new TwitterApi(accessToken);
    await client.v2.tweet(`${post.title} https://reddit.com${post.permalink}`);
}

async function refreshXToken(xSettings) {
    const { accessTokenCreateTime, accessTokenExpiresIn } = xSettings;

    const now = Date.now();
    // X sucks! See https://devcommunity.x.com/t/refresh-token-expiring-with-offline-access-scope/168899?page=3
    const then = accessTokenCreateTime + (accessTokenExpiresIn / 2) * 1000;

    if (then < now) {
        const { clientId, clientSecret, refreshToken } = xSettings;
        const client = new TwitterApi({ clientId, clientSecret });

        logger.info(`X access token (${accessTokenExpiresIn}) has expired. Refreshing using ${refreshToken.substring(0, 7)}...`);

        const { client: refreshedClient, accessToken, refreshToken: newRefreshToken, expiresIn } =
            await client.refreshOAuth2Token(refreshToken);

        console.debug(`New access token obtained: ${accessToken.substring(0, 7)}...`);
        console.debug(`New refresh token obtained: ${newRefreshToken.substring(0, 7)}...`);

        return {
            updated: true,
            accessToken,
            refreshToken: newRefreshToken,
            accessTokenCreateTime: now,
            accessTokenExpiresIn: expiresIn
        };
    }

    return { updated: false };
}

exports.publishxcrap = async (config, event) => {
    logger.debug('**** publishing on x');

    try {
        await doPost(config);
    } catch (error) {
        logger.error('Error publishing on x:', error);
    }

    return null;
};