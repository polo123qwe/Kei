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
                if(!mentionedMember){
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

module.exports = commands;
