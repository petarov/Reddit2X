const { logger } = require("firebase-functions");
const admin = require('firebase-admin');
const { TwitterApi } = require('twitter-api-v2')

async function getPost(config) {
    const { firebase, reddit } = config;

    const db = admin.firestore();
    const redditPostsRef = db.collection(firebase.collectionName);

    // Query unreposted Reddit posts ordered by timestamp (oldest first)
    const postsQuery = await redditPostsRef.where('is_on_x', '==', false).orderBy('created_at').limit(1).get();

    if (!postsQuery.empty) {
        const unposted = postsQuery.docs[0];

        // TODO:
        // await unposted.ref.update({ is_on_x: true });

        logger.debug('Found something to post to X:', unposted.data());

        return unposted.data();
    } else {
        logger.info('Nothing to post');
    }

    return null;
}

async function doX(post, config) {
    const { firebase, twitter } = config;

    logger.debug('Crapping on X...');

    const client = new TwitterApi(twitter);

    await client.v1.tweet(`${post.title} ${post.url}`);
}

exports.publishxcrap = async (config, event) => {
    logger.debug('**** publishing on x');

    try {
        await doX(
            await getPost(config), 
            config
        );
    } catch (error) {
        logger.error('Error publishing on x:', error);
    }

    return null;
};

// --- TEST ---
