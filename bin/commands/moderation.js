var Command = require('../commandTemplate');
var Connection = require('../dbConnection');
var levels = require('../../consts/levels.json');
var paramtypes = require('../../consts/paramtypes.json');
var utils = require('../utils');
var discordUtils = require('../discordUtils');
var dbUtils = require('../dbUtils');
var commands = [];

var cmd;
////////////////////////////////////////////////////////////
cmd = new Command('warn', 'Moderation');
cmd.addHelp('Warns a user');
cmd.addUsage('<mention/id> [time] [reason]');
cmd.minLvl = levels.MODERATOR;
cmd.params.push(paramtypes.MENTIONORID);
cmd.execution = function(client, msg, suffix) {
    /*
     * we add a user to the role and after its added we send a message to the
     * logs channel if its found.
     */

    var time = '--';
    var reason;
    if (utils.isNumber(suffix[1])) {
        time = parseInt(suffix[1], 10);
        reason = suffix.splice(2, suffix.length).join(" ");
    } else {
        reason = suffix.splice(1, suffix.length).join(" ");
    }

    var member = discordUtils.getMembersFromMessage(msg, suffix)[0];
    var role = msg.guild.roles.find((r) => r.name.toLowerCase() == "warned");

    if (!role) return discordUtils.sendAndDelete(msg.channel, "Role not found!");
    member.addRole(role).then(r => {
        discordUtils.findLogsChannel(msg.guild, (channel) => {
            if (channel) {
                channel.sendCode("xml", "< ----------------WARN---------------- >\nUser:   " +
                    member.user.username + "#" + member.user.discriminator +
                    "(" + member.user.id + ")\n" + "Mod:    " + msg.author.username +
                    "#" + msg.author.discriminator + "(" + msg.author.id + ")\n" +
                    "Reason: " + reason + "\nTime:   " + utils.unixToTime(Date.now()) + " (" + time + " day(s))");
            }
            dbUtils.insertLog(member.user.id, msg.author.id, "warning", reason, 0, function() {});
        });
    }).catch(err => discordUtils.sendAndDelete(msg.channel, ':warning: Bot error! ' + err.response.body.message));
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('chill', 'Moderation');
cmd.addHelp('Chills a user for 2 mins');
cmd.addUsage('<mention/id> [reason]');
cmd.minLvl = levels.MODERATOR;
cmd.params.push(paramtypes.MENTIONORID);
cmd.execution = function(client, msg, suffix) {

    var reason = suffix.splice(1, suffix.length).join(" ");

    var member = discordUtils.getMembersFromMessage(msg, suffix)[0];
    var role = msg.guild.roles.find((r) => r.name.toLowerCase() == "muted");

    if (!role) return discordUtils.sendAndDelete(msg.channel, "Role not found!");
    member.addRole(role).then(r => {
        discordUtils.findLogsChannel(msg.guild, (channel) => {
            if (channel) {
                channel.sendCode("md", "<-----------------CHILL---------------->\nUser:   " +
                    member.user.username + "#" + member.user.discriminator +
                    "(" + member.user.id + ")\n" + "Mod:    " + msg.author.username +
                    "#" + msg.author.discriminator + "(" + msg.author.id + ")\n" +
                    "Reason: " + reason + "\nTime:   " + utils.unixToTime(Date.now()) + " (2 minutes)");
            }
            dbUtils.insertLog(member.user.id, msg.author.id, "chilling", reason, 0, function() {});
            //Notify the userf
            member.user.sendMessage(`You have been chilled! You are muted for 2 minutes in ${msg.guild}`)
        });
        setTimeout(() => {
            member.removeRole(role).catch(console.log);
        }, 120000);
    }).catch(err => discordUtils.sendAndDelete(msg.channel, ':warning: Bot error! ' + err.response.body.message));
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('mute', 'Moderation');
cmd.addHelp('Mutes a user (default 3 days)');
cmd.addUsage('<mention/id> [time(days)] [reason]');
cmd.minLvl = levels.MODERATOR;
cmd.params.push(paramtypes.MENTIONORID);
cmd.execution = function(client, msg, suffix) {

    var time = 3;
    var reason;
    if (utils.isNumber(suffix[1])) {
        time = parseInt(suffix[1], 10);
        reason = suffix.splice(2, suffix.length).join(" ");
    } else {
        reason = suffix.splice(1, suffix.length).join(" ");
    }

    var member = discordUtils.getMembersFromMessage(msg, suffix)[0];
    var role = msg.guild.roles.find((r) => r.name.toLowerCase() == "muted");

    if (!role) return discordUtils.sendAndDelete(msg.channel, "Role not found!");
    member.addRole(role).then(r => {
        discordUtils.findLogsChannel(msg.guild, (channel) => {
            if (channel) {
                channel.sendCode("diff", "- ----------------MUTE---------------- -\nUser:   " +
                    member.user.username + "#" + member.user.discriminator +
                    "(" + member.user.id + ")\n" + "Mod:    " + msg.author.username +
                    "#" + msg.author.discriminator + "(" + msg.author.id + ")\n" +
                    "Reason: " + reason + "\nTime:   " + utils.unixToTime(Date.now()) + " (" + time + " day(s))");
            }
            dbUtils.insertLog(member.user.id, msg.author.id, "mute", reason, time, function() {});
            dbUtils.insertTimer(Date.now(), time * 24 * 3600 * 1000, member.user.id, role.id, msg.guild.id, function() {});
        });
        setTimeout(() => {
            member.removeRole(r).then(() => {
                console.log(member.user.username + " unmuted.")
            });
            dbUtils.removeTimer(member.user.id, r.id, function() {});
        }, time * 24 * 3600 * 1000);
    }).catch(err => discordUtils.sendAndDelete(msg.channel, ':warning: Bot error! ' + err.response.body.message));
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('prune', 'Moderation');
cmd.addHelp('Prunes a given amount of messages');
cmd.addUsage('<amount> [user]');
cmd.minLvl = levels.MODERATOR;
cmd.execution = function(client, msg, suffix) {
    var amount = suffix[0];
    var user = suffix[1];

    if (!amount || amount <= 1) return discordUtils.sendAndDelete(msg.channel, "Specify an amount!");
    if (amount > 50) {
        amount = 50;
    }

    var member = discordUtils.getMembersFromMessage(msg, suffix)[0];

    msg.channel.fetchMessages({
        limit: amount
    }).then((msgs) => {
        var toremove = msgs.array();
        if (member) {
            var toremove = msgs.filter(function(m) {
                return m.author.id == member.user.id;
            });
        }
        msg.channel.bulkDelete(toremove).catch(console.log);
    }).catch(err => discordUtils.sendAndDelete(msg.channel, ':warning: Bot error! ' + err.response.body.message));


}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('revokeinvite', 'Moderation');
cmd.addHelp('Revokes the given invite link');
cmd.addUsage('<invite link>');
cmd.minLvl = levels.MODERATOR;
cmd.params.push(paramtypes.PARAM);
cmd.execution = function(client, msg, suffix) {
    var inviteCode = suffix[0];

    //if no invite id is sent
    if (!inviteCode) return discordUtils.sendAndDelete(msg.channel, "Invite not found!");
    else {
        msg.guild.fetchInvites().then((invites) => {
            var invite = invites.find("code", inviteCode);

            if (invite) {
                invite.delete().then((inv) => {
                    msg.channel.sendMessage("Invite " + inviteCode +
                        " removed successfully");
                })
            } else {
                discordUtils.sendAndDelete(msg.channel, "Invite not found!");
            }
        });
    }
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('claim', 'Moderation');
cmd.addHelp('Claims a ban');
cmd.addUsage('<message id> [reason]');
cmd.minLvl = levels.MODERATOR;
cmd.params.push(paramtypes.PARAM);
cmd.execution = function(client, msg, suffix) {
    var messageID = suffix[0];
    var reason = suffix.splice(1, suffix.length).join(" ");

    discordUtils.findLogsChannel(msg.guild, function(channel) {
        if (channel) {
            channel.fetchMessage(messageID).then((m) => {
                if (m && m.author.id == client.user.id && m.content.includes(messageID)) {
                    var outmsg = m.content.replace(messageID, msg.author.username +
                        "#" + msg.author.discriminator + " (" + msg.author.id + ")");
                    if (reason) {
                        outmsg = outmsg.replace(messageID, reason);
                    } else {
                        outmsg = outmsg.replace(messageID, "No reason specified");
                    }
                    m.edit(outmsg);
                } else {
                    if (m.content.includes(msg.author.id)) {
                        var outmsg = m.content.replace(/Reason: .*/, 'Reason: ' + reason + ' (edited)');
                        m.edit(outmsg);
                    } else {
                        discordUtils.sendAndDelete(msg.channel, 'Not your message!');
                    }
                }
            }).catch(() => {
                discordUtils.sendAndDelete(msg.channel, "Message not found!");
            });
        }
    });
}
commands.push(cmd);
////////////////////////////////////////////////////////////
//MEMBER (New System?)
////////////////////////////////////////////////////////////

module.exports = commands;
