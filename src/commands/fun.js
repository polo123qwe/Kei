const Discord = require('discord.js');
var Command = require('../commandTemplate');
var Connection = require('../db/dbConnection');
var levels = require('../../consts/levels.json');
var paramtypes = require('../../consts/paramtypes.json');
var utils = require('../utils/utils');
var dbUtils = require('../db/dbUtils');
var dbUsers = require('../db/dbUsers');
var dbGuild = require('../db/dbGuild');
var discordUtils = require('../utils/discordUtils');
var logger = require('../utils/logger');
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
        msg.channel.send(`:no_bell:  |  **${member.user.username}** you are dead for ${utils.convertUnixToDate(time).toLowerCase().slice(0, -1)}!`, 8000).catch((e) => {
			logger.warn(discordUtils.missingPerms("Send Message", guild));
		});
        setTimeout(() => {
            logger.info(`Removed expired timer for ${member.user.username} at [${member.guild.name}]`);
			member.removeRole(role).then(() => {}).catch((e) => {
				logger.warn(discordUtils.missingPerms("Remove Role", msg.guild, member));
			});
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
			var parsed;
			try{
				parsed = JSON.parse(body);
			} catch(e){
				logger.error(e);
			}
            if (!parsed) return;
            msg.channel.send(msg.author + ", " + parsed.magic.answer).catch((e) => {
				logger.warn(discordUtils.missingPerms("Send Message", guild));
			});

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
            msg.channel.send(`:frowning:`).catch((e) => {
				logger.warn(discordUtils.missingPerms("Send Message", guild));
			});
        } else {
            msg.channel.send(`Your friends are: ${names.join(", ")}`).catch((e) => {
				logger.warn(discordUtils.missingPerms("Send Message", guild));
			});
        }
    }
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('hug', 'Fun');
cmd.alias.push('hugs');
cmd.addHelp('Hugs the mentioned user');
cmd.addUsage('[username/nick/id]');
cmd.cd = 30;
cmd.minLvl = levels.DEFAULT;
cmd.params.push(paramtypes.PARAM);
cmd.execution = function(client, msg, suffix) {
    var member = discordUtils.getOneMemberFromMessage(msg, suffix);
	if(!member) return discordUtils.sendAndDelete(msg.channel, "You need to hug someone!");
	var hugText = `${msg.author.username} hugs ${member.user.username}`;
	if(msg.author.id == member.user.id){
		hugText = `${msg.author.username} hugs themselves`;
	}
	getRandomHug(json => {
		if(json && json.hasOwnProperty("path")){
		    var embed = new Discord.RichEmbed();
			embed.setTitle(hugText);
			embed.setImage(`https://rra.ram.moe${json.path}`);
			embed.setColor('RANDOM');
			msg.channel.send({embed: embed}).catch(e => {
				logger.warn(discordUtils.missingPerms("Send Message", msg.guild, member));
			});
		}
	});
}
commands.push(cmd);

function getRandomHug(callback){
	https.get({
        host: 'rra.ram.moe',
		path: '/i/r?type=hug&nsfw=false',
    }, function(response) {
        // Continuously update stream with data
        var body = '';
        response.on('data', function(d) {
            body += d;
        });
        response.on('end', function() {

            // Data reception is done, do whatever with it!
			var parsed;
			try{
				parsed = JSON.parse(body);
			} catch(e){
				logger.error(e);
			}
            if (!parsed) return callback(null);
			callback(parsed);
        });
    });
}
////////////////////////////////////////////////////////////

module.exports = commands;
