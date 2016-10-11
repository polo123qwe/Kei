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
cmd = new Command('colorsetup'); //UNTESTED
cmd.addHelp('Sets up color roles for the server');
cmd.minLvl = levels.ADMIN;
cmd.execution = function(client, msg, suffix) {
    var guild = msg.guild;
    var user = msg.author;
    var counterA = 0,
        counterB = 0;

    var colorRoles = [];

    guild.roles.array().foreach((r) => {
        if (r.name.startsWith("#") && role.name.length == 7) {
            colorRoles.push(role);
        }
    });

    msg.channel.sendMessage("Starting role creation/update...").then(updmsg => {
        //Check roles we have to delete

        //Add the roles needed
        processColor(0, colors, updmsg);
    });

    function processColor(i, arr, updmsg) {
        if (i >= arr.length) {
            updmsg.edit(counterA + " roles created! Deleting roles...").then((m) => {
                setTimeout(() => {
                    deleteColors(0, colorRoles, updmsg);
                }, 1000)
            }).catch(e => console.log(e));
        } else {
            for (var role of guild.roles) {
                if (role.name == arr[i]) {
                    return processColor(i + 1, arr, updmsg);
                }
            }
            setTimeout(() => {
                var newRoleName = arr[i];
                var opts = {
                    name: newRoleName,
                    color: arr[i].substr(1, arr[i].length),
                    permissions: 0
                }
                guild.createRole(opts).then(role => {
                    updmsg.edit(newRoleName + " created successfully! " + counterA + " roles created.");
                    counterA++;
                    processColor(i + 1, arr, updmsg);
                }).catch(err => console.log("Failed to create role: ", err));
            }, 1000);
        }
    }

    function deleteColors(i, arr, updmsg) {
        if (i >= arr.length) {
            updmsg.edit("Finished! " + counterB + " roles deleted.").then((m) => {
                setTimeout(() => m.delete(), 3000)
            });
        } else {
            setTimeout(() => {
                arr[i].delete().then(() => {
                    counterB++;
                    updmsg.edit(counterB + " roles deleted.");
                    deleteColors(i + 1, arr, updmsg);
                }).catch(err => console.log("Failed to remove role: ", err));
            }, 1000);
        }
    }
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('addrole');
cmd.addHelp('Adds/Removes a role to the opt roles');
cmd.addUsage('["remove"] <role name>');
cmd.minLvl = levels.ADMIN;
cmd.reqDB = true;
cmd.params.push(paramtypes.PARAM);
cmd.execution = function(client, msg, suffix) {
    var roleName = suffix.join(" ");
    var remove = false;
    if(suffix.length > 1 && suffix[0] == "remove"){
        roleName = suffix.splice(1, suffix.length).join(" ");
        remove = true;
    }

    var role = discordUtils.getRole(msg.guild, roleName);

    if (!role) {
        utils.sendAndDelete(msg.channel, "No role found for " + roleName + "! Please try again.");
        return;
    }

    var db = Connection.getDB();
    var collection = db.collection('guilds');

    //If the user specified the removal of the role
    var enabledmsg = "";
    if(remove){
        enabledmsg = "removed!";
        operation = {
            $pull: {
                roles: role.id
            }
        }
    } else {
        enabledmsg = "added!";
        operation = {
            $push: {
                roles: role.id
            }
        }
    }

    collection.findOneAndUpdate({
            _id: msg.guild.id
        }, operation, {
            returnOriginal: false,
            upsert: true
        },
        function(err, res) {
            if (err) return console.log(err);
            if (res.ok == 1) {
                utils.sendAndDelete(msg.channel, "Role " + role.name + " successfully " + enabledmsg, 10000);
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
