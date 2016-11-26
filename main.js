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
var utils = require('./bin/utils');
var dbUtils = require('./bin/dbUtils');
var discordUtils = require('./bin/discordUtils');

//Automatic membership processing
var checkMembershipStatus = require('./bin/memberProcessor.js');

//Database module
const Connection = require('./bin/dbConnection');
var time = Date.now();

client.on('ready', () => {
    var interval = Date.now() - time;
    console.log('Ready to operate! (' + interval + 'ms)');
    //Load all the timers
    loadTimers();
    //removeChills();
});

// create an event listener for messages
client.on('message', msg => {

    var splitted = msg.content.split(" ");
    //Remove suffix
    var cmdName = splitted[0];
    var suffix = msg.content.substr(cmdName.length + 1).split(" ");

    //Log the message in the DB
    if (logging) {
        dbUtils.storeMessage(msg);
        if (msg.guild != null) {
            checkMembershipStatus(client, msg.member);
        }
    }

    //Ignore bot own commands
    if (msg.author.id == client.user.id) {
        return;
    }

    if (msg.guild != null) {
        checkInvLink(msg);
    }

    //We check is its a command
    if (cmdName.endsWith(suf)) {
        cmdName = cmdName.substring(0, splitted[0].length - 1);
        cmdName = cmdName.toLowerCase();
        if (commands.hasOwnProperty(cmdName)) {
            //If the command was typed in a dm and the command doesn't allow DM calling, notify user
            //@TODO this should be done in checks
            if (commands[cmdName].dm == false && msg.guild == null) {
                return msg.channel.sendMessage("Cannot execute that command in a DM!");
            }

            dbUtils.fetchChannel(msg.channel.id, function(err, channelData) {
                if (err) {
                    console.log(err);
                }

                if (channelData == null){
                    console.log("Running " + cmdName);
                    return commands[cmdName].run(client, msg, suffix);
                }
                var disabledCats = channelData.disabled;

                //If the module is disabled
                if (disabledCats != null && disabledCats.includes(commands[cmdName].category.toLowerCase())) {
                    discordUtils.sendAndDelete(msg.channel, 'Module disabled in this channel!', 2000);
                } else {
                    console.log("Running " + cmdName);
                    commands[cmdName].run(client, msg, suffix);
                }
            });
        }
    } else if (msg.mentions.users.exists('id', client.user.id)) {
        //We check if the bot was pinged
        //console.log("Bot was pinged!");
        //ai(client, msg);
    }
});

///////////////// Join and leave member ///////////////////////////
client.on('guildMemberAdd', (member) => {
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

        member.guild.defaultChannel.sendMessage(`Welcome to ${member.guild.name}, ${member.user}! Dont forget to read the rules!`).catch();

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
    dbUtils.fetchGuild(member.guild.id, function(err, guildData) {
        if (err) console.log(err);

        if (guildData != null && guildData.hasOwnProperty('goodbye') && guildData.goodbye == null) {
            return;
        }

        if (guildData != null && guildData.hasOwnProperty('goodbye') && guildData.goodbye != null) {
            member.guild.defaultChannel.sendMessage(processGreeting(guildData.goodbye));
        } else {
            member.guild.defaultChannel.sendMessage(`**${member.user.username} #${member.user.discriminator}** is now gone.`);
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
    if (logging && oldUser.username != oldUser.username) {
        dbUtils.storeNameChange(oldUser.id, oldUser.username, newUser.username, false);
    }
});

client.on('guildMemberUpdate', (oldMember, newMember) => {
    if (logging && oldMember.nickname != newMember.nickname) {
        dbUtils.storeNameChange(newMember.user.id, oldMember.nickname, newMember.nickname, true, oldMember.guild.id);
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
    discordUtils.findLogsChannel(guild, (channel) => {
        if (channel) {
            channel.sendCode('diff', '').then((m) => {
                m.editCode('diff', "- ----------------BAN----------------- -\nUser:   " +
                    user.username + "#" + user.discriminator + "(" + user.id + ")\n" +
                    "Mod:    " + m.id + "\nReason: " + m.id + "\nTime:   " +
                    utils.unixToTime(Date.now()));
            });
        }
    });
});

/*
 * This funciton loads the timers from the database and then checks if they have
 * expired, if they have the role is removed from the user, if now, we create a
 * timeout with the time remaining
 */
function loadTimers() {

    var db = Connection.getDB();
    if (!db) return callback("Not connected to DB!");
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
                    var guild = client.guilds.find("id", timer.guild_id);
                    var member = guild.members.find("id", timer.user_id);
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
        var guild = client.guilds.find("id", timer.guild_id);
        var member = guild.members.find("id", timer.user_id);
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

//Try to connect to DB and to log the client
Connection((err, db) => {
    if (err) console.log(err.message);
    client.manager.setupKeepAlive(300000);
    client.login(token);
});
