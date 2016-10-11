var expect = require('chai').expect;
var assert = require('chai').assert;

var Command = require('../bin/commandTemplate');
var levels = require('../consts/levels.json')

module.exports = function(){
    var cat = 'testcat';
    var testCommand = new Command('test', cat);

    it('default level', function() {
        assert.equal(testCommand.minLvl, -1);
    });
    it('default cooldown', function() {
        assert.equal(testCommand.cd, 0);
    });

    it('category', function() {
        assert.equal(testCommand.category, cat);
    });

    it('changing level', function() {
        testCommand.minLvl = levels.ADMIN;
        assert.equal(testCommand.minLvl, 4);
    });

    it('adding usage', function() {
        testCommand.addUsage('TestUsage')
        assert.equal(testCommand.usage, 'TestUsage');
    });

    it('adding help', function() {
        testCommand.addHelp('Test Help');
        assert.equal(testCommand.help, 'Test Help');
    });

}
