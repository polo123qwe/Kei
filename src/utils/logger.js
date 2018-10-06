const utils = require('./utils')
const {createLogger, transports, format} = require('winston');
const {timestamp, combine, printf } = format;
const Discord = require('discord.js');
const webhookData = require('../../config.json').webhook;
const devMode = require('../../config.json').dev;

let webhook;

const loggerFormat = printf(info => {
    return `[${utils.unixToTime(info.timestamp)}] ${info.level}: ${info.message}`;
});

const levels = {
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

const logger = createLogger({
    format: combine(
        timestamp(),
        loggerFormat
    ),
    transports: [
        new transports.Console({
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
