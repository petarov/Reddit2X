const { logger } = require("firebase-functions");
const { log } = require("firebase-functions/logger");
const admin = require('firebase-admin');
const axios = require('axios');

const OAUTH_ACCESS_TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';

admin.initializeApp();

async function updateDb(cfg, posts) {
    const { firebase, reddit } = cfg;

    logger.info(`Saving ${posts.length} reddit posts...`);

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

async function newAccessToken(cfg) {
    const { reddit } = cfg;
    const response = await axios.post(OAUTH_ACCESS_TOKEN_URL, new URLSearchParams({
        grant_type: 'client_credentials',
    }), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': reddit.userAgent,
            Authorization: `Basic ${Buffer.from(`${reddit.clientId}:${reddit.clientSecret}`)
                .toString('base64')}`,
        },
    });

    return {
        accessToken: response.data.access_token,
        accessTokenExpiresIn: response.data.expires_in,
        accessTokenCreateTime: Date.now()
    };
}

async function getAccessToken(cfg) {
    const { firebase, reddit } = cfg;

    let rSettings;
    let rAccessToken;

    // get reddit configuration tokens
    const db = admin.firestore();
    const settingsRef = db.collection(firebase.collectionName)
        .doc(firebase.subCollectionName).collection('settings');
    const rRef = settingsRef.doc('r');
    const rDoc = await rRef.get();

    if (rDoc.exists) {
        rSettings = rDoc.data();
    } else {
        rSettings = reddit;
        await rRef.set({
            accessToken: reddit.accessToken,
            accessTokenCreateTime: reddit.accessTokenCreateTime,
            accessTokenExpiresIn: reddit.accessTokenExpiresIn,
        });
        logger.info('Saved reddit settings from config.json');
    }

    const now = Date.now();
    const then = rSettings.accessTokenCreateTime + Math.max(0, rSettings.accessTokenExpiresIn - 60 * 60) * 1000;

    if (then < now) {
        // update expired access token one hour earlier than expiry time
        const result = await newAccessToken(cfg);
        const { accessToken, accessTokenCreateTime, accessTokenExpiresIn } = result;
        logger.info('Saving new reddit access and token valid for:', accessTokenExpiresIn);
        await rRef.update({
            accessToken,
            accessTokenCreateTime,
            accessTokenExpiresIn
        });
        rAccessToken = accessToken;
    } else {
        // use current access token from storage
        rAccessToken = rSettings.accessToken;
    }

    return rAccessToken;
}

async function downloadPosts(cfg, accessToken) {
    const { reddit } = cfg;

    const headers = {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': reddit.userAgent
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
            author: post.data.author,
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
        const accessToken = await getAccessToken(config);
        const posts = await downloadPosts(config, accessToken);
        await updateDb(config, posts);
    } catch (error) {
        logger.error('Error downloading and storing reddit posts:', error);
    }

    return null;
};

// --- TEST
// (async function() {
//     try {
//         const config = require('./config.json');
//         const resp = await newAccessToken(config);
//         console.log(resp);
//         await downloadPosts(config, resp.accessToken);
//     } catch (error) {
//         logger.error('Error downloading and storing reddit posts:', error);
//     }
// })();