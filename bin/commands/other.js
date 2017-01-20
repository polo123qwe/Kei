var Command = require('../commandTemplate');
var Connection = require('../db/dbConnection');
var levels = require('../../consts/levels.json');
var paramtypes = require('../../consts/paramtypes.json');
var utils = require('../utils/utils');
var dbUtils = require('../db/dbUtils');
var discordUtils = require('../utils/discordUtils');
var commands = [];

var cmd;
////////////////////////////////////////////////////////////
cmd = new Command('timer', 'Utils');
cmd.addHelp('sets a timer in minutes');
cmd.addUsage('<time> [message]');
cmd.dm = true;
cmd.minLvl = levels.DEFAULT;
cmd.params.push(paramtypes.NUMBER);
cmd.execution = function(client, msg, suffix) {
    var time = parseInt(suffix[0], 10);
    if(time < 0) time = 1;
    var alert = msg.author + " Reminder: ";
    if(suffix.length > 1){
        alert += suffix.splice(1, suffix.length).join(" ");
    } else {
        alert += "Time is up!"
    }

	if(msg.mentions.everyone || alert.includes("@here") || alert.includes("@everyone")){
		alert = "Default message"
	}

    discordUtils.sendAndDelete(msg.channel, "Alarm set! " + time + " min");
    setTimeout(() => {
        msg.channel.sendMessage(alert);
    }, parseInt(time * 60 * 1000, 10));
}
commands.push(cmd);
////////////////////////////////////////////////////////////

module.exports = commands;
