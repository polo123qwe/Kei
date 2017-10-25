const Discord = require('discord.js');
var discordUtils = require('./utils/discordUtils.js');
var utils = require('./utils/utils');
var dbUtils = require('./db/dbUtils');
var dbGuild = require('./db/dbGuild');
var dbUsers = require('./db/dbUsers');
var logger = require('./utils/logger');
var schedule = require('node-schedule');

const Connection = require('./db/dbConnection');

var NEWUSERTHRESHOLD;
var bdayLoop;
/**
 * This function processes the suggestions channel, adding reactions for users to vote on.
 * @arg {Message} msg - Message interface
 */
exports.processSuggestionChannel = function(msg) {
    discordUtils.findSuggestionsChannel(msg.channel.guild, channel => {
        if (channel && channel.id == msg.channel.id) {
            msg.react(":PillowYes:230126424290230272").then(() => {
                msg.react(":PillowNo:230126607510142976").then(() => {
                    msg.react("🔨").catch((e) => {
                        logger.warn("React Error" + e.message);
                    });
                }).catch((e) => {
                    logger.warn("React Error" + e.message);
                });
            }).catch((e) => {
                logger.warn("React Error" + e.message);
            });
        }
    });
}

/*
 * This function loads the timers from the database and then checks if they have
 * expired, if they have the role is removed from the user, if now, we create a
 * timeout with the time remaining
 */
exports.loadTimers = function(client) {
    var db = Connection.getDB();
    if (!db) return logger.error("Not connected to DB!");
    var collection = db.collection('timers');

    var expiredTimers = [];

    //Fetch all the timers
    collection.find(function(err, cur) {
        if (err) return logger.error(err);

        cur.toArray().then((arr) => {

            for (var timer of arr) {
                var span = Date.now() - timer.timestamp;

                if (span > timer.time) {
                    //Remove timers that are expired
                    expiredTimers.push(timer);
                } else {
                    //Add others to a timeout
                    var guild = client.guilds.get(timer.guild_id);
                    if (guild == null) return;
                    var member = guild.members.get(timer.user_id);
                    var role;
                    if (member) {
                        role = member.guild.roles.get(timer.role_id);
                    }
                    if (!member || !role) {
                        logger.info("No user found with id " + timer.user_id);
                        dbUtils.removeTimer(timer.user_id, timer.role_id, function() {});
                        return;
                    }
                    logger.info(`Loaded timer for ${member.user.username} at [${member.guild.name}] ${utils.unixToTime(timer.timestamp)} was muted for ${utils.convertUnixToDate(timer.time)} (${utils.convertUnixToDate(timer.time - span)})`);
                    setTimeout(() => {
                        member.removeRole(role.id).then(() => {
                            logger.info(`Removed expired timer for ${member.user.username} at [${member.guild.name}]`);
                        }).catch((e) => {
                            logger.warn("Remove Role" + e.message);
                        });
                        dbUtils.removeTimer(timer.user_id, role.id, function() {});
                    }, timer.time - span);
                }
            }

            removeTimers();

        }).catch((e) => {
            logger.error("Cursor error: " + e.message);
        });
    });

    //helper function to remove expired timers
    function removeTimers() {
        if (expiredTimers.length <= 0) return;
        var timer = expiredTimers.pop();
        var guild = client.guilds.get(timer.guild_id);
        if (!guild) return;
        var member = guild.members.get(timer.user_id);
        if (member) {
            if (!timer.role_id) return;
            member.removeRole(timer.role_id).then(() => {
                logger.info(`Removed expired timer for ${member.user.username} at [${member.guild.name}]`);
                dbUtils.removeTimer(timer.user_id, timer.role_id, function() {
                    removeTimers();
                });
            });
        } else {
            dbUtils.removeTimer(timer.user_id, timer.role_id, function() {
                removeTimers();
            });
        }
    }
}

exports.loadNewMembers = function(client, constTreshold) {
    NEWUSERTHRESHOLD = constTreshold;
    for (var guild of client.guilds.array()) {
        dbGuild.fetchNewAccounts(guild.id).then((arr) => {
            if (arr) {
                checkMembers(guild, arr);
            }
        }).catch((e) => {
            logger.error("Fetching error " + e.message);
        });
    }

    //Check every day
    setInterval(() => {
        for (var guild of client.guilds.array()) {
            dbGuild.fetchNewAccounts(guild.id).then((arr) => {
                if (arr) {
                    checkMembers(guild.id, arr);
                }
            }).catch((e) => {
                logger.error("Fetching error " + e.message);
            });
        }
    }, 24 * 3600000);
}

/*
 * This function checks every member and if they have the role "New Account" and
 * if they do, count the messages send and the Date, if the user didnt send a
 * message in the threshold set, it will be silently kicked
 */
function checkMembers(guild, arr) {
    if (arr.length == 0) return;
    if (!guild) return;

    var userData = arr.pop();
    if (!guild.members) return;

    var member = guild.members.get(userData.user_id);
    if (member == null) {
        return dbGuild.deleteNewAccount(guild.id, userData.user_id).catch((e) => {
            logger.error("Delete New Account error: " + e.message);
        });
    }
    if (member.roles.exists("name", "New Account")) {
        if (member.user.createdTimestamp > Date.now() - NEWUSERTHRESHOLD) {
            //Account is new
            checkMembers(guild, arr);
        } else {
            //Account is not "new"
            dbUtils.fetchUserActivity(guild.id, member.user.id, 7, (err, res) => {
                if (err) {
                    logger.error(err);
                } else if (res.length == 0) {
                    member.kick().catch((e) => {
                        logger.warn(discordUtils.missingPerms("Kick", guild, member));
                    });
                }
                checkMembers(guild, arr);
            });
        }
    }
}
/**
 * This function checks incoming messages for invite links, and deletes them if it's necessary.
 * @arg {Message} msg - Message interface
 */
exports.checkInvLink = function(msg) {
    //Retrieve from the db
    dbGuild.fetchGuild(msg.guild.id, function(err, guildData) {
        if (err) return logger.error(err);

        //If the guild has the invites allowed (default) we dont delete it
        if (guildData != null && guildData.hasOwnProperty('invites') && !guildData.invites) {
            //Check users who are whitelisted to see if the user is allowed to post an invite
            if (guildData.hasOwnProperty('whitelisted') && !guildData.whitelisted.includes(msg.author.id)) {
                //Delete the message if it has an invite
                if (/discord\.gg.*\//i.test(msg.content)) {
                    logger.info(`Invite ${msg.content} deleted in ${msg.guild.name} (${msg.guild.id})`);
                    msg.delete().then(() => {
                        discordUtils.sendAndDelete(msg.channel, 'Discord invites are not allowed in this server! Ask a moderator for more information');
                    }).catch((e) => {
                        logger.warn(discordUtils.missingPerms("Delete Message", msg.guild));
                    });
                }
            }
        }
    });
}

/**
 * Sends a message to the logchannel when a user joins or leaves. isJoin determines if the user isWelcome or left
 * @arg {guild} Discord.guild
 * @arg {member} Discord.member
 * @arg {isWelcom} boolean
 */
exports.logWelcomeOrLeft = function(guild, member, isWelcome) {
    var message = "left";
    if (isWelcome) {
        message = "joined";
    }
    var logChannel = discordUtils.findActivityChannel(guild);
    if (logChannel) {
        logChannel.send(`User ${member.user.username}#${member.user.discriminator} ${message} the server.`).catch((e) => {
            logger.warn(discordUtils.missingPerms("Send Message", guild));
        });
    }
    return;
}

/*
 *
 */
exports.startBirthdayLoop = function(client) {

	if(bdayLoop){
		bdayLoop.cancel();
		return;
	}

	bdayLoop = schedule.scheduleJob('* 1 0 * *', () =>{
		//Retrieve all users
	    dbUsers.fetchUsers((err, usersData) => {
	        if (err) logger.warn(err);

	        //Check if any user has today as bday
			var usersWithBday = [];
	        var today = new Date();
	        var current = [today.getDate(), today.getMonth() + 1, today.getFullYear()];
	        for (var userData of usersData) {
	            if (userData && userData.hasOwnProperty("bday")) {
	                if (userData.bday[0] == current[0] && userData.bday[1] == current[1]) {
	                    //Today is bday
						usersWithBday.push(userData);
	                }
	            }
	        }

			//Check for the guilds when to post the bday
	        for (var guild of client.guilds.array()) {
	            dbGuild.fetchGuild(guild.id, (err, guildData) => {
					if(err) logger.error(err);
	                if (guildData != null && guildData.hasOwnProperty('bdays') && guildData.bdays) {
						var channel = discordUtils.findActivityChannel(guild);
						for(var userData of usersWithBday){
							var member = guild.member(userData._id);
							//The user is in the guild
							if(member){
								if(channel){
									channel.send(`Happy birthday ${member.user.username}#${member.user.discriminator}!`);
								}
							}
						}
	                }
	            });
	        }
	    });
	});

}
