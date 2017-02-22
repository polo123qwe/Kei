var Connection = require('./db/dbConnection');
var db;

var paramtypes = require('../consts/paramtypes.json');
var cooldown = require('./cooldown');

var utils = require('./utils/utils');
var dbUtils = require('./db/dbUtils');
var dbGuild = require('./db/dbGuild');

var discordUtils = require('./utils/discordUtils');

try {
    var levels = require('../consts/levels.json');
} catch (e) {
    //Error loading levels, using default values
    levels = {};
}

module.exports = function(client, msg, suffix, cmd, callback) {
    'use strict'

    db = Connection.getDB();
    if (db) {
        var collection = db.collection('roles');

        dbUtils.getLevel(msg.guild, msg.member, (err, lvl) => {
            if (err) return callback(err);

            if (!cmd.hasOwnProperty('minLvl')) return runChecks();

            //We check if the level of the user is enough to execute the cmd
            if (checkLevel(lvl, cmd.minLvl)) {
                //We check if the channel is disabled

                checkDisabled(msg.guild, msg.channel, lvl, cmd, (msg, isEnabled) => {

                    if (isEnabled) {
                        runChecks();
                    }

                    return callback(msg, false);
                })

            } else {
                //Not enough perms
                return callback('You are not allowed to do that!', false);
            }
        });
    } else {
        runChecks();
    }

    //This function calls all the other checks
    function runChecks() {
        var param = checkParams(client, msg, suffix, cmd);

        if (param == -1) {
            if (msg.guild == null) {
                return callback(null, true);
            } else {
                return callback(null, checkTime(msg, cmd));
            }
        }
        return callback('Incorrect parameters, use help! ' + cmd.name, false);
    }
}



/*
Checks that the message contains the required parameters to run
*/
function checkParams(client, msg, suffix, cmd) {

    if (suffix.length < cmd.params.length) {
        return 0;
    }

    for (var i = 0; i < cmd.params.length; i++) {
        switch (cmd.params[i]) {
            case paramtypes.PARAM:
                if (suffix[i]) {
                    break;
                }
                return i;
            case paramtypes.MENTIONORID:
                if (msg.mentions.users.array().length != 0) {
                    break;
                } else if (msg.guild.members.has(suffix[i])) {
                    break;
                } else {
                    return i;
                }
            case paramtypes.LEVEL:
                if (!utils.isNumber(suffix[i])) {
                    var lvl = paramtypes[suffix[i].toUpperCase()];
                    if (lvl) {
                        suffix[i] = lvl;
                        break;
                    } else {
                        return i;
                    }
                }
            case paramtypes.NUMBER:
                if (!utils.isNumber(suffix[i])) {
                    return i;
                }
                break;
            case paramtypes.USER:
                if (i + 1 >= suffix.length) return i;
                var userName = suffix.splice(i, suffix.length).join(" ");
                var member = msg.guild.members.find((u) => {
                    return u.username.toLowerCase() == userName.toLowerCase() ||
                        u.id == userName
                });
                if (member) {
                    break;
                } else {
                    return i;
                }
            case paramtypes.ROLEID:
                if (msg.guild.roles.has(suffix[i])) {
                    break;
                } else {
                    return i;
                }
            case paramtypes.ROLE:
                if (i + 1 >= suffix.length) return i;
                var roleName = suffix.splice(i, suffix.length).join(" ");
                var role = msg.guild.roles.find((r) => {
                    return r.name.toLowerCase() == roleName.toLowerCase() ||
                        r.id == roleName
                });
                if (role) {
                    break;
                } else {
                    return i;
                }
        }
    }

    return -1;
}

/*
Call the cooldown processor with a given user, server and cmd
*/
function checkTime(msg, cmd) {

    var out = cooldown(msg.author.id, msg.guild.id, cmd);

    if (out) {
        discordUtils.sendAndDelete(msg.channel, out);
        return false;
    } else {
        return true;
    }
}

/*
Compare roles and returns a bool if the user is allowed to execute
*/
function checkLevel(userLvl, cmdlvl) {

    if (cmdlvl === levels.DEFAULT) {
        return true;
    }

    if (cmdlvl === levels.DM) {
        if (userLvl === levels.DM) {
            return true;
        } else {
            //Command is DM only
            return false;
        }
    }

    if (userLvl < cmdlvl) {
        return false;
    } else {
        return true;
    }
}

/*
Check if the cmd is disabled in the specific channel or dms
*/
function checkDisabled(guild, channel, userLvl, cmd, callback) {

    if (cmd.dm == false && guild == null) {
        return callback("Cannot execute that command in a DM!", false);
    }
    dbGuild.fetchChannel(channel.id, function(err, channelData) {
        if (err) {
            console.log(err);
        }

        if (channelData == null) {
            return callback(null, true);
        }

        var disabledCats = channelData.disabled;

        //If the module is disabled
        if (userLvl >= levels.MODERATOR) {
            return callback(null, true);
        } else {
            if (disabledCats != null && disabledCats.includes(cmd.category.toLowerCase())) {
                return callback("Module disabled in this channel!", false);
            } else {
                return callback(null, true);
            }
        }
    });
}
