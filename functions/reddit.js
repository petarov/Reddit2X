const { logger } = require("firebase-functions");
const { log } = require("firebase-functions/logger");
const admin = require('firebase-admin');
const axios = require('axios');
const UserAgent = require('user-agents');

admin.initializeApp();

async function updateDb(posts, cfg) {
    logger.info(`Saving ${posts.length} reddit posts...`);

    const { firebase, reddit } = cfg;

    const db = admin.firestore();
    const redditPostsRef = db.collection(firebase.collectionName);

    // filter posts that were already added
    const existingIds = new Set();
    const existingPosts = await redditPostsRef
        .orderBy('timestamp', 'desc')
        .limit(reddit.maxPosts * 2)
        .get();

    existingPosts.forEach(doc => existingIds.add(doc.data().nid));

    // add only the new ones to firebase
    posts.forEach(post => {
        if (existingIds.has(post.nid)) {
            logger.debug(`Skipped: already added: (${post.nid}) ${post.title}`);
            // TODO: update flair, upvotes count, etc. if not yet published
        } else {
            post.timestamp = admin.firestore.FieldValue.serverTimestamp();
            redditPostsRef.add(post);
        }
    });
}

async function downloadPosts(cfg) {
    const { reddit } = cfg;

    const headers = {
        Authorization: `Bearer ${reddit.accessToken}`,
        'User-Agent': new UserAgent({ platform: 'Win32' }).toString(),
    };

    const response = await axios.get(`https://oauth.reddit.com/r/${reddit.subreddit}/new.json?limit=${reddit.maxPosts}`, { headers });
    const posts = response.data.data.children;

    logger.info(`${posts.length} reddit posts fetched`);

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
            post = post.data;
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
            nid: post.data.name,
            title: post.data.title,
            created_at: post.data.created_utc,
            author: post.data.author.name,
            permalink: post.data.permalink,
            flair: post.data.link_flair_text,
            ups: post.data.ups,
            is_on_x: false,
        }));

    return formattedPosts;
}

exports.downloadandsave = async (config, event) => {
    logger.debug('--- downloading reddit posts');

    try {
        await updateDb(
            await downloadPosts(config),
            config
        );
    } catch (error) {
        logger.error('Error downloading and storing reddit posts:', error);
    }

    return null;
};