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
cmd.dm = true;
cmd.minLvl = levels.MASTER;
cmd.execution = function(client, msg, suffix) {
    var result;

    try {
        result = eval(suffix.join(" "));
    } catch (err) {
        console.log(err);
        msg.channel.sendCode("", err);
        return;
    }
    // @TODO Something causes error here, check it
    msg.channel.sendMessage(result) /*.catch(console.log)*/ ;
}
commands.push(cmd);
////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////
cmd = new Command('kill', 'Core');
cmd.addHelp('Kills the bot');
cmd.minLvl = levels.MASTER;
cmd.execution = function(client, msg) {
    msg.channel.sendMessage('Goodbye!').then(() => {
        console.log('Shutting down...');
        client.destroy().then(() => {
            process.exit();
        });
    });
}
commands.push(cmd);
////////////////////////////////////////////////////////////

module.exports = commands;
