const path = require('path');
var Discord = require('discord.js');
var Command = require('../commandTemplate');
var Connection = require('../db/dbConnection');
var levels = require('../../consts/levels.json');
var paramtypes = require('../../consts/paramtypes.json');
var utils = require('../utils/utils');
var dbUtils = require('../db/dbUtils');
var dbGuild = require('../db/dbGuild');
var dbUsers = require('../db/dbUsers');
var discordUtils = require('../utils/discordUtils');
var logger = require('../utils/logger');
var suf = require('../../config.json').suffix;
var commands = [];

//Date Parsing Regex
const dateRegex = /^(?:(?:31(\/|-|\.)(?:0?[13578]|1[02]))\1|(?:(?:29|30)(\/|-|\.)(?:0?[1,3-9]|1[0-2])\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(\/|-|\.)0?2\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:0?[1-9]|1\d|2[0-8])(\/|-|\.)(?:(?:0?[1-9])|(?:1[0-2]))\4(?:(?:1[6-9]|[2-9]\d)?\d{2})$/;


try {
    var colors = require('../../consts/values.json').colors;
} catch (e) {
    logger.error("Error loading colors");
    colors = [];
}

var cmd;
////////////////////////////////////////////////////////////
cmd = new Command('join', 'User Customization');
cmd.addHelp('Adds the user to the given roles (separated by commas, you can use `all` to join all the roles)');
cmd.addUsage('<role1>, [role2], [role3]');
cmd.addExample(`join${suf} lood, food`);
cmd.minLvl = levels.DEFAULT;
cmd.params.push(paramtypes.PARAM);
cmd.execution = function(client, msg, suffix) {
    var rolesFound = [];
    var rolesWantToAdd = [];
	var rolesToAdd = [];
    var displayHelp = false;
    var addAll = false;

    //Roles are sepparated by commas
    var elements = suffix.join(" ").split(/ ?, ?/);
    if (elements.indexOf("all") != -1) {
        addAll = true;
    } else {
        for (var elem of elements) {
            var role = discordUtils.getRole(msg.guild, elem);
            if (role && rolesFound.indexOf(role) == -1) {
                rolesFound.push(role);
            }
        }
    }

    dbGuild.fetchGuild(msg.guild.id, function(err, guildData) {
        if (err) return discordUtils.sendAndDelete(msg.channel, err);
        if (guildData && guildData.hasOwnProperty('roles')) {
            if (addAll) {
                for (var roleID of guildData.roles) {
                    var role = discordUtils.getRole(msg.guild, roleID);
                    if (role) {
                        rolesWantToAdd.push(role);
                    }
                }
            } else {
                for (var roleID of guildData.roles) {
                    var role = rolesFound.get((r) => {
                        return r.id == roleID;
                    });
                    if (role) {
                        rolesWantToAdd.push(role);
                    }
                }
            }

            //If no role was found, print out all the possibilities for the user to choose
            if (rolesWantToAdd.length < 1) {
                var possibleRoles = [];
                for (var roleID of guildData.roles) {
                    var role = msg.guild.roles.get(r.id);
                    if (role) {
                        possibleRoles.push(role.name);
                    }
                }
                return msg.channel.send(`:warning:  |  Error! The role you chose is invalid.\n**Currently available self-assignable roles**: \`\`\`${possibleRoles.join(", ")}\`\`\``, 8000).catch((e) => {
                    logger.warn(discordUtils.missingPerms("Send Message", member.guild, member));
                });
            }

            var errorRolesMessage = "";
			var allUserRoles = msg.member.roles.array();
            for (var currentRole of rolesWantToAdd) {
                if (allUserRoles.indexOf(currentRole) > -1) {
                    errorRolesMessage += ":octagonal_sign:  |  You already have the `" + currentRole.name + "` role!\n";
                } else {
					rolesToAdd.push(currentRole);
				}
            }
            if (errorRolesMessage) {
                msg.channel.send(errorRolesMessage).catch((e) => {
                    logger.warn(discordUtils.missingPerms("Send Message", member.guild, member));
                });
            }

            if (rolesToAdd.length != 0) {
                msg.member.addRoles(rolesToAdd).then((memb) => {
                    if (errorRolesMessage) {
                        msg.channel.send(":white_check_mark:  |  **" + msg.author.username + "** added successfully to other roles!").catch((e) => {
                            logger.warn(discordUtils.missingPerms("Send Message", member.guild, member));
                        });
                    } else {
                        msg.channel.send(":white_check_mark:  |  **" + msg.author.username + "** added successfully to all the roles requested!").catch((e) => {
                            logger.warn(discordUtils.missingPerms("Send Message", member.guild, member));
                        });
                    }
                }).catch((e) => {
                    logger.warn(discordUtils.missingPerms("Add Role", msg.member.guild, msg.member));
                    discordUtils.sendAndDelete(msg.channel, ':warning:  |  Bot error! ');
                });

            }
        } else {
            discordUtils.sendAndDelete(msg.channel, ":octogonal_sign:  |  This server has no self-assignable roles!", 4000);
        }
    });
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('leave', 'User Customization');
cmd.addHelp('Removes the user from the given roles (use `all` to be removed from every opt role)');
cmd.addUsage('<role1>, [role2], [role3]');
cmd.addExample(`leave${suf} lood`);
cmd.minLvl = levels.DEFAULT;
cmd.params.push(paramtypes.PARAM);
cmd.execution = function(client, msg, suffix) {
    var rolesFound = [];
    var rolesToRemove = [];
    var removeAll = false;

    //Roles are sepparated by commas
    var elements = suffix.join(" ").split(/ ?, ?/);
    if (elements.indexOf("all") != -1) {
        removeAll = true;
    } else {
        for (var elem of elements) {
            var role = discordUtils.getRole(msg.guild, elem);
            if (role && rolesFound.indexOf(role) == -1) {
                rolesFound.push(role);
            }
        }
    }

    dbGuild.fetchGuild(msg.guild.id, function(err, guildData) {
        if (err) return discordUtils.sendAndDelete(msg.channel, err);
        if (guildData.roles) {
            if (removeAll) {
                for (var roleID of guildData.roles) {
                    var role = discordUtils.getRole(msg.guild, roleID);
                    if (role) {
                        rolesToRemove.push(role);
                    }
                }
            } else {
                for (var roleID of guildData.roles) {
                    var role = rolesFound.find((r) => {
                        return r.id == roleID
                    });
                    if (role) {
                        rolesToRemove.push(role);
                    }
                }
            }
        }
        if (rolesToRemove.length < 1) {
            return discordUtils.sendAndDelete(msg.channel, ":warning:  |  The roles you entered are either invalid or you are not in them!", 4000);
        }
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
cmd = new Command('bday', 'User Customization');
cmd.alias.push("birthday");
cmd.addHelp('Sets the birthday of a user');
cmd.addUsage('DD-MM-YYYY');
cmd.addExample(`bday${suf} 01-01-2000`);
cmd.cd = 10;
cmd.minLvl = levels.DEFAULT;
cmd.reqDB = true;
cmd.execution = function(client, msg, suffix) {

    if (!suffix) {
        dbUsers.fetchUser(msg.author.id, (err, userData) => {
            if (err) logger.warn(err);

			if (userData && userData.hasOwnProperty("bday")) {
				msg.channel.send("Your birthday is currently set up as: " + userData.bday.join("/"));
			} else {
				msg.channel.send("You havent set up your bday!");
			}


        });
    } else {
        var toParse = suffix.join(" ").split(/ ?[-\.\/] ?/);
		//Check if it has more than 3 parameters and if the date is a valid date
        if (toParse.length == 3 && dateRegex.test(toParse.join("/"))) {
			if(toParse[2] > (new Date()).getFullYear() - 5){
				discordUtils.sendAndDelete(msg.channel, "Error, you are not from the future!");
			} else {
				dbUsers.updateValue(msg.author.id, "bday", toParse, () => {
					discordUtils.sendAndDelete(msg.channel, "Date added successfully");
				});
			}
        } else {
            discordUtils.sendAndDelete(msg.channel, "Error, bad format! Please use DD/MM/YYYY eg `01/01/1990`");
        }
    }

}
commands.push(cmd);
////////////////////////////////////////////////////////////



module.exports = commands;
