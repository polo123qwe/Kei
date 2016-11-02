var Command = require('../commandTemplate');
var Connection = require('../dbConnection');
var levels = require('../../consts/levels.json');
var paramtypes = require('../../consts/paramtypes.json');
var utils = require('../utils');
var dbUtils = require('../dbUtils');
var discordUtils = require('../discordUtils');
var commands = [];

var cmd;
////////////////////////////////////////////////////////////
cmd = new Command('joined', 'Server Data');
cmd.addHelp('Returns the date the user joined');
cmd.addUsage('[username/nick/id]');
cmd.cd = 5;
cmd.minLvl = levels.DEFAULT;
cmd.execution = function(client, msg, suffix) {
    //TODO Fetch Data from DB
    var mentionedMember;
    if (suffix) {
        if (msg.mentions.users.array().length != 0) {
            mentionedMember = msg.mentions.users[0];
        } else {
            var name = suffix.join(" ");
            if (name.length > 0) {
                mentionedMember = msg.guild.members.find((m) => {
                    return utils.isUser(name, m, true);
                });
                if (!mentionedMember) {
                    mentionedMember = msg.guild.members.find((m) => {
                        return utils.isUser(name, m, false);
                    });
                }
            }
        }
    }
    var member = (mentionedMember != null) ? mentionedMember : msg.member;
    var out = member.user.username + "#" + member.user.discriminator + ': "' +
        utils.unixToTime(member.joinedAt) + '"\n';
    out += utils.convertUnixToDate(Date.now() - member.joinedAt.getTime());
    msg.channel.sendCode("xl", out);
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('ava', 'Server Data');
cmd.addHelp('Returns the avatar of the user');
cmd.addUsage('[username/nick/id]');
cmd.cd = 5;
cmd.minLvl = levels.DEFAULT;
cmd.execution = function(client, msg, suffix) {
    //TODO Fetch Data from DB
    var mentionedMember, user;
    if (msg.mentions.users.array().length != 0) {
        user = msg.mentions.users.array()[0];
    } else {
        var name = suffix.join(" ");
        if (name.length > 0) {
            mentionedMember = msg.guild.members.find((m) => {
                return utils.isUser(name, m, true);
            });
            if (!mentionedMember) {
                mentionedMember = msg.guild.members.find((m) => {
                    return utils.isUser(name, m, false);
                });
            }
        }
        user = (mentionedMember != null) ? mentionedMember.user : msg.author;
    }

    msg.channel.sendMessage(`[${user.username}] ${user.avatarURL}`)
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('getlogs', 'Server Data');
cmd.alias.push('getlog', 'logs');
cmd.addHelp('Retrieves the logs, X messages or since X time ago (m for messages)');
cmd.addUsage('[m] <time(hrs)/number>');
cmd.minLvl = levels.MODERATOR;
cmd.reqDB = true;
cmd.execution = function(client, msg, suffix) {

    var time = 2;
    if(suffix.length > 1){
        time = suffix[0];
    } else {
        time = 2;
    }

    if (utils.isNumber(time)) {
        if(time > 72) time = 72;
        //If its a number we use it as time in hours
        dbUtils.fetchLogs(msg.channel.id, msg.guild.id, time * 3600000, true, (err, arr) => {
            //We retrieve the data from the log and parse it.
            if (err) return console.log(err);
            if (arr.length < 1) return;

            var parsedData = parseLogData(arr);
            utils.generateHasteBin(parsedData, url => {
                msg.author.sendMessage(`Logs in ${msg.guild.name} #${msg.channel.name} can be found: ${url}`);
                msg.delete();
            })
        });
    } else if (suffix[0] == 'm' && utils.isNumber(suffix[1])) {
        //If the first param is the keyword m and the second one is a nubmer
        //means we want the amount of messages back
        dbUtils.fetchLogs(msg.channel.id, msg.guild.id, suffix[1], false, (err, arr) => {
            //We retrieve the data from the log and parse it.
            if (err) return console.log(err);
            if (arr.length < 1) return;

            var parsedData = parseLogData(arr);
            utils.generateHasteBin(parsedData, url => {
                msg.author.sendMessage(`Logs in ${msg.guild.name} #${msg.channel.name} can be found: ${url}`);
                msg.delete();
            })
        });
    } else {
        //User input is incorrect
        utils.sendAndDelete(msg.channel, 'Error, parameters are not valid!');
    }

    function parseLogData(arr) {
        var guild = client.guilds.find("id", arr[0].guild_id);
        var channel = guild.channels.find("id", arr[0].channel_id);

        var outStr = `Last ${arr.length} messages in #${channel.name} [${guild.name}]:\n\n`;

        for (var elem of arr) {

            var user = client.users.find("id", elem.author_id);
            var userName;
            if (user) {
                userName = `(${user.id}) ${user.username}#${user.discriminator}`;
            } else {
                username = "###Missing Name###";
            }

            outStr += `[${utils.unixToTime(elem.timestamp)}] [${userName}]`;

            if (elem.edited) {
                outStr += ` (edited)`;
            }

            if (elem.deleted) {
                outStr += ` (deleted)`;
            }

            if (elem.attachments) {
                outStr += ` (${elem.attachments} attachments)`;
            }
            outStr += ": " + elem.content + "\n";
        }
        return outStr;
    }
}
commands.push(cmd);
////////////////////////////////////////////////////////////
// @TODO get name history
////////////////////////////////////////////////////////////
cmd = new Command('guild', 'Server Data', 'dev');
cmd.alias.push('server');
cmd.addHelp('Prints the guild settings');
cmd.minLvl = levels.MODERATOR;
cmd.reqDB = true;
cmd.execution = function(client, msg, suffix) {

    // @TODO Work on this formatting and stuff
    dbUtils.fetchGuild(msg.guild.id, function(err, guildData) {
        if (err) return utils.sendAndDelete(msg.channel, err);
        if (!guildData) return utils.sendAndDelete(msg.channel, "Guild has no settings!");

        var out = "";
        if (guildData.hasOwnProperty('roles')) {
            var roles = [];
            out += "Roles available are: ";
            for (var roleID of guildData.roles) {
                var role = msg.guild.roles.find('id', roleID);
                if (role) {
                    roles.push(role.name);
                }
            }
            out += roles.join(", ");
            out += "\n";
        }
        if (guildData.hasOwnProperty('limitedcolors')) {
            if (guildData.limitedcolors) {
                out += "Colors are limited";
            } else {
                out += "Colors are unlimited";
            }
            out += "\n";
        }

        msg.channel.sendCode('xl', out);

    });
}
commands.push(cmd);
////////////////////////////////////////////////////////////

module.exports = commands;
