var directory = require('require-directory');
var Command = require('./commandTemplate');
var allCmds = directory(module, './commands/');

var commands = {};

var count = 0;

for (var cmds in allCmds) {
    for (var cmd in allCmds[cmds]) {
        count++;
        var command = allCmds[cmds][cmd];
        if(command instanceof Command){
            commands[command.name] = command;
            for(var alias of command.alias){
                commands[command.alias] = command;
            }
        }
    }
}

var cmd;
///////////////////////// HELP /////////////////////////////
cmd = new Command('help');
cmd.category = 'Core';
cmd.addHelp('Returns all commands available.');
cmd.addUsage('[command]');
cmd.cd = 5;
cmd.execution = function(client, msg, suffix) {
    var out = "The commands currently available are: ";
    for(var name in commands){
        if(commands[name].hasOwnProperty("help")){

        }
        if(commands[name].hasOwnProperty("usage")){

        }
        //commands[name].minLvl;
    }
    //Print the help
}
commands[cmd.name] = cmd
count++;

console.log("Loaded " + count + " commands!");
////////////////////////////////////////////////////////////
module.exports = commands;
