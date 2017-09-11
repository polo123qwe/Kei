var exec = require('child_process').exec;

var Command = require('../commandTemplate');
var Connection = require('../db/dbConnection');
var levels = require('../../consts/levels.json');
var paramtypes = require('../../consts/paramtypes.json');
var dbUtils = require('../db/dbUtils');
var dbUsers = require('../db/dbUsers');
var dbGuild = require('../db/dbGuild');
var utils = require('../utils/utils');
var discordUtils = require('../utils/discordUtils');
var moderationUtils = require('../utils/moderationUtils');
var logger = require('../utils/logger');
var commands = [];

var cmd;
////////////////////////////////////////////////////////////
cmd = new Command('ping', 'Others');
cmd.addHelp('Returns pong and delay');
cmd.cd = 5;
cmd.dm = true;
cmd.minLvl = levels.DEFAULT;
cmd.execution = function(client, msg, suffix) {
    var time = Date.now();
    msg.channel.send("Pong!").then((nMsg) => {
        nMsg.edit("Pong! (" + (Date.now() - time) + "ms)");
    }).catch((e) => {
		logger.warn(discordUtils.missingPerms("Send Message", msg.guild));
	});

}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('eval', 'Debugging');
cmd.addHelp('Evals some code');
cmd.addUsage('<code>');
cmd.minLvl = levels.MASTER;
cmd.execution = function(client, msg, suffix) {
    var result;

    try {
		if(suffix){
			result = eval(suffix.join(" "));
		}
    } catch (err) {
        logger.warn(err.message);
        msg.channel.send("Error ```js\n" + err.message + "```").catch((e) => {
			logger.warn(e);
		});
        return;
    }

    if (result) {
        Promise.resolve(result).then(function(res) {
			if(res){
				msg.channel.send(res).catch((e) => {
					logger.warn(e);
				});
			}
        });
    }
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('gpull', 'Core');
cmd.addHelp('Updates local repo');
cmd.minLvl = levels.MASTER;
cmd.execution = function(client, msg) {
    var cmd = 'git pull';

    msg.channel.send("Updating..").then(() => {
        exec(cmd, function(error, stdout, stderr) {
			if(error){
				msg.channel.send("Something went wrong").catch();
			} else {
				msg.channel.send("Rebooting").then(() => {
					client.destroy().then(() => {
						process.exit();
					});
				});
			}
        });
    })
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('kill', 'Core');
cmd.addHelp('Kills the bot');
cmd.minLvl = levels.MASTER;
cmd.execution = function(client, msg) {
    msg.channel.send('*ded*').then(kill).catch(kill);

	function kill(){
		logger.info('Shutting down...');
        client.destroy().then(() => {
            process.exit();
        });
	}
}
commands.push(cmd);
////////////////////////////////////////////////////////////

module.exports = commands;
