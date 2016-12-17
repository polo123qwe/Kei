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
    msg.guild.fetchMembers().then(processJoined).catch(processJoined);

    function processJoined() {
        var member = discordUtils.getOneMemberFromMessage(msg, suffix);

        var out = member.user.username + "#" + member.user.discriminator + ': "' +
            utils.unixToTime(member.joinedAt) + '"\n';
        out += utils.convertUnixToDate(Date.now() - member.joinedAt.getTime());
        msg.channel.sendCode("xl", out);
    }

}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('ava', 'Server Data');
cmd.addHelp('Returns the avatar of the user');
cmd.addUsage('[username/nick/id]');
cmd.cd = 5;
cmd.minLvl = levels.DEFAULT;
cmd.execution = function(client, msg, suffix) {

    var user = discordUtils.getOneMemberFromMessage(msg, suffix).user;

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
cmd = new Command('names', 'Server Data');
cmd.addHelp('Retrieves last 5 names/nicknames a user had in the past (-all shows all)');
cmd.addUsage('[-all] [username/nick/id]')
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

    var user = discordUtils.getOneMemberFromMessage(msg, suffix).user;

    dbUtils.fetchNameChanges(user.id, msg.guild.id, (err, arr) => {
        if (err) return console.log(err);
        var names = [];
        var nicks = [];
        for (var change of arr) {
            if (change.isNick) {
                if (change.oldName != null) {
                    nicks.push(change.oldName);
                }
            } else {
                names.push(change.oldName);
            }
        }
        var out = `${user.username}#${user.discriminator}\n`;
        if (names.length < 1) {
            out += `"No name changes recorded"`;
        } else {
            if (!all) {
                names = names.slice(0, 5);
            }
            out += `"The previous names for the user ${user.username}#${user.discriminator} are": ${names.join(", ")}`;
        }
        if (nicks.length < 1) {
            out += '\n"No nicknames recorded."';
        } else {
            if (!all) {
                nicks = nicks.slice(0, 5);
            }
            out += `\n"Nicknames": ${nicks.join(", ")}`;
        }
        msg.channel.sendCode("bash", out);
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
                console.log(member.user.username);
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

    var time = 7;
    if (suffix.length >= 2) {
        time = suffix[suffix.length - 1];
    } else if (suffix.length == 1 && member == null) {
        time = suffix[0];
    }
    if (time <= 0) {
        time = 1;
    }

    if (!member) {
        member = msg.member;
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
        if(hasRole && findingUsersWithRole){
            membersFound.push(member.user.username);
        } else if(!hasRole && !findingUsersWithRole){
            membersFound.push(member.user.username);
        }
    });

    if(membersFound.length > 10){
        var including = "with";
        if(findingUsersWithRole == false){
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
