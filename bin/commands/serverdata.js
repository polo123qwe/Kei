const Discord = require('discord.js');
var Command = require('../commandTemplate');
var Connection = require('../db/dbConnection');
var levels = require('../../consts/levels.json');
var paramtypes = require('../../consts/paramtypes.json');
var utils = require('../utils/utils');
var dbUtils = require('../db/dbUtils');
var dbUsers = require('../db/dbUsers');
var discordUtils = require('../utils/discordUtils');
var suf = require('../../config.json').suffix;
var commands = [];

var cmd;
////////////////////////////////////////////////////////////
cmd = new Command('info', 'Server Data');
cmd.addHelp('Returns info on a specific user. You can use either a mention, an ID, or a nickname.');
cmd.addUsage('[username/nick/id]');
cmd.cd = 10;
cmd.minlvl = levels.DEFAULT;
cmd.execution = function (client, msg, suffix) {
    msg.guild.fetchMembers().then(getMemberInfo).catch(getMemberInfo);

    function getMemberInfo () {
        var member = discordUtils.getOneMemberFromMessage(msg, suffix);

        var embed = new Discord.RichEmbed();
        /**
         * Embed Details
         */
        // Set the author of the embed
        embed.setAuthor(`${member.user.username}#${member.user.discriminator}`, member.user.avatarURL, member.user.avatarURL);

        // If the user is playing a game, display it below the thumbnail and their name.
        if (member.user.presence.game) {
            embed.setDescription("playing **" + member.user.presence.game.name + "**");
        }

        // ID and Status
        embed.addField("ID", member.user.id, true);
        embed.addField("Status", member.user.presence.status, true);

        // If the member has a nickname, we display it, if not we just display "n/a"
        (member.nickname) ? (embed.addField("Nickname", member.nickname, true)) : embed.addField("Nickname", "n/a", true);

        // Display the account creation date and the join date, plus the timespans in italics
        /**
         * @todo: Fix the convertUnixToDate function to display years instead of "12+ months", plus
         * it's still displaying "1 months" instead of "1 month". I also had to remove the trailing
         * full stop at the end :P
         */
        embed.addField("Account Created", utils.unixToTime(member.user.createdAt) + "\n(*" + utils.convertUnixToDate(Date.now() - member.user.createdAt.getTime()).toLowerCase().slice(0, -1) + " ago*)");
        embed.addField("Joined " + msg.guild.name, utils.unixToTime(member.joinedAt) + "\n(*" + utils.convertUnixToDate(Date.now() - member.joinedAt.getTime()).toLowerCase().slice(0, -1) + " ago*)");

        // Check for roles, and display them. If there are no roles this field is ignored
        if (member.roles) {
            var userRolesString = "";
            member.roles.array().forEach(function(item, index, array) {
                userRolesString += item.name + ", ";
            });

            // Cut the "@everyone portion so that the bot doesn't actually mention everyone"
            userRolesString = userRolesString.substr(0, userRolesString.indexOf("@everyone")) + userRolesString.substr(userRolesString.indexOf("@everyone") + 11);

            // Cut the trailing ", " at the end
            userRolesString = userRolesString.slice(0, -2);

            embed.addField("Roles", userRolesString);
        }

        // Set the timestamp for the command
        embed.setTimestamp();

        // Get color for the embed
        var role = member.roles.find((r) => {
            return r.hexColor != "#000000"
        });
        if (role) embed.setColor(role.hexColor);

        // Set the thumbnail
        embed.setThumbnail(member.user.avatarURL);

        // Send the message
        msg.channel.sendEmbed(embed);
    }
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('joined', 'Server Data');
cmd.addHelp('Returns the date the user joined');
cmd.addUsage('[username/nick/id]');
cmd.cd = 5;
cmd.minLvl = levels.DEFAULT;
cmd.execution = function(client, msg, suffix) {
    //TODO Fetch Data from DB
    msg.guild.fetchMembers().then(processJoined).catch(processJoined);

    function processJoined() {
        var member = discordUtils.getOneMemberFromMessage(msg, suffix);

        var embed = new Discord.RichEmbed();
        embed.setAuthor(`${member.user.username}#${member.user.discriminator}`, member.user.avatarURL, member.user.avatarURL);
        embed.addField("Joined", utils.unixToTime(member.joinedAt), false);
        embed.addField("Timespan", utils.convertUnixToDate(Date.now() - member.joinedAt.getTime()), false);
        embed.setTimestamp();
        var role = member.roles.find((r) => {
            return r.hexColor != "#000000"
        });
        if (role) embed.setColor(role.hexColor);
        embed.setThumbnail(member.user.avatarURL);
        msg.channel.sendEmbed(embed);
    }

}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('ava', 'Server Data');
cmd.alias.push('avatar');
cmd.addHelp('Returns the avatar of the user');
cmd.addUsage('[username/nick/id]');
cmd.cd = 5;
cmd.minLvl = levels.DEFAULT;
cmd.execution = function(client, msg, suffix) {

    var member = discordUtils.getOneMemberFromMessage(msg, suffix);

    var embed = new Discord.RichEmbed();
    embed.setAuthor(`${member.user.username}#${member.user.discriminator}`, member.user.avatarURL, member.user.avatarURL);
    embed.setImage(member.user.avatarURL);
    embed.setTimestamp();
    var role = member.roles.find((r) => {
        return r.hexColor != "#000000"
    });
    if (role) embed.setColor(role.hexColor);
    msg.channel.sendEmbed(embed);
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

    var time;
    if (suffix.length > 0) {
        time = suffix[0];
    } else {
        time = "2";
    }

    if (utils.isNumber(time)) {
        if (time > 72) time = 72;
        //If its a number we use it as time in hours
        dbUtils.fetchLogs(msg.channel.id, msg.guild.id, time * 60 * 60 * 1000, true, (err, dataArray) => {
            //We retrieve the data from the log and parse it.
            if (err) return console.log(err);
            if (dataArray.length < 1) return;

            //We use this method to split the array because hastebin has a limit of 5000 lines
            var chunk = 4500;
            var dataChunks = [];
            if (dataArray.length >= chunk) {
                for (var i = 0, j = dataArray.length; i < j; i += chunk) {
                    dataChunks.push(dataArray.slice(i, i + chunk));
                }
            } else {
                dataChunks.push(dataArray);
            }
            //console.log(`Original data size ${dataArray.length}, divided into ${dataChunks.length}`);
            processHasteBinData(dataChunks, urls => {
                urls = urls.reverse();
                msg.author.sendMessage(`Logs in ${msg.guild.name} #${msg.channel.name} can be found: ${urls.join(" ")}`);
                msg.delete().catch();
            });
        });
    } else if (suffix[0] == 'm' && utils.isNumber(suffix[1])) {
        //If the first param is the keyword m and the second one is a nubmer
        //means we want the amount of messages back
        dbUtils.fetchLogs(msg.channel.id, msg.guild.id, suffix[1], false, (err, dataArray) => {
            //We retrieve the data from the log and parse it.
            if (err) return console.log(err);
            if (dataArray.length < 1) return;

            //We use this method to split the array because hastebin has a limit of 5000 lines
            var chunk = 4500;
            var dataChunks = [];
            if (dataArray.length >= chunk) {
                for (var i = 0, j = dataArray.length; i < j; i += chunk) {
                    dataChunks.push(dataArray.slice(i, i + chunk));
                }
            } else {
                dataChunks.push(dataArray);
            }

            processHasteBinData(dataChunks, urls => {
                urls = urls.reverse();
                msg.author.sendMessage(`Logs in ${msg.guild.name} #${msg.channel.name} can be found: ${urls.join(" ")}`);
                msg.delete().catch();
            });
        });
    } else {
        //User input is incorrect
        discordUtils.sendAndDelete(msg.channel, 'Error, parameters are not valid!');
    }

    /*
     * This function will create an url for each chunk of the array and return it as a callback
     */
    function processHasteBinData(dataChunks, callback, urls) {
        if (urls == null) urls = [];

        if (dataChunks.length < 1) return callback(urls);

        var data = dataChunks.pop();

        var parsedData = parseLogData(data);
        utils.generateHasteBin(parsedData, url => {
            urls.push(url);
            processHasteBinData(dataChunks, callback, urls);
        })
    }

    function parseLogData(arr) {
        var guild = client.guilds.get(arr[0].guild_id);
        var channel = guild.channels.get(arr[0].channel_id);

        var outStr = `Last ${arr.length} messages in #${channel.name} [${guild.name}]:\n\n`;

        for (var elem of arr) {

            var user = client.users.get(elem.author_id);
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
cmd = new Command('names', 'Server Data');
cmd.addHelp('Retrieves last 5 names/nicknames a user had in the past (-all shows all)');
cmd.addUsage('[-all] [username/nick/id]');
cmd.addExample(`names${suf} Ghost -all`);
cmd.minLvl = levels.USER;
cmd.reqDB = true;
cmd.execution = function(client, msg, suffix) {

    //Remove if "-a" was in the message and set the message to all
    var all = false;
    var index = suffix.indexOf("-all");
    if (index > -1) {
        suffix.splice(index, 1);
        all = true;
    }

    var member = discordUtils.getOneMemberFromMessage(msg, suffix);

    dbUsers.fetchMember(msg.guild.id, member.user.id, (err, memberData) => {
        dbUsers.fetchUser(member.user.id, (err2, userData) => {

            if (err) console.log(err);
            else if (err2) console.log(err)
            else {
                var nicks = [];

                if (memberData && memberData.hasOwnProperty("nicknames")) {
                    var nicks = memberData.nicknames;
                }
                var names = [];
                if (userData && userData.hasOwnProperty("usernames")) {
                    names = userData.usernames;
                }

                var embed = new Discord.RichEmbed();
                embed.setAuthor(`${member.user.username}#${member.user.discriminator}`, member.user.avatarURL, member.user.avatarURL);
                embed.setThumbnail(member.user.avatarURL);
                embed.setTimestamp();
                var role = member.roles.find((r) => {
                    return r.hexColor != "#000000"
                });
                var asynchronous = false;
                if (role) embed.setColor(role.hexColor);

                if (names.length < 1) {
                    embed.addField("Names", "No name changes recorded");
                } else {
                    if (!all) {
                        names = names.slice(0, 5);
                    }
                    embed.addField("Names", `${names.join(", ")}`);
                }
                if (nicks.length < 1) {
                    embed.addField("Nicknames", "No nicknames recorded");
                } else {
                    if (!all) {
                        nicks = nicks.slice(0, 5);
                        embed.addField("Nicknames", `${nicks.join(", ")}`);
                    } else if (nicks.length > 32) {
                        asynchronous = true;
                        utils.generateHasteBin(`Nicks for ${member.user.username}#${member.user.discriminator}:\n${nicks.join("\n ")}`, (link) => {
                            nicks = nicks.slice(0, 32);
                            embed.addField("Nicknames", `[Full list](${link}), first 32: ${nicks.join(", ")}`);
                            msg.channel.sendEmbed(embed);
                        })
                    } else {
                        embed.addField("Nicknames", `${nicks.join(", ")}`);
                    }
                }
                if (!asynchronous) {
                    msg.channel.sendEmbed(embed);
                }
            }
        });
    });

}
commands.push(cmd);
////////////////////////////////////////////////////////////
//@TODO Remake this
/*cmd = new Command('guild', 'Server Data', 'dev');
cmd.alias.push('server');
cmd.addHelp('Prints the guild settings');
cmd.minLvl = levels.MODERATOR;
cmd.reqDB = true;
cmd.execution = function(client, msg, suffix) {
    dbUtils.fetchGuild(msg.guild.id, function(err, guildData) {
        if (err) return discordUtils.sendAndDelete(msg.channel, err);
        if (!guildData) return discordUtils.sendAndDelete(msg.channel, "Guild has no settings!");

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
commands.push(cmd);*/
////////////////////////////////////////////////////////////
cmd = new Command('friends', 'Server Data');
cmd.addHelp('Shows people with the same color as you have');
cmd.cd = 30;
cmd.minLvl = levels.DEFAULT;
cmd.execution = function(client, msg, suffix) {
    var role = msg.member.roles.find(r => r.name.startsWith("#"));
    if (role == null) {
        discordUtils.sendAndDelete(msg.channel, "You have no color!");
    } else {
        var names = [];
        for (var member of msg.guild.members.array()) {
            if (member.roles.exists(r => r.name == role.name)) {
                if (member.user.id != msg.author.id) {
                    names.push(member.user.username);
                }
            }
        }
        if (names.length < 1) {
            msg.channel.sendMessage(`:frowning:`);
        } else {
            msg.channel.sendMessage(`Your friends are: ${names.join(", ")}`);
        }
    }
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('activity', 'Server Data');
cmd.addHelp('Shows how many messages a user has sent');
cmd.addUsage('<number> [id]')
cmd.minLvl = levels.DEFAULT;
cmd.execution = function(client, msg, suffix) {

    var member = discordUtils.getMembersFromMessage(msg, suffix)[0];

    var time = suffix[0];

    if (!time || !utils.isNumber(time)) time = 7;

    if (!member) {
        member = msg.member;
    } else if (suffix.length == 1) {
        time = 7;
    }

    if (time <= 0) {
        time = 1;
    } else if (time > 365) {
        time = 365;
    }

    dbUtils.fetchUserActivity(msg.guild.id, member.user.id, time, (err, res) => {
        if (err) return console.log(err);
        var totalMsgs = 0;
        for (var day of res) {
            totalMsgs += day.msgs;
        }
        msg.channel.sendMessage(`${member.user.username} has sent ${totalMsgs} messages in the last ${time} days.`);
    });
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('role', 'Server Data');
cmd.addHelp('Prints how many users are in a role, -r for users without the role');
cmd.addUsage('<role name> [-r]')
cmd.minLvl = levels.MODERATOR;
cmd.params.push(paramtypes.PARAM);
cmd.execution = function(client, msg, suffix) {

    var index = suffix.indexOf("-r");
    var findingUsersWithRole = true;
    if (index > -1) {
        suffix.splice(index, 1);
        findingUsersWithRole = false;
    }

    var targetRole = discordUtils.getRole(msg.guild, suffix.join(" "));
    var membersFound = [];

    if (targetRole == null) {
        utils.sendAndDelete(msg.channel, "Role not found!");
    }

    msg.guild.members.forEach(member => {
        var hasRole = member.roles.exists(r => r.id == targetRole.id);
        if (hasRole && findingUsersWithRole) {
            membersFound.push(member.user.username);
        } else if (!hasRole && !findingUsersWithRole) {
            membersFound.push(member.user.username);
        }
    });

    if (membersFound.length > 10) {
        var including = "with";
        if (findingUsersWithRole == false) {
            including = "without";
        }
        msg.channel.sendMessage(`There are ${membersFound.length} users ${including} the role ${targetRole.name}`);
    } else {
        msg.channel.sendMessage(`The users ${including} the role ${targetRole.name} are: ${membersFound.join(", ")}.`);
    }

}
commands.push(cmd);
////////////////////////////////////////////////////////////

module.exports = commands;
