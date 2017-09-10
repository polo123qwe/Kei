var Command = require('../commandTemplate');
var Connection = require('../db/dbConnection');
var levels = require('../../consts/levels.json');
var paramtypes = require('../../consts/paramtypes.json');
var utils = require('../utils/utils');
var discordUtils = require('../utils/discordUtils');
var moderationUtils = require('../utils/moderationUtils');
var dbUtils = require('../db/dbUtils');
var dbGuild = require('../db/dbGuild');
var helpers = require('../helpers');
var logger = require('../utils/logger');
var commands = [];

var cmd;
////////////////////////////////////////////////////////////
cmd = new Command('warn', 'Moderation');
cmd.addHelp('Warns a user');
cmd.addUsage('<mention/id> [time] [reason]');
cmd.minLvl = levels.MODERATOR;
cmd.reqDB = true;
cmd.params.push(paramtypes.MENTIONORID);
cmd.execution = function(client, msg, suffix) {
    /*
     * we add a user to the role and after its added we send a message to the
     * logs channel if its found.
     */

    var time = '--';
    var reason;
    if (utils.isNumber(suffix[1])) {
        time = parseInt(suffix[1], 10);
        reason = suffix.splice(2, suffix.length).join(" ");
    } else {
        reason = suffix.splice(1, suffix.length).join(" ");
    }

    var member = discordUtils.getMembersFromMessage(msg, suffix)[0];

    dbGuild.fetchRoleID("warned", msg.guild.id, warnedRole => {
        if (warnedRole == null || !msg.guild.roles.has(warnedRole)) {
            return discordUtils.sendAndDelete(msg.channel, "There is no warned role!");
        }
        member.addRole(warnedRole).then(r => {
            discordUtils.findLogsChannel(msg.guild, (logChannel) => {
                if (logChannel) {
                    moderationUtils.logMessage("WARN", msg.author, member.user, logChannel, reason);
                }
                dbUtils.insertLog(member.user.id, msg.author.id, "warning", reason, 0, function() {});
            });
        }).catch(err => {
			logger.warn(discordUtils.missingPerms("Add Role", guild, member));
			discordUtils.sendAndDelete(msg.channel, ':warning: Bot error! ' + err.response.body.message)
		});

    });

}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('chill', 'Moderation');
cmd.addHelp('Chills a user for 2 mins');
cmd.addUsage('<mention/id> [reason]');
cmd.minLvl = levels.MODERATOR;
cmd.reqDB = true;
cmd.params.push(paramtypes.MENTIONORID);
cmd.execution = function(client, msg, suffix) {

    var reason = suffix.splice(1, suffix.length).join(" ");

    var member = discordUtils.getMembersFromMessage(msg, suffix)[0];

    dbGuild.fetchRoleID("muted", msg.guild.id, mutedRole => {
        if (mutedRole == null || !msg.guild.roles.has(mutedRole)) {
            return discordUtils.sendAndDelete(msg.channel, "There is no muted role!");
        }

        member.addRole(mutedRole).then(r => {
            discordUtils.findLogsChannel(msg.guild, (logChannel) => {
                if (logChannel) {
                    moderationUtils.logMessage("CHILL", msg.author, member.user, logChannel, reason);
                }
                dbUtils.insertLog(member.user.id, msg.author.id, "chilling", reason, 0, function() {});
                //Notify the user
                member.user.send(`You have been chilled! You are muted for 2 minutes in ${msg.guild.name}`).catch();
            });
            setTimeout(() => {
                member.removeRole(mutedRole).catch((e) => {
					logger.warn(discordUtils.missingPerms("Remove Role", msg.guild, member));
				});
            }, 120000);
        }).catch(err => {
			logger.warn(discordUtils.missingPerms("Add Role", guild, member));
			discordUtils.sendAndDelete(msg.channel, ':warning: Bot error! ' + err.response.body.message)
		});
    });

}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('mute', 'Moderation');
cmd.addHelp('Mutes a user (default 3 days)');
cmd.addUsage('<mention/id> [time(days)] [reason]');
cmd.minLvl = levels.MODERATOR;
cmd.reqDB = true;
cmd.params.push(paramtypes.MENTIONORID);
cmd.execution = function(client, msg, suffix) {

    var time = 3;
    var reason;
    if (utils.isNumber(suffix[1])) {
        time = parseInt(suffix[1], 10);
        reason = suffix.splice(2, suffix.length).join(" ");
    } else {
        reason = suffix.splice(1, suffix.length).join(" ");
    }

    var member = discordUtils.getMembersFromMessage(msg, suffix)[0];
    var role = msg.guild.roles.find((r) => r.name.toLowerCase() == "muted");

    dbGuild.fetchRoleID("muted", msg.guild.id, mutedRole => {
        if (mutedRole == null || !msg.guild.roles.has(mutedRole)) {
            return discordUtils.sendAndDelete(msg.channel, "There is no muted role!");
        }
        member.addRole(mutedRole).then(r => {
            discordUtils.findLogsChannel(msg.guild, (logChannel) => {
                if (logChannel) {
                    moderationUtils.logMessage("MUTE", msg.author, member.user, logChannel, reason);
                }
                dbUtils.insertLog(member.user.id, msg.author.id, "mute", reason, time, function() {});
                dbUtils.insertTimer(Date.now(), time * 24 * 3600 * 1000, member.user.id, role.id, msg.guild.id, function() {});
            });
            setTimeout(() => {
                member.removeRole(mutedRole).then(() => {
                    logger.info(`${member.user.username} unmuted at ${member.guild.name} (${member.guild.id})`);
                }).catch((e) => {
					logger.warn(discordUtils.missingPerms("Remove Role", msg.guild, member));
				});;
                dbUtils.removeTimer(member.user.id, r.id, function() {});
            }, time * 24 * 3600 * 1000);
        }).catch(err => {
			logger.warn(discordUtils.missingPerms("Add Role", msg.guild, member));
			discordUtils.sendAndDelete(msg.channel, ':warning: Bot error! ' + err.response.body.message)
		});
    });
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('prune', 'Moderation');
cmd.addHelp('Prunes a given amount of messages (filters by user if specified)');
cmd.addUsage('<amount> [user]');
cmd.minLvl = levels.ADMIN;
cmd.execution = function(client, msg, suffix) {
    var amount = suffix[0];

    if (!amount || amount <= 2) return discordUtils.sendAndDelete(msg.channel, "Specify an amount!");
    if (amount > 50) {
        amount = 50;
    }

    var member = discordUtils.getMembersFromMessage(msg, suffix)[0];
    var toremove;
    msg.channel.fetchMessages({
        limit: amount,
        before: msg.id
    }).then((msgs) => {
        toremove = msgs.array();
        if (member) {
            toremove = msgs.filter(function(m) {
                return m.author.id == member.user.id;
            });
        }
        if (toremove.length < 1) {
            return;
        } else if (toremove.length == 1) {
            toremove[0].delete().catch((e) => {
				logger.warn(discordUtils.missingPerms("Remove Message", guild, member));
			});
        } else {
            msg.channel.bulkDelete(toremove).catch((e) => {
				logger.warn(discordUtils.missingPerms("Bulk Remove Message", guild, member));
			});
        }
    }).catch(err => {
		discordUtils.sendAndDelete(msg.channel, ':warning: Bot error! ' + err.response.text);
		logger.warn(err);
	});

}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('revokeinvite', 'Moderation');
cmd.addHelp('Revokes the given invite link');
cmd.addUsage('<invite link>');
cmd.minLvl = levels.ADMIN;
cmd.params.push(paramtypes.PARAM);
cmd.execution = function(client, msg, suffix) {
    var inviteCode = suffix[0];

    //if no invite id is sent
    if (!inviteCode) return discordUtils.sendAndDelete(msg.channel, "Invite not found!");
    else {
        msg.guild.fetchInvites().then((invites) => {
            var invite = invites.find("code", inviteCode);

            if (invite) {
                invite.delete().then((inv) => {
                    msg.channel.send("Invite " + inviteCode +
                        " removed successfully");
                }).catch((e) => {
					logger.warn(discordUtils.missingPerms("Revoke Invite", guild, member));
				});
            } else {
                discordUtils.sendAndDelete(msg.channel, "Invite not found!");
            }
        }).catch((e) => {
			logger.error("Cannot Retrieve Invites");
		});;
    }
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('claim', 'Moderation');
cmd.addHelp('Claims a ban');
cmd.addUsage('<message id> [reason]');
cmd.minLvl = levels.MODERATOR;
cmd.params.push(paramtypes.PARAM);
cmd.execution = function(client, msg, suffix) {
    var messageID = suffix[0];
    var reason = suffix.splice(1, suffix.length).join(" ");

    discordUtils.findLogsChannel(msg.guild, function(channel) {
        if (channel) {
            channel.fetchMessage(messageID).then((m) => {
                if (m && m.author.id == client.user.id && m.content.includes(messageID)) {
                    moderationUtils.editEmbed(m, msg.author, reason);
                    msg.delete().catch((e) => {
						logger.warn(discordUtils.missingPerms("Remove Message", guild, member));
					});
                } else {
                    for (var field of m.embeds[0].fields) {
                        if (field.name == "Moderator" && (field.value.includes(msg.author.id) || field.value == messageID)) {
                            moderationUtils.editEmbed(m, msg.author, reason);
                            msg.delete().catch((e) => {
								logger.warn(discordUtils.missingPerms("Remove Message", guild, member));
							});
                            return;
                        }
                    }
                    discordUtils.sendAndDelete(msg.channel, 'Not your message!');

                }
            }).catch(() => {
                discordUtils.sendAndDelete(msg.channel, "Message not found!");
            });
        }
    });
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('softban', 'Moderation');
cmd.alias.push('sban', 'kick');
cmd.addHelp('Bans a user and then it unbans it');
cmd.addUsage('<mention/id> [reason]');
cmd.minLvl = levels.ADMIN;
cmd.params.push(paramtypes.MENTIONORID);
cmd.execution = function(client, msg, suffix) {

    var member = discordUtils.getMembersFromMessage(msg, suffix)[0];
    var reason = suffix.splice(1, suffix.length).join(" ");

    msg.guild.ban(member, 1).then(user => {
        msg.guild.unban(member.user).then(() => {
            discordUtils.findLogsChannel(msg.guild, logChannel => {
                moderationUtils.logMessage("SOFTBAN", msg.author, member.user, logChannel, reason);
            });
        }).catch((e) => {
			logger.warn(discordUtils.missingPerms("Unban", guild, member));
		});
    }).catch((e) => {
		logger.warn(discordUtils.missingPerms("Ban", guild, member));
	});

}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('unlock', 'Moderation');
cmd.addHelp('Removes a user from being locked in new account role');
cmd.addUsage('<mention/id>');
cmd.minLvl = levels.MODERATOR;
cmd.params.push(paramtypes.MENTIONORID);
cmd.execution = function(client, msg, suffix) {

    var member = discordUtils.getMembersFromMessage(msg, suffix)[0];
    var guild = member.guild;
	var role = guild.roles.find("name", "New Account");

	//Load the data for the guild
    dbGuild.fetchGuild(guild.id, function(err, guildData) {

		//Load the accounts
        dbGuild.fetchNewAccounts(guild.id).then((arr) => {
            for (var userData of arr) {
				//We check if the user is included in the database and we remove it
                if (userData.user_id == member.user.id && userData.guild_id == guild.id) {
                    dbGuild.deleteNewAccount(guild.id, member.user.id).then(() => {
						//Send message to notify that the user joined the guild
						if(role){
							member.removeRole(role);
						}
						helpers.welcomeUser(guild, guildData, member);
                    }).catch((e) => {
						logger.error(e);
					});
                    return;
                }
            }
            discordUtils.sendAndDelete(msg.channel, "User not found in the database!");
        });
    });

}
commands.push(cmd);
////////////////////////////////////////////////////////////

module.exports = commands;
