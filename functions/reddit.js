const { logger } = require("firebase-functions");
const { log } = require("firebase-functions/logger");
const admin = require('firebase-admin');
const Snoowrap = require('snoowrap');
const UserAgent = require('user-agents');

admin.initializeApp();

async function updateDb(posts, cfg) {
    logger.log(`Saving ${posts.length} reddit posts...`);

    const { firebase, reddit } = cfg;

    const db = admin.firestore();
    const redditPostsRef = db.collection(firebase.collectionName);

    // filter posts that were already added
    const existingIds = new Set();
    const existingPosts = await redditPostsRef
        .orderBy('timestamp', 'desc')
        .limit(reddit.maxPosts + 1)
        .get();

    existingPosts.forEach(doc => existingIds.add(doc.data().nid));

    // add only the new ones to firebase
    posts.forEach(post => {
        if (existingIds.has(post.nid)) {
            logger.debug(`Skipped: already added: (${post.nid}) ${post.title}`);
        } else {
            post.timestamp = admin.firestore.FieldValue.serverTimestamp();
            redditPostsRef.add(post);
        }
    });
}

async function downloadPosts(cfg) {
    const { reddit } = cfg;

    const snoowrap = new Snoowrap({
        userAgent: new UserAgent({ platform: 'Win32' }).toString(),
        clientId: reddit.clientId,
        clientSecret: reddit.clientSecret,
        refreshToken: reddit.refreshToken
    });

    const posts = await snoowrap.getSubreddit(reddit.subreddit)
        .getNew({ limit: reddit.maxPosts });

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
            if (post.upvote_ratio >= reddit.minUpvoteRatio) {
                if (post.ups >= reddit.minUpvotes) {
                    return true;
                } else {
                    logger.info(`Skipped: upvotes ${post.ups} < ${reddit.minUpvotes}: ${post.title}`);
                }
            } else {
                logger.info(`Skipped: ratio ${post.upvote_ratio} < ${reddit.minUpvoteRatio}: ${post.title}`);
            }
            return false;
        })
        .map(post => ({
            nid: post.name,
            title: post.title,
            created_at: post.created_utc,
            author: post.author.name,
            url: post.url,
            flair: post.link_flair_text,
            ups: post.ups,
            is_on_x: false,
        }));

    return formattedPosts;
}

exports.fetchandstoreredditposts = async (config, event) => {
    logger.log('--- downloading reddit posts');

    try {
        await updateDb(await downloadPosts(config), config);
    } catch (error) {
        logger.error('Error downloading and storing reddit posts:', error);
    }

    return null;
};

// --- TEST ---
// (async function () {
//     const config = require('./config.json');
//     const p = await downloadPosts(config);
//     p.forEach(p => console.log(p.title));
// })();