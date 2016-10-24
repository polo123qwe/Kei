var Command = require('../commandTemplate');
var Connection = require('../dbConnection');
var levels = require('../../consts/levels.json');
var paramtypes = require('../../consts/paramtypes.json');
var utils = require('../utils');
var discordUtils = require('../discordUtils');
var dbUtils = require('../dbUtils');
var commands = [];

var cmd;
////////////////////////////////////////////////////////////
cmd = new Command('urban', 'External Data');
cmd.addHelp('Returns the urban dictionary definition of the word');
cmd.addUsage('<word(s)>')
cmd.minLvl = levels.DEFAULT;
cmd.cd = 5;
cmd.params.push(paramtypes.PARAM);
cmd.execution = function(client, msg, suffix) {

    if(suffix.length < 1){
        utils.sendAndDelete(msg.channel, 'Add a search field')
    }  else {
        var result = suffix.join("+");
        msg.channel.sendMessage("http://www.urbandictionary.com/define.php?term=" + result);
    }
}
commands.push(cmd);
////////////////////////////////////////////////////////////

module.exports = commands;
