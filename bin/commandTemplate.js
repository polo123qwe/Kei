/*
Command class which is going to be used to generate all the commands
*/
var Command;

var levels = require('../consts/levels.json');
var checks = require('./checks');
var utils = require('./utils/utils');
var discordUtils = require('./utils/discordUtils');
var owners = require('../config.json').owners;
var Connection = require('./db/dbConnection');

function Command(name, cat, mode) {

    if (typeof name === 'string') {
        this.name = name;
    }

    if (typeof cat === 'string') {
        this.category = cat;
    } else {
        this.category = 'default';
    }

    if (typeof mode === 'string') {
        if (mode == 'dev' || mode == 'off') {
            this.mode = mode;
        } else {
            this.mode = 'on';
        }
    } else {
        this.mode = 'on';
    }

    //We set the defualt values
    this.minLvl = levels.DEFAULT;
    this.reqDB = false;
    this.del = false;
    this.cd = 0;
    this.dm = false;

    this.run = function(client, msg, suffix) {

        //If command is set to off, it will not excecute
        if (this.mode == 'off') return;
        //Dev mode can only be excecuted my bot owner
        if (this.mode == 'dev' && !owners.includes(msg.author.id)) return;

        this.check(client, msg, suffix, (err, res) => {
            if (err) return discordUtils.sendAndDelete(msg.channel, err);
            if (!res) return;
            if (this.reqDB && Connection.getDB() == null) {
                discordUtils.sendAndDelete(msg.channel, "Database not connected, can't run this command");
            } else {
                this.execution(client, msg, suffix);
                if (this.del) {
                    msg.delete();
                }
            }
        });
    };
    this.check = function(client, msg, suffix, callback) {
        checks(client, msg, suffix, this, (err, canRun) => {
            if (err) return callback(err);
            if (this.customCheck) {
                return this.customCheck(client, msg, function(err, canRun2) {
                    return callback(err, canRun && canRun2);
                });
            } else {
                return callback(err, canRun);
            }
        });
    }

    this.params = [];
    this.alias = [];

}

Command.prototype = {
    constructor: Command,

    addUsage: function(usage) {
        if (typeof usage === 'string') {
            this.usage = usage;
        }
    },

    addHelp: function(help) {
        if (typeof help === 'string') {
            this.help = help;
        }
    },

    addExample: function(example) {
        if (typeof example === 'string') {
            this.example = example;
        }
    },

    execution: function(client, msg, suffix) {
        console.log(this.name + " is pending implementation!");
    }
}

module.exports = Command;
