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
        logger.debug('*** xDoc.data', xSettings);
    } else {
        xSettings = twitter;
        await xRef.set(twitter);
        logger.info('Updated x settings');
    }

    const result = await refreshXToken(xSettings);
    if (result.updated) {
        // update expired access token and refresh token
        const { accessToken, refreshToken } = result;
        logger.info('Saving new x access and refresh tokens...');
        await xRef.update({ accessToken, refreshToken });
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
    let updated = false;

    const now = Date.now();
    const then = accessTokenCreateTime + accessTokenExpiresIn * 1000;

    if (then < now) {
        logger.info(`X access token (${accessTokenExpiresIn}) has expired. Refreshing...`);

        const { clientId, clientSecret, refreshToken } = xSettings;
        const client = new TwitterApi({ clientId, clientSecret });

        const { client: refreshedClient, accessToken, refreshToken: newRefreshToken } =
            await client.refreshOAuth2Token(refreshToken);

        console.debug(`New access token obtained: ${accessToken.substring(0, 7)}...`);
        console.debug(`New refresh token obtained: ${refreshToken.substring(0, 7)}...`);

        updated = true;
        return { updated, accessToken, refreshToken };
    }

    return { updated };
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

// --- TEST ---
// (async function () {
//     const config = require('./config.json');
//     // await refreshXToken(config, async (accessToken, refreshToken) => {
//     //     console.log('*** NEW TOKENS ', accessToken, refreshToken);
//     // });
//     await doX({ title: 'Народе??', permalink: 'https://www.reddit.com/r/bulgariaeu/comments/19eijam/народе/' }, config);
// })();