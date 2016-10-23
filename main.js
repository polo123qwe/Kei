/*
  A ping pong bot, whenever you send "ping", it replies "pong".
*/

// import the discord.js module
const Discord = require('discord.js');

var Command = require('./bin/commandTemplate');
var commands = require('./bin/commands');
// create an instance of a Discord Client, and call it bot
const client = new Discord.Client({
    fetch_all_members: true,
    disable_everyone: true
});
const token = require('./config.json').token;
const suf = require('./config.json').suffix;
var utils = require('./bin/utils');
var dbUtils = require('./bin/dbUtils');
var discordUtils = require('./bin/discordUtils');

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
    dbUtils.storeMessage(msg);

    //We check is its a command
    if (cmdName.endsWith(suf)) {
        cmdName = cmdName.substring(0, splitted[0].length - 1);
        cmdName = cmdName.toLowerCase();
        if (commands.hasOwnProperty(cmdName)) {
            dbUtils.fetchGuild(msg.guild.id, function(err, guildData) {
                if (err) {
                    console.log(err);
                }
                if (!guildData) return commands[cmdName].run(client, msg, suffix);

                var disabledCats = guildData.disabled;
                if (disabledCats && !disabledCats.includes(commands[cmdName].category.toLowerCase())) {
                    console.log("Running " + cmdName);
                    commands[cmdName].run(client, msg, suffix);;
                } else {
                    console.log("Running " + cmdName);
                    commands[cmdName].run(client, msg, suffix);
                }
            });
        }

    }
});

client.on('guildMemberAdd', (guild, member) => {
    //do stuff
});

client.on('guildMemberRemove', (guild, member) => {
    //do stuff
});

///////////////// Namechanges handling ////////////////////////////
client.on('presenceUpdate', (oldUser, newUser) => {
    if (oldUser.username != newUser.username) {
        dbUtils.storeNameChange(oldUser.id, oldUser.username, newUser.username, false);
    }
});

client.on('guildMemberUpdate', (guild, oldMember, newMember) => {
    dbUtils.storeNameChange(newMember.user.id, oldMember.nickname, newMember.nickname, true, guild.id);
});
///////////////////////////////////////////////////////////////////
//If a message was deleted, tag that message as deleted
client.on('messageDelete', (message) => {
    dbUtils.tagAsDeleted(message.id);
});

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

//Try to connect to DB and to log the client
Connection((err, db) => {
    if (err) console.log(err.message);
    client.login(token);
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
                //console.log((timer.time - span)/(3600*1000));
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
        member.removeRole(timer.role_id).then(() => {
            console.log(member.user.username + " unmuted.")
            dbUtils.removeTimer(timer.user_id, timer.role_id, function() {
                removeTimers();
            });
        });
    }
}
/*
function removeChills(){
    for(var guild of client.guilds.array()){
        guild.roles.find(r => r.name == )
    }
}
*/
