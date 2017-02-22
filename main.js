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

//Database module
const Connection = require('./bin/db/dbConnection');
var time = Date.now();

/* On ready event */
client.on('ready', () => {
    var interval = Date.now() - time;
    console.log('Bot connected (' + interval + 'ms)');
    //Load all the timers
    helpers.loadTimers(client);
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
	console.log(`[${utils.unixToTime(Date.now())}] ${member.user.username}#${member.user.discriminator} (${member.id}) joined`);

	var guild = member.guild;
    if (logging) {
        dbUsers.updateUserJoined(guild.id, member.user.id, Date.now(), () => {});
    }
	dbGuild.fetchRoleID("warned", guild.id, warnedRole => {
		dbGuild.fetchRoleID("muted", guild.id, mutedRole => {
			console.log(warnedRole);
			console.log(mutedRole);
			retrieveMembers(warnedRole, mutedRole);
		});
	});


    dbGuild.fetchGuild(guild.id, function(err, guildData) {
        if (err) console.log(err);

        if (guildData != null && guildData.hasOwnProperty('greeting') && guildData.greeting == null) { return; }

        if (guildData != null && guildData.hasOwnProperty('greeting') && guildData.greeting != null) {
            //If you type default or an empty string it will use the default message
            if (guildData.greeting.length == 0 || !guildData.greeting.includes("default")) {
                guild.defaultChannel.sendMessage(helpers.processGreeting(guildData.greeting, member)).catch();
                return;
            }
        }
		if(guild.id == "132490115137142784"){
			guild.defaultChannel.sendMessage(`Wleocme to ${guild.name}, ${member.user}! Remember to read the rules! <#137105484040634368>`).catch();
		} else {
			guild.defaultChannel.sendMessage(`Welcome to ${guild.name}, ${member.user}! Don't forget to read the rules!`).catch();
		}
    });

	function retrieveMembers(warnedRole, mutedRole){
		dbUsers.fetchMember(guild.id, member.user.id, (err, memberData) => {
	        if (err) console.log(err);
	        else {
	            if (memberData && memberData.last_left) {
	                if (memberData.roles && memberData.roles.length > 0) {
	                    member.addRoles(memberData.roles).then((memb) => {
	                        if ((warnedRole && (memberData.roles.indexOf(warnedRole) > -1)) || (mutedRole && (memberData.roles.indexOf(mutedRole) > -1))) {
	                            member.user.sendMessage(`It looks like you have tried to circumvent a warning/mute in ${guild.name}. If you continue to do so, a ban will be issued.`);
	                        }
	                    }).catch((er) => {console.log(er.stack)});
	                }
	            }
	        }
	    });
	}
});

client.on('guildMemberRemove', (member) => {

	//Console logging
	console.log(`[${utils.unixToTime(Date.now())}] ${member.user.username}#${member.user.discriminator} (${member.id}) left`);

	var guild = member.guild;

    if (logging) {
        var roleInstances = member.roles.array();
        var userRoles = [];


        roleInstances.forEach(function(element) {
            if (element.name != "@everyone") {
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

        if (guildData != null && guildData.hasOwnProperty('goodbye') && guildData.goodbye == null) {
            return;
        }

        if (guildData != null && guildData.hasOwnProperty('goodbye') && guildData.goodbye != null) {
            guild.defaultChannel.sendMessage(helpers.processGoodbye(guildData.goodbye, member));
        } else {
            var embed = new Discord.RichEmbed();
            var chance = Math.floor((Math.random() * 10) + 1);

            if (chance % 2) {
                embed.setAuthor(`${member.user.username}#${member.user.discriminator} has left the server!`, member.user.avatarURL);
            } else {
                embed.setAuthor(`${member.user.username}#${member.user.discriminator} is now gone.`, member.user.avatarURL);
            }

            embed.setColor("#f44441");

            guild.defaultChannel.sendEmbed(embed);
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
