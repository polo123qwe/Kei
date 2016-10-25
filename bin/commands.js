var directory = require('require-directory');
var Command = require('./commandTemplate');
var allCmds = directory(module, './commands/');

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
            helpCmds[command.category][command.name] = command.name;

            for (var alias of command.alias) {
                commands[command.alias] = command;
            }

            //Adding alias (if any) to the help string
            if (command.alias.length != 0) {
                helpCmds[command.category][command.name] += " (" + command.alias.join("|") + ")";
            }
            helpCmds[command.category][command.name] += ":";

            //We add the helpa and the usage to the command
            if (command.hasOwnProperty("help")) {
                helpCmds[command.category][command.name] += " " + command.help + ".";
            }
            if (command.hasOwnProperty("usage")) {
                helpCmds[command.category][command.name] += " " + command.usage;
            }
            helpCmds[command.category][command.name] += " (" + command.minLvl + ")";
        }
    }
}

var cmd;
///////////////////////// HELP /////////////////////////////
cmd = new Command('help', 'Core', 'on');
cmd.category = 'Core';
cmd.addHelp('Returns all commands available.');
cmd.addUsage('[command]');
cmd.cd = 5;
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
        var helpString = "Commands the bot is able to execute sorted by category\n\n";

        for (var categ in helpCmds) {

            helpString += "**" + categ + "**\n";
            for (var cmd in helpCmds[categ]) {
                helpString += "\t⇾ " + helpCmds[categ][cmd] + "\n";
            }
        }
        //Print the help
        msg.author.sendMessage(helpString);
    }
}
commands[cmd.name] = cmd
count++;

console.log("Loaded " + count + " commands!");
////////////////////////////////////////////////////////////
module.exports = commands;
