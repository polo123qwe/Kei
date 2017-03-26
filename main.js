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
    fetch_all_members: true,
    disable_everyone: true
});
const token = require('./config.json').token;
const suf = require('./config.json').suffix;
const logging = require('./config.json').logging;

//Automatic membership processing
var checkMembershipStatus = require('./bin/memberProcessor.js');
var memberRemoval = require('./bin/memberRemoval.js');
var NEWUSERTHRESHOLD = (7 * 24 * 3600 * 1000);

//Database module
const Connection = require('./bin/db/dbConnection');
var time = Date.now();

/* On ready event */
client.on('ready', () => {
    var interval = Date.now() - time;
    console.log('Bot connected (' + interval + 'ms)');
    //Load all the timers
    helpers.loadTimers(client);
    helpers.loadNewMembers(client, NEWUSERTHRESHOLD);
    memberRemoval(client);
});

/* Message event listener */
client.on('message', msg => {
    var splitted = msg.content.split(" ");

    //Log the message in the DB
    if (logging) {
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
                console.log(`[${utils.unixToTime(Date.now())}][${location}][${msg.author.username}] >${cmdName}. Parameters: ${suffix.join(" ")}`);
            } else {
                console.log(`[${utils.unixToTime(Date.now())}][${location}][${msg.author.username}] >${cmdName}`);
            }
            commands[cmdName].run(client, msg, suffix);
        }
    } else if (msg.mentions.users.has(client.user.id)) {
        /* TODO: Bot AI with Cleverbot? */
    }
});

/* Member join and leave processing */
client.on('guildMemberAdd', (member) => {

    //Console logging
    console.log(`[${utils.unixToTime(Date.now())}] ${member.user.username}#${member.user.discriminator} (${member.id}) joined ${member.guild.name}`);

    var guild = member.guild;
    if (logging) {
        dbUsers.updateUserJoined(guild.id, member.user.id, Date.now(), () => {});
    }
    dbGuild.fetchRoleID("warned", guild.id, warnedRole => {
        dbGuild.fetchRoleID("muted", guild.id, mutedRole => {
            retrieveMembers(warnedRole, mutedRole);
        });
    });

    dbGuild.fetchGuild(guild.id, function(err, guildData) {
        if (err) console.log(err);

		//Handling of newly created accounts
		if (guildData != null && guildData.hasOwnProperty('isolatenewaccounts') && guildData.isolatenewaccounts){
			if(member.user.createdTimestamp > Date.now() - NEWUSERTHRESHOLD){
				//Check if the account is new, if it is we check that the user is not already in the database and add it
				dbGuild.fetchNewAccounts(member.guild.id).then((arr) => {
					for(var userData of arr){
						if(userData.user_id == member.user.id && userData.guild_id == member.guild.id){
							return;
						}
					}
					dbGuild.storeNewAccount(guild.id, member.user.id).then(() => {
						var role = guild.roles.find("name", "New Account");
						if(role){
							console.log(`[${utils.unixToTime(Date.now())}] and added to newly created accounts`);
							setTimeout(() => {
								member.addRole(role).catch(console.log);
							}, 1000);
						}
					}).catch(console.log);
				});
			} else {
				//If the user is not a newly created account
				helpers.welcomeUser(guild, guildData, member);
			}
		} else {
			//If the guild has not set up the limit of new users, just process the welcome
			helpers.welcomeUser(guild, guildData, member);
		}
    });

    function retrieveMembers(warnedRole, mutedRole) {
        dbUsers.fetchMember(guild.id, member.user.id, (err, memberData) => {
            if (err) console.log(err);
            else {
                if (memberData && memberData.last_left) {
                    if (memberData.roles && memberData.roles.length > 0) {
                        member.addRoles(memberData.roles).then((memb) => {
                            if ((warnedRole && (memberData.roles.indexOf(warnedRole) > -1)) || (mutedRole && (memberData.roles.indexOf(mutedRole) > -1))) {
                                member.user.sendMessage(`It looks like you have tried to circumvent a warning/mute in ${guild.name}. If you continue to do so, a ban will be issued.`);
                            }
                        }).catch((er) => {
                            console.log(er.stack)
                        });
                    }
                }
            }
        });
    }
});

client.on('guildMemberRemove', (member) => {

    //Console logging
    console.log(`[${utils.unixToTime(Date.now())}] ${member.user.username}#${member.user.discriminator} (${member.user.id}) left ${member.guild.name}`);

    var guild = member.guild;

    if (logging) {
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
        if (err) console.log(err);

		//Handling of newly created accounts
		if (guildData != null && guildData.hasOwnProperty('isolatenewaccounts') && guildData.isolatenewaccounts){
			dbGuild.fetchNewAccounts(guild.id).then((arr) => {
				for(var userData of arr){
					if(userData.user_id == member.user.id && userData.guild_id == guild.id){
						dbGuild.deleteNewAccount(guild.id, member.user.id).catch(console.log);
						return;
					}
				}
				//If no user was found in the db
				helpers.goodbyeUser(guild, guildData, member);
			});
		} else {
			helpers.goodbyeUser(guild, guildData, member);
		}
    });
});

/* Username and nickname update handler */
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

/* Database logging of deleted/edited messages */
client.on('messageDelete', (message) => {
    if (logging) {
        dbUtils.tagMessageAs(message.id, false);
    }
});

client.on('messageUpdate', (oldMessage, newMessage) => {
    if (logging) {
        dbUtils.tagMessageAs(oldMessage.id, true, newMessage.content);
        if (newMessage.guild != null) {
            helpers.checkInvLink(newMessage);
        }
    }
});

/* Handling of server bans */
client.on('guildBanAdd', (guild, user) => {

    //Console logging
    console.log(`[${utils.unixToTime(Date.now())}] ${user.username}#${user.discriminator} (${user.id}) banned from ${guild.name}`);

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
								if(embed.title != "SOFTBAN") return false;
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
                        } else {
							console.log("Message")
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
        if (err) console.log(err.message);
        client.manager.setupKeepAlive(300000);
        client.login(token);
    });
}

startBot();
