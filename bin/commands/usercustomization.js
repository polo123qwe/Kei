const path = require('path');
var Discord = require('discord.js');
var Command = require('../commandTemplate');
var Connection = require('../db/dbConnection');
var levels = require('../../consts/levels.json');
var paramtypes = require('../../consts/paramtypes.json');
var utils = require('../utils/utils');
var dbUtils = require('../db/dbUtils');
var dbGuild = require('../db/dbGuild');
var discordUtils = require('../utils/discordUtils');
var logger = require('../utils/logger');
var suf = require('../../config.json').suffix;
var commands = [];

try {
    var colors = require('../../consts/values.json').colors;
} catch (e) {
    logger.error("Error loading colors");
    colors = [];
}

var cmd;
////////////////////////////////////////////////////////////
cmd = new Command('join', 'User Customization');
cmd.addHelp('Adds the user to the given roles (separated by commas)');
cmd.addUsage('<role1>, [role2], [role3]');
cmd.addExample(`join${suf} lood, food`);
cmd.minLvl = levels.DEFAULT;
cmd.params.push(paramtypes.PARAM);
cmd.execution = function(client, msg, suffix) {
    var rolesFound = [];
    var rolesToAdd = [];
    var displayHelp = false;

    //Roles are sepparated by commas
    var elements = suffix.join(" ").split(/ ?, ?/);
    for (var elem of elements) {
        var role = discordUtils.getRole(msg.guild, elem);
        if (role && rolesFound.indexOf(role) == -1) {
            rolesFound.push(role);
        }
    }

    dbGuild.fetchGuild(msg.guild.id, function(err, guildData) {
        if (err) return discordUtils.sendAndDelete(msg.channel, err);
        if (guildData && guildData.hasOwnProperty('roles')) {
            for (var roleID of guildData.roles) {
                var role = rolesFound.find((r) => {
                    return r.id == roleID;
                });
                if (role) {
                    rolesToAdd.push(role);
                }
            }
            //If no role was found, print out all the possibilities for the user to choose
            if (rolesToAdd.length < 1) {
                var possibleRoles = [];
                for (var roleID of guildData.roles) {
                    var role = msg.guild.roles.find((r) => {
                        return r.id == roleID
                    });
                    if (role) {
                        possibleRoles.push(role.name);
                    }
                }
                return msg.channel.send(`:warning:  |  Error! The role you chose is invalid.\n**Currently available self-assignable roles**: \`\`\`${possibleRoles.join(", ")}\`\`\``, 8000);
            }

			var errorRolesMessage = "";
            for (var currentRole of rolesToAdd) {
                if (msg.member.roles.array().indexOf(currentRole) > -1) {
                    rolesToAdd.splice(rolesToAdd.indexOf(currentRole), 1);
                    errorRolesMessage += ":octagonal_sign:  |  You already have the `" + currentRole.name + "` role!\n";
                }
            }
			if(errorRolesMessage){
				msg.channel.send(errorRolesMessage);
			}

            if (rolesToAdd.length != 0) {
                msg.member.addRoles(rolesToAdd).then((memb) => {
					if(errorRolesMessage){
						msg.channel.send(":white_check_mark:  |  **" + msg.author.username + "** added successfully to other roles!");
					}
                    msg.channel.send(":white_check_mark:  |  **" + msg.author.username + "** added successfully to all the roles requested!");
                }).catch(err => discordUtils.sendAndDelete(msg.channel, ':warning:  |  Bot error! ' + err.response.body.message));
            }
        } else {
            discordUtils.sendAndDelete(msg.channel, ":octogonal_sign:  |  This server has no self-assignable roles!", 4000);
        }
    });
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('leave', 'User Customization');
cmd.addHelp('Removes the user from the given roles');
cmd.addUsage('<role1>, [role2], [role3]');
cmd.addExample(`leave${suf} lood`);
cmd.minLvl = levels.DEFAULT;
cmd.execution = function(client, msg, suffix) {
    var rolesFound = [];
    var rolesToRemove = [];

    //Roles are sepparated by commas
    var elements = suffix.join(" ").split(/ ?, ?/);
    for (var elem of elements) {
        var role = discordUtils.getRole(msg.guild, elem);
        if (role && rolesFound.indexOf(role) == -1) {
            rolesFound.push(role);
        }
    }

    dbGuild.fetchGuild(msg.guild.id, function(err, guildData) {
        if (err) return discordUtils.sendAndDelete(msg.channel, err);
        if (guildData.roles) {
            for (var roleID of guildData.roles) {
                var role = rolesFound.find((r) => {
                    return r.id == roleID
                });
                if (role) {
                    rolesToRemove.push(role);
                }
            }
        }
        if (rolesToRemove.length < 1) return discordUtils.sendAndDelete(msg.channel, ":warning:  |  The roles you entered are either invalid or you are not in them!", 4000);
        msg.member.removeRoles(rolesToRemove).then((memb) => {
            msg.channel.send(":white_check_mark:  |  **" + msg.author.username + "** sucessfully removed from the requested roles!");
        }).catch(err => discordUtils.sendAndDelete(msg.channel, ':warning:  |  Bot error! ' + err.response.body.message));
    });
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('color', 'User Customization', 'on');
cmd.alias.push("colour")
cmd.addHelp('Sets the color of a user');
cmd.addUsage('<color code>');
cmd.addExample(`color${suf} 5`);
cmd.cd = 8;
cmd.minLvl = levels.USER;
cmd.execution = function(client, msg, suffix) {

    var value, index;
    //If its a hex input
    if (/^#?[0-9A-F]{6}$/i.test(suffix[0])) {
        value = suffix[0];
        //We remove the # if it starts with it
        if (value.startsWith("#")) value = value.substr(1, value.length);
    } else if (/^\d{1,2}$/.test(suffix[0])) { //If its a value to get from the index of values
        index = suffix[0];
    }

    dbGuild.fetchGuild(msg.guild.id, function(err, guildData) {
        if (err) return discordUtils.sendAndDelete(msg.channel, err);
        if (guildData != null && guildData.hasOwnProperty('limitedcolors') && guildData.limitedcolors) {
            //Limited colors
            if (suffix[0]) {
                if (index) {
                    if (index > 0 && index <= colors.length) {
                        return setupColor(colors[index - 1]);
                    }
                }
                if (value) {
                    if (colors.includes(value)) {
                        return setupColor(value);
                    }
                }
            }

            var loc = path.join(__dirname, '..', '..', 'consts/colors.png')

			var attachment = new Discord.Attachment(loc, 'colors.png');
			msg.channel.send('Error, the colors available are:', attachment);
            return;

        } else {
            //Not limited
            if (value) {
                return setupColor(value);
            } else {
                msg.channel.send('Write a hexadecimal value! eg: #FFFFFF');
                return;
            }
        }
    });

    //We remove the old colors the user had and apply the new one
    function setupColor(name) {

        removeExistingRoles(() => {
            setRole(name);
        });
    }

    //Function that removes the roles from the user
    function removeExistingRoles(callback) {
        /*
         * We remove the role from the user and check if any other
         * user is also on that role, if not we remove the role itself
         */
        var role = msg.member.roles.find(r => r.name.startsWith("#"));
        //If we don't find more roles to remove, finish the function
        if (!role) {
            return callback();
        }

        msg.member.removeRole(role).then(() => {
            //If role is empty, remove it
            if (role.members.array().length < 1) {
                role.delete().then(() => {
                    return removeExistingRoles(callback);
                }).catch(err => discordUtils.sendAndDelete(msg.channel, ':warning:  |  Bot error! ' + err.response.body.message));
            } else {
                return removeExistingRoles(callback);
            }
        });
    }

    //Function to set the current role
    function setRole(name) {
        // We try to find the role and if we cannot find it we create it
        var role = msg.guild.roles.find(r => {
            return r.name == '#' + name;
        });

        if (!role) {
            var options = {
                name: '#' + name,
                color: parseInt(name, '16'),
                permissions: []
            }
            msg.guild.createRole(options).then((r) => {
                addUser(r);
            }).catch(err => discordUtils.sendAndDelete(msg.channel, ':warning:  |  Bot error! ' + err.response.body.message));
        } else {
            addUser(role);
        }

        function addUser(roleToAdd) {
            msg.member.addRole(roleToAdd).then(() => {
                msg.channel.send(":white_check_mark:  |  **" + msg.author.username + '** successfully added to `#' + name + '`');
            }).catch(err => discordUtils.sendAndDelete(msg.channel, ':warning:  |  Bot error! ' + err.response.body.message));
        }
    }

}
commands.push(cmd);
////////////////////////////////////////////////////////////

module.exports = commands;
