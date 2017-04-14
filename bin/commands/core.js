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
    msg.channel.sendMessage("Pong!").then((nMsg) => {
        nMsg.edit("Pong! (" + (Date.now() - time) + "ms)");
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
        result = eval(suffix.join(" "));
    } catch (err) {
        console.log(err);
        msg.channel.sendCode("", err).catch(console.log);
        return;
    }

    if (result) {
        Promise.resolve(result).then(function(res) {
			if(res){
				msg.channel.sendMessage(res).catch(console.log);
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

    msg.channel.sendMessage("Updating..").then(() => {
        exec(cmd, function(error, stdout, stderr) {
            if (error) console.log(error);
            if (stdout) console.log(stdout);
			if (stderr) console.log(stderr);
			if(error){
				msg.channel.sendMessage("Something went wrong").catch();
			} else {
				msg.channel.sendMessage("Rebooting").then(() => {
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
    msg.channel.sendMessage('*ded*').then(() => {
        console.log('Shutting down...');
        client.destroy().then(() => {
            process.exit();
        });
    });
}
commands.push(cmd);
////////////////////////////////////////////////////////////

module.exports = commands;
