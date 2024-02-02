const { onSchedule } = require("firebase-functions/v2/scheduler");
const reddit = require('./reddit');
const x = require('./x');
const trasher = require('./trasher');
const config = require('./config.json');

exports.xpublish = onSchedule(config.cron.x,
    async (event) => x.publishxcrap(config, event));

// --- runs every 2 hours
exports.redditdownloadandsave = onSchedule(config.cron.reddit,
    async (event) => reddit.downloadandsave(config, event));

// --- runs at 05:00 every Sunday
exports.trasherdeleteoldposts = onSchedule(config.cron.cleanup,
    async (event) => trasher.deleteoldposts(config, event));
