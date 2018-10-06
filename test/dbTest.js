var expect = require('chai').expect;
var assert = require('chai').assert;
var MongoClient = require("mongodb").MongoClient;

var levels = require('../consts/levels.json')
var Command = require('../src/commandTemplate');
var Connection = require('../src/db/dbConnection');
var dbclient;

module.exports = function() {
    // it('Connect to DB', function(done) {
    //     Connection(function(err, db) {
    //         if(err){
    //             done(err);
    //         } else {
    //             dbclient = db;
    //             done();
    //         }
    //     });
    // });

    // it('Create collection', function(done) {
    //     dbclient.createCollection("test", function(err, collection) {
    //         assert.equal(err, null);
    //         /*collection.insert({
    //             "test": "value"
    //         });*/
    //         done();
    //     });
    // });

    // it('Find collection', function(done) {
    //     dbclient.collection('test', function(err, collection) {
    //         assert.equal(err, null);
    //         /*collection.insert({
    //             "test": "value"
    //         });*/
    //         done();
    //     });
    // });

    // it('Delete collection', function(done) {
    //     dbclient.dropCollection('test', function(err, collection) {
    //         assert.equal(err, null);
    //         /*collection.insert({
    //             "test": "value"
    //         });*/
    //         done();
    //     });
    // });

    // after(() => {
    //     if(dbclient){
    //         dbclient.close();
    //     }
    // });
}
