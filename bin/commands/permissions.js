var Command = require('../commandTemplate');
var Connection = require('../dbConnection');
var levels = require('../../consts/levels.json');
var paramtypes = require('../../consts/paramtypes.json');
var owners = require('../../config.json').owners;
var checks = require('../checks');
var utils = require('../utils');
var dbUtils = require('../dbUtils');
var commands = [];

var cmd;
////////////////////////////////////////////////////////////
cmd = new Command('setlvl', 'Permissions');
cmd.addHelp('Sets the level for a role');
cmd.addUsage('<level> <role name/role id>');
cmd.minLvl = levels.MODERATOR;
cmd.reqDB = true;
cmd.params.push(paramtypes.LEVEL);
//cmd.params.push(paramtypes.CHANNEL);
cmd.execution = function(client, msg, suffix) {

    //var roleName = suffix.slice(0, suffix.length - 1).join(" ");
    var lvl = suffix[0];
    var roleName = suffix.splice(1, suffix.length).join(" ");

    var role = msg.guild.roles.find((r) => {
        return r.name.toLowerCase() == roleName.toLowerCase() ||
            r.id == roleName
    });

    if (!role) {
        utils.sendAndDelete(msg.channel, "No role found for " + roleName + "! Please try again.");
        return;
    }

    var db = Connection.getDB();
    var collection = db.collection('roles');

    dbUtils.getLevel(msg.guild, msg.member, function(err, userLevel) {
        if (err) return console.log(err);

        //Check the conditions to allow the user to execute the command
        if (userLevel == null && msg.author.id != msg.guild.ownerID) {
            return utils.sendAndDelete(msg.channel, "You have no level!");

        } else if (msg.author.id != msg.guild.ownerID && (parseInt(userLevel, 10) - 1) < parseInt(lvl, 10)) {
            //If its not owner and it has less permissions
            return utils.sendAndDelete(msg.channel,
                "You cannot assign a higher role than your own! " + userLevel + " (yours), " + lvl + " (target)", 8000);

        }
        collection.findOne({
            _id: role.id
        }, function(err, roleLevel) {
            if (err) return console.log(err);

            if (!owners.includes(msg.author.id)) {
                //If the role has a previous role greater than the one the user wants to set
                if (roleLevel != null && roleLevel.level && parseInt(lvl, 10) < parseInt(roleLevel.level)) {
                    utils.sendAndDelete(msg.channel,
                        "You cannot edit a role with higher rank than yours! " + userLevel + " (yours), " + roleLevel.level + " (role level)", 8000);
                    return;
                }
            }
            collection.findOneAndUpdate({
                    _id: role.id,
                    "guild_id": msg.guild.id,
                }, {
                    $set: {
                        "level": lvl
                    }
                }, {
                    returnOriginal: false,
                    upsert: true
                },
                function(err, res) {
                    if (err) return console.log(err);
                    if (res.ok == 1) {
                        msg.channel.sendMessage("Role " + role.name + " updated with level " + lvl);
                    } else {
                        console.log(res);
                        utils.sendAndDelete(msg.channel, res)
                    }
                }
            );
        });
    });
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('levels', 'Permissions');
cmd.addHelp('Prints current list of roles and their level');
cmd.minLvl = levels.DEFAULT;
cmd.reqDB = true;
cmd.execution = function(client, msg, suffix) {

    //var roleName = suffix.slice(0, suffix.length - 1).join(" ");
    var lvl = suffix[0];
    var roleName = suffix.splice(1, suffix.length).join(" ");

    var db = Connection.getDB();
    var collection = db.collection('roles');

    collection.find({
        'guild_id': msg.guild.id
    }, function(err, cur) {
        if (err) return callback(err);

        //We convert to array so we can iterate easily over it
        cur.sort({
            'level': 1
        }).toArray().then((arr) => {
            var out = "";
            for (var rol of arr) {
                var role = msg.guild.roles.find("id", rol._id);
                if (role) {
                    out += role.name;
                    out += " has level access " + rol.level + "\n";
                } else {
                    collection.findOneAndDelete({
                        _id: rol._id
                    });
                }
            }
            if (!out) {
                out = "No roles are set up!";
            }
            msg.channel.sendCode('md', out);
        });
    });
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('toggle', 'Permissions');
cmd.addHelp('toggles a module on or off');
cmd.addUsage('<boolean> <module>');
cmd.minLvl = levels.MODERATOR;
cmd.reqDB = true;
cmd.execution = function(client, msg, suffix) {

    var bool = suffix[0];
    var modl = suffix.splice(1, suffix.length).join(" ");

    var operation;
    var enabledmsg = "";

    if (!modl) return utils.sendAndDelete(msg.channel, "Specify a module!");
    var notAllowed = ["debugging", "core"];
    if (notAllowed.includes(modl)) return utils.sendAndDelete(msg, channel, "You cannout disable that!")

    var db = Connection.getDB();
    var collection = db.collection('channels');

    if (bool == true) {
        enabledmsg = "enabled";
        operation = {
            $pull: {
                disabled: modl.toLowerCase()
            }
        }
    } else {
        enabledmsg = "disabled";
        operation = {
            $addToSet: {
                disabled: modl.toLowerCase()
            }
        }
    }

    collection.findOneAndUpdate({
            _id: msg.channel.id
        }, operation, {
            returnOriginal: false,
            upsert: true
        },
        function(err, res) {
            if (err) return console.log(err);
            if (res.ok == 1) {
                utils.sendAndDelete(msg.channel, "Module " + modl + " successfully " + enabledmsg + ".", 10000);
            } else {
                console.log(res);
                utils.sendAndDelete(msg.channel, res)
            }
        }
    );

}
commands.push(cmd);
////////////////////////////////////////////////////////////

module.exports = commands;
