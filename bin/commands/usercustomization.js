const path = require('path');
var Command = require('../commandTemplate');
var Connection = require('../dbConnection');
var levels = require('../../consts/levels.json');
var paramtypes = require('../../consts/paramtypes.json');
var utils = require('../utils');
var dbUtils = require('../dbUtils');
var discordUtils = require('../discordUtils');
var commands = [];

try {
    var colors = require('../../consts/values.json').colors;
} catch (e) {
    console.log("Error loading colors");
    colors = [];
}

var cmd;
////////////////////////////////////////////////////////////
cmd = new Command('join', 'User Customization');
cmd.addHelp('Adds the user to the given roles (separated by commas)');
cmd.addUsage('<role1>, [role2], [role3]');
cmd.minLvl = levels.DEFAULT;
cmd.execution = function(client, msg, suffix) {
    var rolesFound = [];
    var rolesToAdd = [];

    //Roles are sepparated by commas
    var elements = suffix.join(" ").split(/ ?, ?/);
    for (var elem of elements) {
        var role = discordUtils.getRole(msg.guild, elem);
        if (role && rolesFound.indexOf(role) == -1) {
            rolesFound.push(role);
        }
    }

    dbUtils.fetchGuild(msg.guild.id, function(err, guildData) {
        if (err) return utils.sendAndDelete(msg.channel, err);
        if (guildData.hasOwnProperty('roles')) {
            for (var roleID of guildData.roles) {
                var role = rolesFound.find((r) => {
                    return r.id == roleID
                });
                if (role) {
                    rolesToAdd.push(role);
                }
            }
            //If no role was found, print out all the possibilities for the user to choose
            if (rolesToAdd.length < 1) {
                var out = "Error, choose one of the following: ";
                var possibleRoles = [];
                for (var roleID of guildData.roles) {
                    var role = msg.guild.roles.find((r) => {
                        return r.id == roleID
                    });
                    if (role) {
                        possibleRoles.push(role.name);
                    }
                }
                out += possibleRoles.join(", ");
                return utils.sendAndDelete(msg.channel, out);
            }
            msg.member.addRoles(rolesToAdd).then((memb) => {
                msg.channel.sendMessage(msg.author.username + " added successfully!");
            }).catch(err => utils.sendAndDelete(msg.channel, ':warning: Bot error! ' + err.response.body.message));
        } else {
            utils.sendAndDelete(msg.channel, "This guild has no optional roles!", 2000);
        }
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
    for (var elem of elements) {
        var role = discordUtils.getRole(msg.guild, elem);
        if (role && rolesFound.indexOf(role) == -1) {
            rolesFound.push(role);
        }
    }

    dbUtils.fetchGuild(msg.guild.id, function(err, guildData) {
        if (err) return utils.sendAndDelete(msg.channel, err);
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
        if (rolesToRemove.length < 1) return utils.sendAndDelete(msg.channel, "Nothing to remove!");
        msg.member.removeRoles(rolesToRemove).then((memb) => {
            msg.channel.sendMessage(msg.author.username + " removed successfully!");
        }).catch(err => utils.sendAndDelete(msg.channel, ':warning: Bot error! ' + err.response.body.message));
    });
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('color', 'User Customization', 'on');
cmd.alias.push("colour")
cmd.addHelp('Sets the color of a user');
cmd.addUsage('<color code>');
cmd.cd = 10;
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

    dbUtils.fetchGuild(msg.guild.id, function(err, guildData) {
        if (err) return utils.sendAndDelete(msg.channel, err);
        if (guildData.hasOwnProperty('limitedcolors') && guildData.limitedcolors) {
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

            msg.channel.sendFile(loc,'colors.png', 'Error, the colors available are:');
            return;

        } else {
            //Not limited
            if (value) {
                return setupColor(value);
            } else {
                msg.channel.sendMessage('Write a hexadecimal value! eg: #FFFFFF');
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
                }).catch(err => utils.sendAndDelete(msg.channel, ':warning: Bot error! ' + err.response.body.message));
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
                permissions: 0
            }
            msg.guild.createRole(options).then((r) => {
                addUser(r);
            }).catch(err => utils.sendAndDelete(msg.channel, ':warning: Bot error! ' + err.response.body.message));
        } else {
            addUser(role);
        }

        function addUser(roleToAdd) {
            msg.member.addRole(roleToAdd).then(() => {
                msg.channel.sendMessage(msg.author.username + ' successfully added to #' + name);
            }).catch(err => utils.sendAndDelete(msg.channel, ':warning: Bot error! ' + err.response.body.message));
        }
    }

}
commands.push(cmd);
////////////////////////////////////////////////////////////

module.exports = commands;
