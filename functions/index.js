const { onSchedule } = require("firebase-functions/v2/scheduler");
const reddit = require('./reddit');
const x = require('./x');
const trasher = require('./trasher');
const config = require('./config.json');

// --- runs every 5 minutes
exports.redditdownloadandsave = onSchedule("*/5 * * * *", 
    async (event) => reddit.downloadandsave(config, event));

// --- runs every 3 minutes
exports.xpublish =  onSchedule("*/3 * * * *", 
    async (event) => x.publishxcrap(config, event));

// --- runs every hour
exports.trasherdeleteoldposts = onSchedule("0 * * * *", 
    async (event) => trasher.deleteoldposts(config, event));
