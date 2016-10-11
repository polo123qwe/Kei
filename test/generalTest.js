var expect = require('chai').expect;
var assert = require('chai').assert;

var Command = require('../bin/commandTemplate');

const Discord = require('discord.js');
const client = new Discord.Client({
    fetch_all_members: true,
    disable_everyone: true
});
const token = require('../config.json').token;

describe('Running Tests', function() {
    before(function(done){
        this.timeout(10000);
        client.login(token);

        client.on('ready', () => {
            done();
        });
    });

    describe('> JSONs', function() {
        it('Correctly built levels JSON', function() {
            assert.doesNotThrow(() => {
                var levels = require('../bin/levels.json');
            });
        });
    });

    describe('> CommandTemplate', require('./commandsTest'));

    describe('> Checks test', function(){
        require('./checkTests')(client);
    });

    describe('> Database test', require('./dbTest'));

    after(() => {
        client.destroy();
    });
});
