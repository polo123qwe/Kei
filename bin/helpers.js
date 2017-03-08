var discordUtils = require('./utils/discordUtils.js');
var utils = require('./utils/utils');
var dbUtils = require('./db/dbUtils.js');
var dbGuild = require('./db/dbGuild');

const Connection = require('./db/dbConnection');

/**
 * This function processes the suggestions channel, adding reactions for users to vote on.
 * @arg {Message} msg - Message interface
 */
exports.processSuggestionChannel = function (msg) {
	discordUtils.findSuggestionsChannel(msg.channel.guild, channel => {
		if(channel && channel.id == msg.channel.id){
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
exports.loadTimers = function (client) {
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
					if(guild == null) return;
                    var member = guild.members.get(timer.user_id);
					if (!member) {
						console.log("No user found with id " + timer.user_id);
						dbUtils.removeTimer(timer.user_id, timer.role_id, function() {});
						return;
					}
					console.log(`[${utils.unixToTime(Date.now())}] Loaded timer for ${member.user.username} at [${member.guild.name}] ${utils.unixToTime(timer.timestamp)} was muted for ${utils.convertUnixToDate(timer.time)} (${utils.convertUnixToDate(timer.time - span)})`);
                    setTimeout(function() {
                        member.removeRole(timer.role_id).then(() => {
                            console.log(`${member.user.username} unmuted at [${member.guild.name}]`);
                        });
                        dbUtils.removeTimer(timer.user_id, timer.role_id, function() {});
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
		if(!guild) return;
        var member = guild.members.get(timer.user_id);
        if (member) {
			console.log(`[${utils.unixToTime(Date.now())}] Removed expired timer for ${member.user.username} at [${member.guild.name}]`);
			if(!timer.role_id) return;
            member.removeRole(timer.role_id).then(() => {
                console.log(`${member.user.username} unmuted at [${member.guild.name}]`);
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

/**
 * This function checks incoming messages for invite links, and deletes them if it's necessary.
 * @arg {Message} msg - Message interface
 */
exports.checkInvLink = function (msg) {
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

/**
 * This function processes the goodbye, replacing placeholders for their real equivalents
 * @arg {String} goodbye - Text corresponding to the goodbye message
 */
exports.processGoodbye = function (goodbye, member) {
    console.log(goodbye);
    var outStr = goodbye;
    var settings = outStr.match(/(^|\s)\$\S*($|\s)/g);
    for (var setting of settings) {
        if (setting.includes("user")) {
            outStr = outStr.replace("$user", member.user.username + "#" + member.user.discriminator);
        }
    }
    return outStr;
}

/**
 * This function processes the goodbye, replacing placeholders for their real equivalents
 * @arg {String} greeting - Text corresponding to the greeting message
 */
exports.processGreeting = function (greeting, member) {
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
