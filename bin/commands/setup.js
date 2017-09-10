var Command = require('../commandTemplate');
var Connection = require('../db/dbConnection');
var levels = require('../../consts/levels.json');
var paramtypes = require('../../consts/paramtypes.json');
var suf = require('../../config.json').suffix;
var utils = require('../utils/utils');
var dbUtils = require('../db/dbUtils');
var dbGuild = require('../db/dbGuild');
var discordUtils = require('../utils/discordUtils');
var logger = require('../utils/logger');
var commands = [];

var cmd;
////////////////////////////////////////////////////////////
cmd = new Command('set', 'Setup');
cmd.alias.push('setup');
cmd.addUsage('<field> ["-r"] <value>');
cmd.minLvl = levels.ADMIN;
cmd.reqDB = true;
cmd.params.push(paramtypes.PARAM);
cmd.execution = function(client, msg, suffix) {

    var db = Connection.getDB();
    var collection = db.collection('guilds');
    var operation;

    //We check which operation the user is trying to execute
    var option = suffix[0].toLowerCase();

    //Remove if "-r" was in the message and set the message to remove
    var remove = false;
    var index = suffix.indexOf("-r");
    if (index > -1) {
        suffix.splice(index, 1);
        remove = true;
    }

    var index = suffix.indexOf("-h");
    if (index > -1) {
        if (operations.hasOwnProperty(option)) {
            return msg.channel.send(`${option}: ${operations[option].help}\n`).catch(e => {
				logger.warn(discordUtils.missingPerms("Send Message", msg.guild));
			});
        } else {
            return msg.channel.send("Error, options are: " + ops.join(", ")).catch(e => {
				logger.warn(discordUtils.missingPerms("Send Message", msg.guild));
			});
        }
    }

    if (operations.hasOwnProperty(option)) {
        operation = operations[option].run(msg, suffix, remove);
    } else {
        var arr = [];
        for (var o in operations) {
            arr.push(o);
        }
        discordUtils.sendAndDelete(msg.channel, "You can't access that field! Fields available are: " + arr.join(", "), 8000);
    }

    if (operation != null) {
        collection.findOneAndUpdate({
                _id: msg.guild.id
            }, operation, {
                returnOriginal: false,
                upsert: true
            },
            function(err, res) {
                if (err) return logger.error(err);
                if (res.ok == 1) {
                    discordUtils.sendAndDelete(msg.channel, suffix[0] + " updated!", 10000);
                } else {
                    discordUtils.sendAndDelete(msg.channel, res);
                }
                msg.delete();
            }
        );
    }
}
////////////////////////////////////////////////////////////

/*
 * This object handles all the options the user can execute to modify the database
 * for the specified guild
 */
var operations = {
    optroles: {
        help: `Adds/Removes a role from the optional roles of the server. Eg: \`set${suf} role nsfw\``,
        run: function(msg, suffix, remove) {
            /*
             * This funciton tries to find the appropiate role and adds it / removes it
             * from the pool of roles available for the user
             */
            var roleName;
            var retObject = {};

            roleName = suffix.splice(1, suffix.length).join(" ");

            var role = discordUtils.getRole(msg.guild, roleName);

            if (!role) {
                discordUtils.sendAndDelete(msg.channel, "No role found for " + roleName + "! Please try again.");
                return null;
            }
            //If the user specified the removal of the role
            if (remove) {
                retObject["$pull"] = {
                    roles: role.id
                };
            } else {
                retObject["$addToSet"] = {
                    roles: role.id
                };
            }
            return retObject;
        },
    },
    limitedcolors: {
        help: `Toggles the limited colors on or off. Eg: \`set${suf} limitedcolors 1\``,
        run: function(msg, suffix) {
            if (suffix.length > 1) {
                return {
                    $set: {
                        limitedcolors: (suffix[1] == true)
                    }
                }
            } else {
                discordUtils.sendAndDelete(msg.channel, "Error, try again.");
                return null;
            }
        },
    },
    whitelisted: {
        help: `Adds a user to the whitelisted list. Eg: \`set${suf} whitelisted USERID\``,
        run: function(msg, suffix, remove) {

            var user = suffix.splice(1, suffix.length).join(" ");

            if (remove) {
                return {
                    $pull: {
                        whitelisted: user
                    }
                }
            } else {
                return {
                    $set: {
                        invites: false
                    },
                    $addToSet: {
                        whitelisted: user
                    }
                }
            }
        },
    },
    allowinvites: {
        help: `Toggles if invite links are allowed or not in the server. Eg: \`set${suf} allowinvites 1\``,
        run: function(msg, suffix, remove) {

            var setting = suffix.splice(1, suffix.length).join(" ");

            return {
                $set: {
                    invites: (setting == true)
                }
            }
        },
    },
    log: {
        help: `Sets the channel the bot will log the warnings to. Eg: \`set${suf} log CHANNELID\``,
        run: function(msg, suffix, remove) {
            var logs = msg.guild.channels.get(suffix[1]);
            if (logs != null) {
                return {
                    $set: {
                        log: logs.id
                    }
                }
            } else {
                discordUtils.sendAndDelete(msg.channel, "Channel with given id not found!");
                return null;
            }
        },
    },
    automember: {
        help: `Toggles if automatic membership. Eg: \`set${suf} automember 1\``,
        run: function(msg, suffix, remove) {

            var setting = suffix.splice(1, suffix.length).join(" ");

            return {
                $set: {
                    automember: (setting == true)
                }
            }
        },
    },
    suggestions: {
        help: `Sets the channel for suggestions (empty for no channel). Eg: \`set${suf} suggestions 207248974451679543\``,
        run: function(msg, suffix) {
            var channelID = suffix[1];
			if(channelID == null || msg.guild.channels.has(channelID)){
				return {
					$set: {
						suggestions: channelID
					}
				}
			} else {
				discordUtils.sendAndDelete(msg.channel, "Channel does not exist");
				return null;
			}
        },
    },
	roles: {
        help: `Sets the default roles for various commands. Eg: \`set${suf} roles warned 207248974451679543\``,
        run: function(msg, suffix, remove) {
			if(suffix.length <= 2) return null;

            var roleName;
            var retObject = {};

			var roleToChange = suffix[1];

			roleToChange = roleToChange.toLowerCase();
			var rolesAllowed = ["warned", "muted", "member", "lurker"];

			if(!rolesAllowed.includes(roleToChange.toLowerCase())){
                discordUtils.sendAndDelete(msg.channel, "You can't assign " + roleToChange + "! Please try again. Available are: warned, muted, member, lurker");
                return null;
			}

            roleName = suffix.splice(2, suffix.length).join(" ");

            var role = discordUtils.getRole(msg.guild, roleName);

            if (!role) {
                discordUtils.sendAndDelete(msg.channel, "No role found for " + roleName + "! Please try again.");
                return null;
            }

            //If the user specified the removal of the role
            if (remove) {
                retObject["$set"] = {};
				retObject["$set"][roleToChange] = null;
            } else {
                retObject["$set"] = {};
				retObject["$set"][roleToChange] = role.id;
            }

            return retObject;
        },
    },
	isolatenewaccounts: {
		help: `Toggles automatic isolation of newly created accounts. Eg: \`set${suf} isolatenewaccounts 1\``,
        run: function(msg, suffix, remove) {

            var setting = suffix.splice(1, suffix.length).join(" ");

			var role = msg.guild.roles.find("name", "New Account");
			if(!role){
                discordUtils.sendAndDelete(msg.channel, 'No "New Account" role created, create it and try again');
				return null;
			}

            return {
                $set: {
                    isolatenewaccounts: (setting == true)
                }
            }
        },
    },
}
var ops = [];
for (var op in operations) {
    ops.push(op);
}
var helpStr = `Sets a parameter for the guild, parameters are: ${ops.join(", ")}. Use -h on any of them for more information`;

cmd.addHelp(helpStr);
commands.push(cmd);
////////////////////////////////////////////////////////////

module.exports = commands;
