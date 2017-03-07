var Command = require('../commandTemplate');
var Connection = require('../db/dbConnection');
var levels = require('../../consts/levels.json');
var paramtypes = require('../../consts/paramtypes.json');
var utils = require('../utils/utils');
var discordUtils = require('../utils/discordUtils');
var dbUtils = require('../db/dbUtils');
var dbGuild = require('../db/dbGuild');
var commands = [];

var cmd;
////////////////////////////////////////////////////////////
cmd = new Command('otp', 'Fun');
cmd.addHelp('Returns a random ship');
cmd.minLvl = levels.DEFAULT;
cmd.cd = 30;
cmd.execution = function(client, msg, suffix) {
    var members = msg.guild.members.array()
		.filter(check);

    function check(member){
    	return dbUtils.getLevel(msg.guild,member,canBeAdded);
	}
	function canBeAdded(err, level){
    	return !err && level > -1;
	}
    var chosen = utils.getRandom(0, members.length - 1);
    var memb1 = members[chosen];
    members.splice(chosen,1);
    var memb2 = members[utils.getRandom(0, members.length - 1)];

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
    var member = members[utils.getRandom(0, members.length - 1)];
	var i = 0;
	dbUtils.getLevel(msg.guild, member, checkFirst);

	function checkFirst(err, res){
		if(err || i > 50000) return; //Avoid infinite loop
		i++;
		if(res > -1){
			msg.channel.sendMessage(`:arrow_forward:    |    **${member.user.username}** has been selected!`);
		} else {
			member = members[utils.getRandom(0, members.length - 1)];
			dbUtils.getLevel(msg.guild, member, checkFirst);
		}
	}
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('suicide', 'Fun');
cmd.alias.push('die');
cmd.addHelp('Mutes a user for a random time');
cmd.minLvl = levels.DEFAULT;
cmd.execution = function(client, msg, suffix) {

    var num = utils.getRandom(1, 1000);
    var time;
    if(num == 5){
        time = 3600 * 1000;
    } else{
        time = num/2 * 1000;
    }

    var member = msg.member;
    var role = msg.guild.roles.find((r) => r.name.toLowerCase() == "muted");

    if (!role) return discordUtils.sendAndDelete(msg.channel, "Role not found!");
    member.addRole(role).then(r => {
        dbUtils.insertTimer(Date.now(), time, member.user.id, role.id, msg.guild.id, function() {});
        msg.channel.sendMessage(`:no_bell:    |    **${member.user.username}** you are dead for ${utils.convertUnixToDate(time).toLowerCase().slice(0, -1)}!`, 8000);
        setTimeout(() => {
            member.removeRole(role).then(() => {
            }).catch(console.log);
            dbUtils.removeTimer(member.user.id, r.id, function() {});
        }, time);
    }).catch(err => discordUtils.sendAndDelete(msg.channel, ':warning: Bot error! ' + err.response.body.message));
}
commands.push(cmd);
////////////////////////////////////////////////////////////

module.exports = commands;
