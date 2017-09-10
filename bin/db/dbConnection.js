var MongoClient = require("mongodb").MongoClient;
var dboptions = require('../../config.json').db;
var assert = require('assert');

var Connection;

var url = `mongodb://${dboptions.username}:${dboptions.password}@${dboptions.host}:${dboptions.port}/`;
var db = null;

function Connection(callback) {
    MongoClient.connect(url, (err, database) => {
        if (err) {
            return callback(err);
        } else {
            db = database.db(dboptions.db);
            return callback(null, database);
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
