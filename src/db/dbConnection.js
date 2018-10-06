var MongoClient = require("mongodb").MongoClient;
var dboptions = require('../../config.json').db;
var assert = require('assert');

var Connection;

var url = `mongodb://${dboptions.username}:${dboptions.password}@${dboptions.host}:${dboptions.port}/`;
var db = null;

function Connection(callback) {
    MongoClient.connect(url, {useNewUrlParser: true},(err, client) => {
        if (err) {
            return callback(err);
        } else {
            db = client.db(dboptions.db);
            return callback(null, db);
        }
    });
}

Connection.getDB = function() {
    if (db) {
        return db;
    } else {
        return null;
    }
}

module.exports = Connection;
