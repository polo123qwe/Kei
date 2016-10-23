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
    //console.log(mentionedMember.user.username);
    var member = (mentionedMember != null) ? mentionedMember : msg.member;
    var out = member.user.username + "#" + member.user.discriminator + ': "' +
        utils.unixToTime(member.joinDate) + '"\n';
    out += utils.convertUnixToDate(Date.now() - member.joinDate.getTime());
    msg.channel.sendCode("xl", out);
}
commands.push(cmd);
////////////////////////////////////////////////////////////
// @TODO getlogs
////////////////////////////////////////////////////////////
// @TODO get name history
////////////////////////////////////////////////////////////
cmd = new Command('guild', 'Server Data', 'dev');
cmd.alias.push('server');
cmd.addHelp('Prints the guild settings');
cmd.minLvl = levels.ADMIN;
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
