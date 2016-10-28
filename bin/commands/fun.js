var Command = require('../commandTemplate');
var Connection = require('../dbConnection');
var levels = require('../../consts/levels.json');
var paramtypes = require('../../consts/paramtypes.json');
var utils = require('../utils');
var discordUtils = require('../discordUtils');
var dbUtils = require('../dbUtils');
var commands = [];

var cmd;
////////////////////////////////////////////////////////////
cmd = new Command('otp', 'Fun');
cmd.addHelp('Returns a random ship');
cmd.minLvl = levels.DEFAULT;
cmd.cd = 30;
cmd.execution = function(client, msg, suffix) {
    var members = msg.guild.members.array();

    var memb1 = members[0];
    var memb2 = members[0];
    while (memb1 == memb2 || !memb1.roles.exists('name', 'Member') || !memb2.roles.exists('name', 'Member')) {
        memb1 = members[utils.getRandom(0, members.length - 1)];
        memb2 = members[utils.getRandom(0, members.length - 1)];
    }

    msg.channel.sendMessage(':revolving_hearts: ' + memb1.user.username + " x " + memb2.user.username + ' :revolving_hearts:');
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('randu', 'Fun');
cmd.addHelp('Returns a random member');
cmd.minLvl = levels.DEFAULT;
cmd.cd = 20;
cmd.execution = function(client, msg, suffix) {

    var members = msg.guild.members.array();
    var member;

    while (member == null || !member.roles.exists('name', 'Member')) {
        member = members[utils.getRandom(0, members.length - 1)];
    }

    msg.channel.sendMessage(`${member} has been selected!`);
}
commands.push(cmd);
////////////////////////////////////////////////////////////

module.exports = commands;
