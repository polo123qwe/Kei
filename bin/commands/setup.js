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
cmd = new Command('set', 'Setup');
cmd.alias.push('setup');
cmd.addHelp('Sets a parameter for the guild');
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

    if (operations.hasOwnProperty(option)) {
        operation = operations[option](msg, suffix, remove);
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
                if (err) return console.log(err);
                if (res.ok == 1) {
                    discordUtils.sendAndDelete(msg.channel, suffix[0] + " updated!", 10000);
                } else {
                    console.log(res);
                    discordUtils.sendAndDelete(msg.channel, res);
                }
                msg.delete();
            }
        );
    }
}
commands.push(cmd);
////////////////////////////////////////////////////////////

/*
 * This object handles all the options the user can execute to modify the database
 * for the specified guild
 */
var operations = {
        role: function(msg, suffix, remove) {
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
        limitedcolors: function(msg, suffix) {
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
        topicchannel: function(msg, suffix) {
            if (suffix.length < 2) return null;

            if (msg.guild.channels.exists('id', suffix[1])) {
                return {
                    $set: {
                        topicchannel: suffix[1]
                    }
                }
            } else {
                discordUtils.sendAndDelete(msg.channel, "Error, try again.");
                return null;
            }
        },
        whitelisted: function(msg, suffix, remove) {

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
        allowinvites: function(msg, suffix, remove) {

            var setting = suffix.splice(1, suffix.length).join(" ");

            return {
                $set: {
                    invites: (setting == true)
                }
            }
        },
        greeting: function(msg, suffix, remove) {

            if (remove) {
                return {
                    $set: {
                        greeting: null
                    }
                }
            } else {
                return {
                    $set: {
                        greeting: suffix.splice(1, suffix.length).join(" ")
                    }
                }
            }
        },
        goodbye: function(msg, suffix, remove) {

            if (remove) {
                return {
                    $set: {
                        goodbye: null
                    }
                }
            } else {
                return {
                    $set: {
                        goodbye: suffix.splice(1, suffix.length).join(" ")
                    }
                }
            }
        },
    }
    ////////////////////////////////////////////////////////////

module.exports = commands;
