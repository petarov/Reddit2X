const { logger } = require("firebase-functions");
const admin = require('firebase-admin');

exports.publishxcrap = (event) => {
    logger.log('**** publishing to x');

    try {
        // const posts = downloadPosts();
        // updateDb(posts);
    } catch (error) {
        logger.error('Error publishing to X:', error);
    }

    return null;
};