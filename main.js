const Discord = require('discord.js');

var Command = require('./bin/commandTemplate');
var commands = require('./bin/commands');
var utils = require('./bin/utils/utils');
var dbUtils = require('./bin/db/dbUtils');
var dbUsers = require('./bin/db/dbUsers');
var dbGuild = require('./bin/db/dbGuild');
var discordUtils = require('./bin/utils/discordUtils');
var moderationUtils = require('./bin/utils/moderationUtils');
var helpers = require('./bin/helpers.js');

const client = new Discord.Client({
    fetchAllMembers: true,
    disableEveryone: true
});
const token = require('./config.json').token;
const suf = require('./config.json').suffix;
const persist = require('./config.json').logging;
var logger = require('./bin/utils/logger');

//Automatic membership processing
var checkMembershipStatus = require('./bin/memberProcessor.js');
var NEWUSERTHRESHOLD = (7 * 24 * 3600 * 1000);

//Database module
const Connection = require('./bin/db/dbConnection');
var time = Date.now();

/* On ready event */
client.on('ready', () => {
    var interval = Date.now() - time;
    logger.info(`Bot connected (${interval} ms)`);
    //Load all the timers
    helpers.loadTimers(client);
    helpers.loadNewMembers(client, NEWUSERTHRESHOLD);
});

client.on('disconnect', () => {
    logger.info(`[${utils.unixToTime(Date.now())}] Bot disconnected!`);
})

/* Message event listener */
client.on('message', msg => {
    var splitted = msg.content.split(" ");

    //Log the message in the DB
    if (persist) {
        dbUtils.storeMessage(msg);
    }
    if (msg.guild != null) {
        checkMembershipStatus(client, msg.member);
    }

    //Prevent the bot from triggering its own commands
    if (msg.author.id == client.user.id) {
        return;
    }

    if (msg.guild != null) {
        helpers.checkInvLink(msg);

        helpers.processSuggestionChannel(msg);
    }

    //Remove suffix
    var cmdName = splitted[0];
    var suffix = msg.content.substr(cmdName.length + 1);
    if (suffix != "") {
        suffix = suffix.split(" ");
    }

    //Check if it's a command
    if (cmdName.endsWith(suf)) {

        cmdName = cmdName.substring(0, splitted[0].length - 1);
        cmdName = cmdName.toLowerCase();
        if (commands.hasOwnProperty(cmdName)) {
            var location = msg.guild ? msg.guild.name : "DM";

            if (suffix) {
                logger.info(`[${utils.unixToTime(Date.now())}][${location}][${msg.author.username}] >${cmdName}. Parameters: ${suffix.join(" ")}`);
            } else {
                logger.info(`[${utils.unixToTime(Date.now())}][${location}][${msg.author.username}] >${cmdName}`);
            }
            commands[cmdName].run(client, msg, suffix);
        }
    } else if (msg.mentions.users.has(client.user.id)) {
        /* TODO: Bot AI with Cleverbot? */
    }
});

/* Member join and leave processing */
client.on('guildMemberAdd', (member) => {

    //Console persist
    logger.info(`[${utils.unixToTime(Date.now())}] ${member.user.username}#${member.user.discriminator} (${member.id}) joined ${member.guild.name}`);

    var guild = member.guild;
    if (persist) {
        dbUsers.updateUserJoined(guild.id, member.user.id, Date.now(), () => {});
    }
    dbGuild.fetchRoleID("warned", guild.id, warnedRole => {
        dbGuild.fetchRoleID("muted", guild.id, mutedRole => {
            retrieveMembers(warnedRole, mutedRole);
        });
    });

    dbGuild.fetchGuild(guild.id, function(err, guildData) {
        if (err) logger.error(err);

        //Handling of newly created accounts
        if (guildData != null && guildData.hasOwnProperty('isolatenewaccounts') && guildData.isolatenewaccounts) {
            if (member.user.createdTimestamp > Date.now() - NEWUSERTHRESHOLD) {
                //Check if the account is new, if it is we check that the user is not already in the database and add it
                dbGuild.fetchNewAccounts(member.guild.id).then((arr) => {
                    for (var userData of arr) {
                        if (userData.user_id == member.user.id && userData.guild_id == member.guild.id) {
                            return;
                        }
                    }
                    dbGuild.storeNewAccount(guild.id, member.user.id).then(() => {
                        var role = guild.roles.find("name", "New Account");
                        if (role) {
                            logger.info(`[${utils.unixToTime(Date.now())}] and added to newly created accounts`);
                            member.send(`You have been locked in ${member.guild.name} due to the account being new, to be unlocked contact one of the moderators/adminstrators`).catch();
                            //TODO Change this
                            if (guild.id == "132490115137142784") {
                                var channel = guild.channels.get("184984832219152387");
                                if (channel) channel.send(`User ${member} joined the server and was added to New Accounts.`).catch();
                            }
                            setTimeout(() => {
                                member.addRole(role).catch((e) => {
									logger.warn(discordUtils.missingPerms("Add Role", guild, member));
								});
                            }, 1000);
                        }
                    }).catch((e) => {
						logger.error(error);
					});
                });
            } else {
                //If the user is not a newly created account
                helpers.logWelcomeOrLeft(guild, member, true);
            }
        } else {
            //If the guild has not set up the limit of new users, just process the welcome
            helpers.logWelcomeOrLeft(guild, member, true);
        }
    });

    function retrieveMembers(warnedRole, mutedRole) {
        dbUsers.fetchMember(guild.id, member.user.id, (err, memberData) => {
            if (err) logger.error(err);
            else {
                if (memberData && memberData.last_left) {
                    if (memberData.roles && memberData.roles.length > 0) {
                        member.addRoles(memberData.roles).then((memb) => {
                            if ((warnedRole && (memberData.roles.indexOf(warnedRole) > -1)) || (mutedRole && (memberData.roles.indexOf(mutedRole) > -1))) {
                                member.user.send(`It looks like you have tried to circumvent a warning/mute in ${guild.name}. If you continue to do so, a ban will be issued.`);
                            }
                        }).catch((er) => {
							logger.error(er);
                        });
                    }
                }
            }
        });
    }
});

client.on('guildMemberRemove', (member) => {

    //Console persist
	logger.info(`${member.user.username}#${member.user.discriminator} (${member.user.id}) left ${member.guild.name}`);

    var guild = member.guild;

    if (persist) {
        var roleInstances = member.roles.array();
        var userRoles = [];


        roleInstances.forEach(function(element) {
            if (element.name != "@everyone" && element.name != "New Account") {
                userRoles.push(element.id);
            }
        });

        if (userRoles.length > 0) {
            dbUsers.updateUserRoles(guild.id, member.user.id, userRoles, false, () => {});
        } else {
            dbUsers.updateUserRoles(guild.id, member.user.id, [], true, () => {});
        }

        dbUsers.updateUserLeft(guild.id, member.user.id, Date.now(), () => {});
    }

    dbGuild.fetchGuild(guild.id, function(err, guildData) {
        if (err) logger.error(err);

        //Handling of newly created accounts
        if (guildData != null && guildData.hasOwnProperty('isolatenewaccounts') && guildData.isolatenewaccounts) {
            dbGuild.fetchNewAccounts(guild.id).then((arr) => {
                for (var userData of arr) {
                    if (userData.user_id == member.user.id && userData.guild_id == guild.id) {
                        dbGuild.deleteNewAccount(guild.id, member.user.id).catch((e) => {
							logger.error(e);
						});
                        return;
                    }
                }
                //If no user was found in the db
                helpers.logWelcomeOrLeft(guild, member, false);
            });
        } else {
            helpers.logWelcomeOrLeft(guild, member, false);
        }
    });
});

/* Username and nickname update handler */
client.on('userUpdate', (oldUser, newUser) => {
    if (persist && oldUser.username != newUser.username && newUser.username != null) {
        //dbUtils.storeNameChange(oldUser.id, oldUser.username, newUser.username, false);
        dbUsers.updateUsername(newUser.id, newUser.username, () => {

        });
    }
});

client.on('guildMemberUpdate', (oldMember, newMember) => {
    if (persist && oldMember.nickname != newMember.nickname) {
        //dbUtils.storeNameChange(newMember.user.id, oldMember.nickname, newMember.nickname, true, oldMember.guild.id);
        dbUsers.updateNickname(newMember.guild.id, newMember.user.id, newMember.nickname, () => {

        });
    }
});

/* Database persist of deleted/edited messages */
client.on('messageDelete', (message) => {
    if (persist) {
        dbUtils.tagMessageAs(message.id, false);
    }
});

client.on('messageUpdate', (oldMessage, newMessage) => {
    if (persist) {
        dbUtils.tagMessageAs(oldMessage.id, true, newMessage.content);
        if (newMessage.guild != null) {
            helpers.checkInvLink(newMessage);
        }
    }
});

/* Handling of server bans */
client.on('guildBanAdd', (guild, user) => {

    //Console persist
    logger.info(`${user.username}#${user.discriminator} (${user.id}) banned from ${guild.name}`);

    //Timeout to dectect the softban message
    setTimeout(() => {
        discordUtils.findLogsChannel(guild, (logChannel) => {
            if (logChannel) {
                var foundSoftBan = false;
                logChannel.fetchMessages({
                        limit: 5
                    })
                    .then(messages => {
                        var messageFound = messages.find(m => {
                            var embed = m.embeds[0];
                            if (embed) {
                                if (embed.title != "SOFTBAN") return false;
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

/* Starts the bot */
function startBot() {
    //Try to connect to DB and to log the client
    Connection((err, db) => {
        if (err) logger.error(err);
        client.login(token);
    });
}

startBot();
