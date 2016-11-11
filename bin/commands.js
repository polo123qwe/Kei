var directory = require('require-directory');
var Command = require('./commandTemplate');
var utils = require('./utils');
var discordUtils = require('./discordUtils');
var allCmds = directory(module, './commands/');
var suf = require('../config.json').suffix;

var commands = {};

var count = 0;

var helpCmds = {};

for (var cmds in allCmds) {

    for (var cmd in allCmds[cmds]) {
        count++;
        var command = allCmds[cmds][cmd];

        if (command instanceof Command) {

            commands[command.name] = command;

            //We store the help strings by the category they belong to
            if (!helpCmds.hasOwnProperty(command.category)) {
                helpCmds[command.category] = {};
            }
            helpCmds[command.category][command.name] = `${command.name}`;

            for (var alias of command.alias) {
                commands[command.alias] = command;
            }

            //Adding alias (if any) to the help string
            if (command.alias.length != 0) {
                helpCmds[command.category][command.name] += ` (${command.alias.join("|")})`;
            }
            
            helpCmds[command.category][command.name] += `${suf}`;

            if (command.hasOwnProperty("usage")) {
                helpCmds[command.category][command.name] += " " + command.usage;
            }

            helpCmds[command.category][command.name] += ":";

            //We add the helpa and the usage to the command
            if (command.hasOwnProperty("help")) {
                helpCmds[command.category][command.name] += " " + command.help + ".";
            }
            helpCmds[command.category][command.name] += " (" + command.minLvl + ")";

            if (command.hasOwnProperty("example")) {
                helpCmds[command.category][command.name] += "Eg: `" + command.example + "`";
            }
        }
    }
}

var cmd;
///////////////////////// HELP /////////////////////////////
cmd = new Command('help', 'Core');
cmd.category = 'Core';
cmd.addHelp('Returns all commands available.');
cmd.addUsage('[command]');
cmd.cd = 5;
cmd.dm = true;
cmd.execution = function(client, msg, suffix) {

    var command = suffix[0];

    //if user wants help from a specific command or to get all the help
    if (command) {
        if (commands.hasOwnProperty(suffix[0])) {
            msg.channel.sendMessage(helpCmds[commands[command].category][commands[command].name]);
        } else {
            utils.sendAndDelete(msg.channel, "That command does not exist!", 8000);
        }
    } else {
        //To avoid max chars we use an array and check the length of the message
        var sendStrings = [];
        var helpString = "Commands the bot is able to execute sorted by category. \n"+
        "The number at the end represents the level required to run the command, to know"+
        " your current level use the command mylevel\n\n";

        for (var categ in helpCmds) {
            var categHelp = "**" + categ + "**\n";
            for (var cmd in helpCmds[categ]) {
                categHelp += "\t> " + helpCmds[categ][cmd] + "\n";
            }

            if(helpString.length + categHelp.length > 1800){
                sendStrings.push(helpString);
                helpString = categHelp;
            } else {
                helpString += categHelp;
            }
        }
        sendStrings.push(helpString);

        for(var str of sendStrings){
            //Print the help
            msg.author.sendMessage(str);
        }
    }
}
commands[cmd.name] = cmd
count++;

console.log("Loaded " + count + " commands!");
////////////////////////////////////////////////////////////
module.exports = commands;
