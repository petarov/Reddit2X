const { onSchedule } = require("firebase-functions/v2/scheduler");
const reddit = require('./reddit');
const x = require('./x');
const trasher = require('./trasher');
const config = require('./config.json');

exports.xpublish = onSchedule("*/30 * * * *",
    async (event) => x.publishxcrap(config, event));

// --- runs every 2 hours
exports.redditdownloadandsave = onSchedule("0 */2 * * *",
    async (event) => reddit.downloadandsave(config, event));

// --- runs at 05:00 every Sunday
exports.trasherdeleteoldposts = onSchedule("0 5 * * 0",
    async (event) => trasher.deleteoldposts(config, event));
