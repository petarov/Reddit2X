const { onSchedule } = require("firebase-functions/v2/scheduler");
const reddit = require('./reddit');
const x = require('./x');
const trasher = require('./trasher');
const config = require('./config.json');

// --- runs every 3 minutes (TODO: ever 1 hour)
exports.xpublish = onSchedule("*/3 * * * *", 
    async (event) => x.publishxcrap(config, event));

// --- runs every 1 hour
exports.redditdownloadandsave = onSchedule("0 * * * *", 
    async (event) => reddit.downloadandsave(config, event));

// --- runs every 2 hours
exports.trasherdeleteoldposts = onSchedule("0 */2 * * *", 
    async (event) => trasher.deleteoldposts(config, event));
