var discordUtils = require('./utils/discordUtils.js');
var utils = require('./utils/utils');
var dbUtils = require('./db/dbUtils.js');
var dbGuild = require('./db/dbGuild');

const Connection = require('./db/dbConnection');

var NEWUSERTHRESHOLD;
/**
 * This function processes the suggestions channel, adding reactions for users to vote on.
 * @arg {Message} msg - Message interface
 */
exports.processSuggestionChannel = function(msg) {
    discordUtils.findSuggestionsChannel(msg.channel.guild, channel => {
        if (channel && channel.id == msg.channel.id) {
            msg.react("👍").then(() => {
                msg.react("👎").then(() => {
                    msg.react("🔨");
                });
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
    if (!db) return console.log("Not connected to DB!");
    var collection = db.collection('timers');

    var expiredTimers = [];

    //Fetch all the timers
    collection.find(function(err, cur) {
        if (err) return console.log(err);

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
                    var role = member.guild.roles.get(timer.role_id);
                    if (!member || !role) {
                        console.log("No user found with id " + timer.user_id);
                        dbUtils.removeTimer(timer.user_id, timer.role_id, function() {});
                        return;
                    }
                    console.log(`[${utils.unixToTime(Date.now())}] Loaded timer for ${member.user.username} at [${member.guild.name}] ${utils.unixToTime(timer.timestamp)} was muted for ${utils.convertUnixToDate(timer.time)} (${utils.convertUnixToDate(timer.time - span)})`);
                    setTimeout(() => {
                        member.removeRole(role.id).then(() => {
                            console.log(`[${utils.unixToTime(Date.now())}] Removed expired timer for ${member.user.username} at [${member.guild.name}]`);
                        }).catch(console.log);
                        dbUtils.removeTimer(timer.user_id, role.id, function() {});
                    }, timer.time - span);
                }
            }

            removeTimers();

        }).catch(console.log);
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
                console.log(`[${utils.unixToTime(Date.now())}] Removed expired timer for ${member.user.username} at [${member.guild.name}]`);
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
        }).catch(console.log);
    }

    //Check every day
    setInterval(() => {
        for (var guild of client.guilds.array()) {
            dbGuild.fetchNewAccounts(guild.id).then((arr) => {
                if (arr) {
                    checkMembers(guild.id, arr);
                }
            }).catch(console.log);
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
    var userData = arr.pop();
    var member = guild.members.get(userData.user_id);
    if (member == null) {
        return dbGuild.deleteNewAccount(guild.id, userData.user_id).catch(console.log);
    }
    if (member.roles.exists("name", "New Account")) {
        if (member.user.createdTimestamp > Date.now() - NEWUSERTHRESHOLD) {
            //Account is new
            checkMembers(guild, arr);
        } else {
            //Account is not "new"
            dbUtils.fetchUserActivity(guild.id, member.user.id, 7, (err, res) => {
                if (err) {
                    console.log(err);
                } else if (res.length == 0) {
                    member.kick().catch(console.log);
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
        if (err) return console.log(err);

        //If the guild has the invites allowed (default) we dont delete it
        if (guildData != null && guildData.hasOwnProperty('invites') && !guildData.invites) {
            //Check users who are whitelisted to see if the user is allowed to post an invite
            if (guildData.hasOwnProperty('whitelisted') && !guildData.whitelisted.includes(msg.author.id)) {
                //Delete the message if it has an invite
                if (/discord\.gg.*\//i.test(msg.content)) {
                    console.log(`Invite ${msg.content} deleted!`);
                    msg.delete().then(() => {
                        discordUtils.sendAndDelete(msg.channel, 'Discord invites are not allowed in this server! Ask a moderator for more information');
                    });
                }
            }
        }
    });
}

//Function that handles the goodbye message of users
exports.goodbyeUser = function(guild, guildData, member) {
    if (guildData != null && guildData.hasOwnProperty('goodbye') && guildData.goodbye == null) {
        return;
    }

    if (guildData != null && guildData.hasOwnProperty('goodbye') && guildData.goodbye != null) {
        guild.defaultChannel.sendMessage(processGoodbye(guildData.goodbye, member));
    } else {
        var embed = new Discord.RichEmbed();
        var chance = Math.floor((Math.random() * 10) + 1);

        if (chance % 2) {
            embed.setAuthor(`${member.user.username}#${member.user.discriminator} has left the server!`, member.user.avatarURL);
        } else {
            embed.setAuthor(`${member.user.username}#${member.user.discriminator} is now gone.`, member.user.avatarURL);
        }

        embed.setColor("#f44441");

        guild.defaultChannel.sendEmbed(embed).catch();
    }

	logWelcomeOrLeft(guild, member, false);
}

/**
 * This function processes the goodbye, replacing placeholders for their real equivalents
 * @arg {String} goodbye - Text corresponding to the goodbye message
 */
function processGoodbye(goodbye, member) {
    var outStr = goodbye;
    var settings = outStr.match(/(^|\s)\$\S*($|\s)/g);
    for (var setting of settings) {
        if (setting.includes("user")) {
            outStr = outStr.replace("$user", member.user.username + "#" + member.user.discriminator);
        }
    }
    return outStr;
}

//Function that handles the welcoming of new users
exports.welcomeUser = function(guild, guildData, member) {
    if (guildData != null && guildData.hasOwnProperty('greeting') && guildData.greeting == null) {
        return;
    }

    if (guildData != null && guildData.hasOwnProperty('greeting') && guildData.greeting != null) {
        //If you type default or an empty string it will use the default message
        if (guildData.greeting.length == 0 || !guildData.greeting.includes("default")) {
            guild.defaultChannel.sendMessage(processGreeting(guildData.greeting, member)).catch();
			logWelcomeOrLeft(guild, member, true);
			return;
        }
    }
	if (guild.id == "132490115137142784") {
        guild.defaultChannel.sendMessage(`Wleocme to ${guild.name}, ${member.user}! Remember to read the rules! <#137105484040634368>`).catch();
    } else {
        guild.defaultChannel.sendMessage(`Welcome to ${guild.name}, ${member.user}! Don't forget to read the rules!`).catch();
    }

	logWelcomeOrLeft(guild, member, true);
}
/**
 * This function processes the goodbye, replacing placeholders for their real equivalents
 * @arg {String} greeting - Text corresponding to the greeting message
 */
function processGreeting(greeting, member) {
    var outStr = greeting;
    var settings = outStr.match(/(^|\s)\$\S*($|\s)/g);
    for (var setting of settings) {
        if (setting.includes("user")) {
            outStr = outStr.replace("$user", member.user);
        } else if (setting.includes("guild")) {
            outStr = outStr.replace("$guild", member.guild.name);
        }
    }
    return outStr;
}

//isJoin determines if the user isWelcome or left
function logWelcomeOrLeft(guild, member, isWelcome) {
	var message = "left";
	if(isWelcome){
		message = "joined";
	}
    var logChannel = discordUtils.findActivityChannel(guild);
    if (logChannel) {
		logChannel.sendMessage(`User ${member.user.username}#${member.user.discriminator} ${message} the server.`).catch();
    }
    return;
}
