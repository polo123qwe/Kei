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
cmd = new Command('join', 'User Customization');
cmd.addHelp('Adds the user to the given roles');
cmd.addUsage('<role1>, [role2], [role3]');
cmd.minLvl = levels.DEFAULT;
cmd.execution = function(client, msg, suffix) {
    var rolesFound = [];
    var rolesToAdd = [];

    //Roles are sepparated by commas
    var elements = suffix.join(" ").split(/ ?, ?/);
    for(var elem of elements){
        var role = discordUtils.getRole(msg.guild, elem);
        if(role && rolesFound.indexOf(role) == -1){
            rolesFound.push(role);
        }
    }

    dbUtils.fetchGuild(msg.guild.id, function(err, guildData) {
        if(err) return utils.sendAndDelete(msg.channel, err);
        if(guildData.roles){
            for(var roleID of guildData.roles){
                var role = rolesFound.find((r) => {return r.id == roleID});
                if(role){
                    rolesToAdd.push(role);
                }
            }
        }
        if(rolesToAdd.length < 1) return utils.sendAndDelete(msg.channel, "Nothing to add!");
        msg.member.addRoles(rolesToAdd).then((memb) => {
            msg.channel.sendMessage(msg.author.username + " added successfully!");
        });
    });
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('leave', 'User Customization');
cmd.addHelp('Removes the user from the given roles');
cmd.addUsage('<role1>, [role2], [role3]');
cmd.minLvl = levels.DEFAULT;
cmd.execution = function(client, msg, suffix) {
    var rolesFound = [];
    var rolesToRemove = [];

    //Roles are sepparated by commas
    var elements = suffix.join(" ").split(/ ?, ?/);
    for(var elem of elements){
        var role = discordUtils.getRole(msg.guild, elem);
        if(role && rolesFound.indexOf(role) == -1){
            rolesFound.push(role);
        }
    }

    dbUtils.fetchGuild(msg.guild.id, function(err, guildData) {
        if(err) return utils.sendAndDelete(msg.channel, err);
        if(guildData.roles){
            for(var roleID of guildData.roles){
                var role = rolesFound.find((r) => {return r.id == roleID});
                if(role){
                    rolesToRemove.push(role);
                }
            }
        }
        if(rolesToRemove.length < 1) return utils.sendAndDelete(msg.channel, "Nothing to remove!");
        msg.member.removeRoles(rolesToRemove).then((memb) => {
            msg.channel.sendMessage(msg.author.username + " removed successfully!");
        });
    });
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('color', 'User Customization', 'off');
cmd.alias.push("colour")
cmd.addHelp('Sets the color of a user');
cmd.addUsage('<color code>');
cmd.minLvl = levels.DEFAULT;
cmd.execution = function(client, msg, suffix) {

    // @TODO FINISH THIS
    var isOk = true;
    dbUtils.fetchGuild(msg.guild.id, function(err, guildData){
        if(err) return utils.sendAndDelete(msg.channel, err);
        if(guildData){

        }
    })
}
commands.push(cmd);
////////////////////////////////////////////////////////////

module.exports = commands;
