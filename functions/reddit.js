const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const Snoowrap = require('snoowrap');
const UserAgent = require('user-agents');

admin.initializeApp();

async function updateDb(posts, cfg) {
    logger.log(`Saving ${posts.length} reddit posts...`);

    const db = admin.firestore();
    const redditPostsRef = db.collection(cfg.collectionName);

    // Delete existing documents in the collection
    const deleteQuery = await redditPostsRef.get();
    deleteQuery.forEach(doc => doc.ref.delete());

    // Add the latest posts to the collection
    posts.forEach(post => redditPostsRef.add(post));
}

async function downloadPosts(cfg) {
    const reddit = new Snoowrap({
        userAgent: new UserAgent({ platform: 'Win32' }).toString(),
        clientId: cfg.clientId,
        clientSecret: cfg.clientSecret,
        refreshToken: cfg.refreshToken
    });

    const posts = await reddit.getSubreddit(cfg.subreddit)
        .getNew({ limit: cfg.maxPosts });

    logger.log(`${posts.length} reddit posts fetched`);

    const formattedPosts = posts
        // .reduce((prev, post) => {
        //     if (post.upvote_ratio >= cfg.minUpvoteRatio) {
        //         if (post.ups >= cfg.minUpvotes) {
        //             return {
        //                 title: post.title,
        //                 url: post.url,
        //                 author: post.author.name,
        //             }
        //         } else {
        //             logger.info(`Skipped: upvotes < ${post.ups}: ${post.title}`);
        //         }
        //     } else {
        //         logger.info(`Skipped: ratio < ${post.upvote_ratio}: ${post.title}`);
        //     }
        //     return {};
        // }, []);
    .filter(post => {
        if (post.upvote_ratio >= cfg.minUpvoteRatio) {
            if (post.ups >= cfg.minUpvotes) {
                return true;
            } else {
                logger.info(`Skipped: upvotes ${post.ups} < ${cfg.minUpvotes}: ${post.title}`);
            }
        } else {
            logger.info(`Skipped: ratio ${post.upvote_ratio} < ${cfg.minUpvoteRatio}: ${post.title}`);
        }
        return false;
    })
    .map(post => ({
      id: post.name,
      title: post.title,
      url: post.url,
      author: post.author.name,
      flair: post.link_flair_text,
      ups: post.ups,
    }));

    logger.log(`${formattedPosts.length} reddit posts ready for saving`);

    return formattedPosts;
}

exports.fetchandstoreredditposts = async (config, event) => {
    logger.log('**** downloading reddit posts');

    try {
        await updateDb(await downloadPosts(config.reddit), config.firebase);
    } catch (error) {
        logger.error('Error fetching and storing Reddit posts:', error);
    }

    return null;
};

// // --- TEST ---
// (async function () {
//     const config = require('./config.json');
//     const p = await downloadPosts(config.reddit);
// })();