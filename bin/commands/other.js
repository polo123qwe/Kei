var Command = require('../commandTemplate');
var Connection = require('../dbConnection');
var levels = require('../../consts/levels.json');
var paramtypes = require('../../consts/paramtypes.json');
var utils = require('../utils');
var dbUtils = require('../dbUtils');
var discordUtils = require('../discordUtils');
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
    var time = suffix[0];
    if(time < 0) time = 1;
    var alert = "" + msg.author;
    if(suffix.length > 1){
        alert += suffix.splice(1, suffix.length).join(" ");
    } else {
        alert += "Time is up!"
    }
    discordUtils.sendAndDelete(msg.channel, "Alarm set! " + time + " min");
    setTimeout(() => {
        msg.channel.sendMessage(alert);
    }, time * 60 * 1000);
}
commands.push(cmd);
////////////////////////////////////////////////////////////

module.exports = commands;
