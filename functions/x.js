const { logger } = require("firebase-functions");
const { log } = require("firebase-functions/logger");
const admin = require('firebase-admin');

exports.publishxcrap = async (config, event) => {
    logger.debug('**** publishing on x');

    try {
        const { firebase, reddit } = config;

        const db = admin.firestore();
        const redditPostsRef = db.collection(firebase.collectionName);

        // Query unreposted Reddit posts ordered by timestamp (oldest first)
        const postsQuery = await redditPostsRef.where('is_on_x', '==', false).orderBy('timestamp').limit(1).get();

        if (!postsQuery.empty) {
            const unposted = postsQuery.docs[0];

            // TODO:
            // await unposted.ref.update({ is_on_x: true });

            console.debug('*** publishing X post:', unposted.data());
        } else {
            console.info('Nothing to post');
        }
    } catch (error) {
        console.error('Error publishing on x:', error);
    }

    return null;
};