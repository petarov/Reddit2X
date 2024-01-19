const { onSchedule } = require("firebase-functions/v2/scheduler");
const reddit = require('./reddit');
const x = require('./x');
const config = require('./config.json');

// --- runs every 5 minutes
exports.downloadredditposts = onSchedule("*/5 * * * *", 
    async (event) => reddit.fetchandstoreredditposts(config, event));

// --- runs every 5 minutes
//exports.publishxposts = x.publishxcrap;