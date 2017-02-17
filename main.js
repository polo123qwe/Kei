const Discord = require('discord.js');

var Command = require('./bin/commandTemplate');
var commands = require('./bin/commands');

const client = new Discord.Client({
    fetch_all_members: true,
    disable_everyone: true
});
const token = require('./config.json').token;
const suf = require('./config.json').suffix;
const logging = require('./config.json').logging;
//const ai = require('./bin/ai');
var utils = require('./bin/utils/utils');
var dbUtils = require('./bin/db/dbUtils');
var dbUsers = require('./bin/db/dbUsers');
var discordUtils = require('./bin/utils/discordUtils');
var moderationUtils = require('./bin/utils/moderationUtils');

//Automatic membership processing
var checkMembershipStatus = require('./bin/memberProcessor.js');
var memberRemoval = require('./bin/memberRemoval.js');

//Database module
const Connection = require('./bin/db/dbConnection');
var time = Date.now();

client.on('ready', () => {
    var interval = Date.now() - time;
    console.log('Bot connected (' + interval + 'ms)');
    //Load all the timers
    loadTimers();
    memberRemoval(client);
});

// create an event listener for messages
client.on('message', msg => {

    var splitted = msg.content.split(" ");

    //Log the message in the DB
    if (logging) {
        dbUtils.storeMessage(msg);
    }
    if (msg.guild != null) {
        checkMembershipStatus(client, msg.member);
    }

    //Ignore bot own commands
    if (msg.author.id == client.user.id) {
        return;
    }

    if (msg.guild != null) {
        checkInvLink(msg);
		processSuggestionChannel(msg);
    }

    //Remove suffix
    var cmdName = splitted[0];
    var suffix = msg.content.substr(cmdName.length + 1);
    if (suffix != "") {
        suffix = suffix.split(" ");
    }

    //We check is its a command
    if (cmdName.endsWith(suf)) {

        cmdName = cmdName.substring(0, splitted[0].length - 1);
        cmdName = cmdName.toLowerCase();
        if (commands.hasOwnProperty(cmdName)) {
            var location = msg.guild ? msg.guild.name : "DM";

            if (suffix) {
                console.log(`[${utils.unixToTime(Date.now())}][${location}][${msg.author.username}] >${cmdName}. Parameters: ${suffix.join(" ")}`);
            } else {
                console.log(`[${utils.unixToTime(Date.now())}][${location}][${msg.author.username}] >${cmdName}`);
            }
            commands[cmdName].run(client, msg, suffix);

        }
    } else if (msg.mentions.users.has(client.user.id)) {
        //We check if the bot was pinged
        //console.log("Bot was pinged!");
        //ai(client, msg);
    }
});

function processSuggestionChannel(msg){

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
///////////////// Join and leave member ///////////////////////////
client.on('guildMemberAdd', (member) => {

    if (logging) {
        dbUsers.updateUserJoined(member.guild.id, member.user.id, Date.now(), () => {

        });
    }

    dbUtils.fetchGuild(member.guild.id, function(err, guildData) {
        if (err) console.log(err);

        if (guildData != null && guildData.hasOwnProperty('greeting') && guildData.greeting == null) {
            return;
        }

        if (guildData != null && guildData.hasOwnProperty('greeting') && guildData.greeting != null) {
            //If you type default or an empty string it will use the default message
            if (guildData.greeting.length == 0 || !guildData.greeting.includes("default")) {
                member.guild.defaultChannel.sendMessage(processGreeting(guildData.greeting)).catch();
                return;
            }
        }

        member.guild.defaultChannel.sendMessage(`Wleocme to ${member.guild.name}, ${member.user}! Dont forget to read the rules!`).catch();

    });

    //This helper function replaces the $user and $guild elements with the corresponding values
    function processGreeting(greeting) {
        var outStr = greeting;
        var settings = outStr.match(/(^|\s)\$\S*($|\s)/g);
        for (var setting of settings) {
            if (setting.includes("user")) {
                outStr = outStr.replace("$user", member.user);
            } else if (setting.includes("guild")) {
                outStr = outStr.replace("$guild", member.guild.name);
            }
        }
        return outStr
    }
});

client.on('guildMemberRemove', (member) => {

    if (logging) {
        dbUsers.updateUserLeft(member.guild.id, member.user.id, Date.now(), () => {

        });
    }

    dbUtils.fetchGuild(member.guild.id, function(err, guildData) {
        if (err) console.log(err);

        if (guildData != null && guildData.hasOwnProperty('goodbye') && guildData.goodbye == null) {
            return;
        }

        if (guildData != null && guildData.hasOwnProperty('goodbye') && guildData.goodbye != null) {
            member.guild.defaultChannel.sendMessage(processGreeting(guildData.goodbye));
        } else {
            var embed = new Discord.RichEmbed();
            var chance = Math.floor((Math.random() * 10) + 1);

            if (chance % 2) {
                embed.setAuthor(`${member.user.username}#${member.user.discriminator} has left the server!`, member.user.avatarURL);
            } else {
                embed.setAuthor(`${member.user.username}#${member.user.discriminator} is now gone.`, member.user.avatarURL);
            }

            
            embed.setColor("#f44441");

            member.guild.defaultChannel.sendEmbed(embed);

            //member.guild.defaultChannel.sendMessage(`**${member.user.username}#${member.user.discriminator}** is now gone.`);
        }

    });

    //This helper function replaces the $user element with the corresponding value
    function processGreeting(goodbye) {
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
});

///////////////// Namechanges handling ////////////////////////////
client.on('userUpdate', (oldUser, newUser) => {
    if (logging && oldUser.username != newUser.username && newUser.username != null) {
        //dbUtils.storeNameChange(oldUser.id, oldUser.username, newUser.username, false);
        dbUsers.updateUsername(newUser.id, newUser.username, () => {

        });
    }
});

client.on('guildMemberUpdate', (oldMember, newMember) => {
    if (logging && oldMember.nickname != newMember.nickname) {
        //dbUtils.storeNameChange(newMember.user.id, oldMember.nickname, newMember.nickname, true, oldMember.guild.id);
        dbUsers.updateNickname(newMember.guild.id, newMember.user.id, newMember.nickname, () => {

        });
    }
});
///////////////////////////////////////////////////////////////////
////////////////////// Message edits //////////////////////////////
client.on('messageDelete', (message) => {
    if (logging) {
        dbUtils.tagMessageAs(message.id, false);
    }
});

client.on('messageUpdate', (oldMessage, newMessage) => {
    if (logging) {
        dbUtils.tagMessageAs(oldMessage.id, true, newMessage.content);
        if (newMessage.guild != null) {
            checkInvLink(newMessage);
        }
    }
});
///////////////////////////////////////////////////////////////////
client.on('guildBanAdd', (guild, user) => {
    //Timeout to dectect the softban message
    setTimeout(() => {
        discordUtils.findLogsChannel(guild, (logChannel) => {
            if (logChannel) {
                var foundSoftBan = false;
                logChannel.fetchMessages({
                        limit: 10
                    })
                    .then(messages => {
                        var messageFound = messages.find(m => {
                            var embed = m.embeds[0];
                            if (embed) {
                                for (var field of embed.fields) {
                                    if (field.name == "User" && field.value.includes(user.id)) {
                                        return true;
                                    }
                                }
                            }
                            return false;
                        });
                        if (messageFound == null) {
                            moderationUtils.logPlaceholder(user, logChannel);
                        }
                    });
            }
        });
    }, 2000);
});

/*
 * This function loads the timers from the database and then checks if they have
 * expired, if they have the role is removed from the user, if now, we create a
 * timeout with the time remaining
 */
function loadTimers() {

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
                    var member = guild.members.get(timer.user_id);
                    setTimeout(function() {
                        member.removeRole(timer.role_id).then(() => {
                            console.log(member.user.username + " unmuted.")
                        });
                        dbUtils.removeTimer(timer.user_id, timer.role_id, function() {});
                    }, timer.time - span);
                }
            }

            removeTimers();

        }).catch(console.log);
    });

    //helper function to make reading easier
    function removeTimers() {
        if (expiredTimers.length <= 0) return;
        var timer = expiredTimers.pop();
        console.log(timer);
        var guild = client.guilds.get(timer.guild_id);
        var member = guild.members.get(timer.user_id);
        if (member) {
            member.removeRole(timer.role_id).then(() => {
                console.log(member.user.username + " unmuted.")
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

function checkInvLink(msg) {
    //Retrieve from the db
    dbUtils.fetchGuild(msg.guild.id, function(err, guildData) {
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
                    })
                }
            }
        }
    });
}

//Starts the bot
function startBot() {
    //Try to connect to DB and to log the client
    Connection((err, db) => {
        if (err) console.log(err.message);
        client.manager.setupKeepAlive(300000);
        client.login(token);
    });
}

startBot();
