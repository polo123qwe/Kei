/*
Command class which is going to be used to generate all the commands
*/
var Command;

var levels = require('../consts/levels.json');
var checks = require('./checks');
var utils = require('./utils');
var Connection = require('./dbConnection');

function Command(name, cat) {

    if (typeof name === 'string') {
        this.name = name;
    }

    if (typeof cat === 'string') {
        this.category = cat;
    } else {
        this.category = 'default';
    }

    //We set the defualt values
    this.minLvl = levels.DEFAULT;
    this.reqDB = false;
    this.del = false;
    this.cd = 0;

    this.run = function(client, msg, suffix) {
        this.check(client, msg, suffix, (err, res) => {
            if (err) return utils.sendAndDelete(msg.channel, err);
            if (!res) return;
            if (this.reqDB && Connection.getDB() == null) {
                utils.sendAndDelete(msg.channel, "Database not connected, can't run this command");
            } else {
                this.execution(client, msg, suffix);
                if(this.del){
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

    execution: function(client, msg, suffix) {
        console.log(this.name + " is pending implementation!");
    }
}

module.exports = Command;
