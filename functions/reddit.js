const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const UserAgent = require('user-agents');

admin.initializeApp();

async function updateDb(posts, cfg) {
    // Store the posts in Firebase (replace 'redditPosts' with your desired collection name)
    const db = admin.firestore();
    const redditPostsRef = db.collection(cfg.collectionName);

    // Delete existing documents in the collection
    const deleteQuery = await redditPostsRef.get();
    deleteQuery.forEach(doc => doc.ref.delete());

    // Add the latest posts to the collection
    posts.forEach(post => redditPostsRef.add(post));
}

async function downloadPosts(cfg) {
    const url = `https://www.reddit.com/r/${cfg.subreddit}/new.json?limit=2`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'User-Agent': new UserAgent({ platform: 'Win32' }).toString(),
        },
    });

    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} - ${response.statusText}`);
    }

    const json = await response.json();

    const posts = json.data.children.map(post => ({
        title: post.data.title,
        url: post.data.url,
        author: post.data.author,
    }));

    logger.log(`${posts.length} reddit posts fetched and stored successfully`);

    return posts;
}

exports.fetchandstoreredditposts = async (config, event) => {
    logger.log('**** downloading reddit posts');

    // const reddit = new Snoowrap({
    //     userAgent: new UserAgent({ platform: 'Win32' }).toString(),
    //     clientId: config.clientId,
    //     clientSecret: config.clientSecret,
    //     refreshToken: config.refreshToken
    // });

    try {
        updateDb(await downloadPosts(config.reddit), cfg.firebase);
    } catch (error) {
        logger.error('Error fetching and storing Reddit posts:', error);
    }

    return null;
};

// --- TEST ---
(async function () {
    const config = require('./config.json');
    const p = await downloadPosts(config.reddit);
    console.log(p);
})();