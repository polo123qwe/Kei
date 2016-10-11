var expect = require('chai').expect;
var assert = require('chai').assert;

var Command = require('../bin/commandTemplate');
var levels = require('../consts/levels.json')

module.exports = function(client){
    //var testCommand = new Command('test', 'testcat');

    it('default level', function() {

        //this.timeout(10000);

        /*client.on('message', function(msg) {
            var c = new Command('test');
            done();
            /*c.check(client, msg, function(){
                done();
            });*/
        //});
    });
}
