var Command = require('../commandTemplate');
var Connection = require('../db/dbConnection');
var levels = require('../../consts/levels.json');
var paramtypes = require('../../consts/paramtypes.json');
var utils = require('../utils/utils');
var dbUtils = require('../db/dbUtils');
var dbUsers = require('../db/dbUsers');
var dbGuild = require('../db/dbGuild');
var discordUtils = require('../utils/discordUtils');
var https = require('https');
var commands = [];

var cmd;
////////////////////////////////////////////////////////////
cmd = new Command('otp', 'Fun');
cmd.addHelp('Returns a random ship');
cmd.minLvl = levels.DEFAULT;
cmd.cd = 30;
cmd.execution = function(client, msg, suffix) {
    var members = msg.guild.members.array();
    var current = utils.getRandom(0, members.length - 1);
    var chosen = [];
    dbUtils.getLevel(msg.guild, members[current], check);

	// Iterate over users until we find the data or we consume it
    function check(err, level) {
        if (members.length != 0 && chosen.length < 2) {
            // Store user is its valid
			if (!err && level > -1) {
                chosen.push(members[current]);
            }
            members.splice(current, 1);
            current = utils.getRandom(0, members.length - 1);
			//New call to the method
            return dbUtils.getLevel(msg.guild, members[current], check);
        } else {
			// If we've got no members.
			if (chosen.length != 2) {
				msg.channel.send('There are no valid OTP :broken_heart:');
				return;
			}
			msg.channel.send(':revolving_hearts: ' + chosen[0].user.username + " x " + chosen[1].user.username + ' :revolving_hearts:');
		}
    }
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('randu', 'Fun');
cmd.addHelp('Returns a random member');
cmd.minLvl = levels.DEFAULT;
cmd.cd = 20;
cmd.reqDB = true;
cmd.execution = function(client, msg, suffix) {

    var members = msg.guild.members.array();
    var member = members[utils.getRandom(0, members.length - 1)];
    var i = 0;
    dbUtils.getLevel(msg.guild, member, checkFirst);

    function checkFirst(err, res) {
        if (members.length == 0){
			return;
		}
		if (res > -1) {
            msg.channel.send(`:arrow_forward:  |  **${member.user.username}** has been selected!`);
        } else {
			members.splice(members.indexOf(member), 1);
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
    if (num < 20) {
        time = 3600 * 500;
    } else {
        time = num * 2 * 1000;
    }

    var member = msg.member;
    var role = msg.guild.roles.find((r) => r.name.toLowerCase() == "muted");

    if (!role) return discordUtils.sendAndDelete(msg.channel, "Role not found!");
    member.addRole(role).then(r => {
        dbUtils.insertTimer(Date.now(), time, member.user.id, role.id, msg.guild.id, function() {});
        msg.channel.send(`:no_bell:  |  **${member.user.username}** you are dead for ${utils.convertUnixToDate(time).toLowerCase().slice(0, -1)}!`, 8000);
        setTimeout(() => {
            console.log(`[${utils.unixToTime(Date.now())}] Removed expired timer for ${member.user.username} at [${member.guild.name}]`);
			member.removeRole(role).then(() => {}).catch(console.log);
            dbUtils.removeTimer(member.user.id, role.id, function() {});
        }, time);
    }).catch(err => discordUtils.sendAndDelete(msg.channel, ':warning: Bot error! ' + err.response.body.message));
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('ask', 'Fun');
cmd.alias.push('8ball', 'question');
cmd.addHelp('Answers a question');
cmd.minLvl = levels.DEFAULT;
cmd.cd = 20;
cmd.execution = function(client, msg, suffix) {
    if (suffix.length == 0) {
        return msg.channel.send("Ask a question!");
    }
    var question = suffix.join("+");
	console.log(encodeURI(question))
    https.get({
        host: '8ball.delegator.com',
        path: '/magic/JSON/' + encodeURI(question),
    }, function(response) {
        // Continuously update stream with data
        var body = '';
        response.on('data', function(d) {
            body += d;
        });
        response.on('end', function() {

            // Data reception is done, do whatever with it!
			var parsed
			try{
				parsed = JSON.parse(body);
			} catch(e){
				console.log(e);
			}
            if (!parsed) return;
            msg.channel.send(msg.author + ", " + parsed.magic.answer);

        });
    });
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('friends', 'Fun');
cmd.addHelp('Shows people with the same color as you have');
cmd.cd = 30;
cmd.minLvl = levels.DEFAULT;
cmd.execution = function(client, msg, suffix) {
    var role = msg.member.roles.find(r => r.name.startsWith("#"));
    if (role == null) {
        discordUtils.sendAndDelete(msg.channel, "You have no color!");
    } else {
        var names = [];
        for (var member of msg.guild.members.array()) {
            if (member.roles.exists(r => r.name == role.name)) {
                if (member.user.id != msg.author.id) {
                    names.push(member.user.username);
                }
            }
        }
        if (names.length < 1) {
            msg.channel.send(`:frowning:`);
        } else {
            msg.channel.send(`Your friends are: ${names.join(", ")}`);
        }
    }
}
commands.push(cmd);
////////////////////////////////////////////////////////////

module.exports = commands;
