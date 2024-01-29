const { logger } = require("firebase-functions");
const admin = require('firebase-admin');
const { TwitterApi } = require('twitter-api-v2')

async function doPost(config) {
    const { firebase, reddit } = config;

    const db = admin.firestore();
    const redditPostsRef = db.collection(firebase.collectionName);

    // Query unreposted Reddit posts ordered by timestamp (oldest first)
    const postsQuery = await redditPostsRef.where('is_on_x', '==', false).orderBy('created_at').limit(1).get();

    if (!postsQuery.empty) {
        const unposted = postsQuery.docs[0];
        const post = unposted.data();

        logger.debug(`Found something to post on X`, post);
        await doX(post, config);

        // mark as posted
        await unposted.ref.update({ is_on_x: true });

        return post;
    } else {
        logger.info('Nothing to post');
    }

    return null;
}

async function doX(post, config) {
    const { firebase, twitter } = config;

    logger.info(`Crapping on X: ${post.permalink}`);

    const client = new TwitterApi(twitter.accessToken);

    await client.v2.tweet(`${post.title} https://reddit.com${post.permalink}`);
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

