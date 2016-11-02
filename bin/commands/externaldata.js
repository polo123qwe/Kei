var Command = require('../commandTemplate');
var Connection = require('../dbConnection');
var levels = require('../../consts/levels.json');
var paramtypes = require('../../consts/paramtypes.json');
var utils = require('../utils');
var discordUtils = require('../discordUtils');
var dbUtils = require('../dbUtils');
var commands = [];

try {
    var api_key = require("../../config.json").apis.osu;
} catch (e) {
    api_key = "";
}
var osuapi = require('osu-api');

var cmd;
////////////////////////////////////////////////////////////
cmd = new Command('urban', 'External Data');
cmd.addHelp('Returns the urban dictionary definition of the word');
cmd.addUsage('<word(s)>')
cmd.dm = true;
cmd.cd = 5;
cmd.minLvl = levels.DEFAULT;
cmd.params.push(paramtypes.PARAM);
cmd.execution = function(client, msg, suffix) {

    var result = suffix.join("+");
    msg.channel.sendMessage("http://www.urbandictionary.com/define.php?term=" + result);
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('osu', 'External Data');
cmd.addHelp('Returns the osu of the given username');
cmd.addUsage('<username> ["-taiko"/"-mania"/"-ctb"/"-standard"]')
cmd.dm = true;
cmd.cd = 5;
cmd.minLvl = levels.DEFAULT;
cmd.params.push(paramtypes.PARAM);
cmd.execution = function(client, msg, suffix) {

    var mode;
    var option = "standard";

    var index = suffix.findIndex(p => {
        return p.startsWith("-");
    });

    if (index > -1) {
        //We remove the - from the option
        option = suffix.splice(index, 1)[0].substr(1, option.length);
    }

    var username = suffix.join(" ");

    if (modes.hasOwnProperty(option)) {
        mode = modes[option];
    } else {
        //if the input is not correct we default at standard
        option = "standard";
        mode = modes.standard
    }

    var osu_a = new osuapi.Api(api_key, mode);

    osu_a.getUser(username, function(err, out) {
        if (err != null) {
            console.log("Error " + err);
        }
        if (out == null) out = "No user found";
        else out = stringify(out);
        msg.channel.sendMessage(out);
    });

    function stringify(out) {
        var str = `[${option}] User ${out.username} is rank #${out.pp_rank} (${out.pp_raw}) has ${(Math.round(out.accuracy * 100) / 100)}% accuracy. For more information: \n <https://osu.ppy.sh/u/${out.user_id}>`;
        return str;
    }
}

var modes = {
    standard: osuapi.Modes.osu,
    ctb: osuapi.Modes.CtB,
    mania: osuapi.Modes.osumania,
    taiko: osuapi.Modes.taiko,
}

commands.push(cmd);
////////////////////////////////////////////////////////////

module.exports = commands;
