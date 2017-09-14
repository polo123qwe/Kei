const utils = require('./utils')
const winston = require('winston');
const Discord = require('discord.js');
const webhookData = require('../../config.json').webhook;
const devMode = require('../../config.json').dev;

var webhook;

var levels = {
    error: "<:error:356623800617664523>",
    warn: "⚠",
    info: "ℹ",
    verbose: "🤔",
    debug: "🤔",
    silly: "🤔",
	aperture: "<:aperture:356626031400189953>",
}

if (webhookData.enabled) {
    webhook = new Discord.WebhookClient(webhookData.id, webhookData.token, {
        fetchAllMembers: true,
        disableEveryone: true
    });
}

var logger = new(winston.Logger)({
    transports: [
        new winston.transports.Console({
            'timestamp': () => {
                return `[${utils.unixToTime(Date.now())}]`;
            },
            'prettyPrint': true,
            'colorize': true,
        })
    ]
});

logger.on('logging', function(transport, level, msg, meta) {
	var devText = "";
	if(devMode){
		devText = " 🚧";
		return;
	}
	if(msg.includes("Bot connected")){
		level = "aperture";
	}
	webhook.send(`\`[${utils.unixToTime(Date.now())}]\`${devText} ${levels[level]} ${msg}${devText}`);
});

module.exports = logger;
