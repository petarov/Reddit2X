const { logger } = require("firebase-functions");
const admin = require('firebase-admin');

exports.deleteoldposts = async (config, event) => {
    logger.debug('--- removing old reddit posts from db');

    try {
        const { firebase } = config;

        const db = admin.firestore();
        const redditPostsRef = db.collection(firebase.collectionName);

        const threshold = new Date();
        threshold.setDate(threshold.getDate() - firebase.postTTLDays);

        // query for posts older than X days
        const oldPostsQuery = await redditPostsRef.where('timestamp', '<', threshold).get();

        const promises = oldPostsQuery.docs.map(doc => doc.ref.delete());
        await Promise.all(promises);

        logger.info(`Deleted ${promises.length} posts`);

    } catch (error) {
        logger.error('Error removing old reddit posts:', error);
    }

    return null;
};