var MongoClient = require("mongodb").MongoClient;
var dboptions = require('../config.json').db;
var assert = require('assert');

var Connection;

var url = `mongodb://${dboptions.username}:${dboptions.password}@${dboptions.host}:${dboptions.port}/`;
var db = null;

function Connection(callback) {
    //map port from remote 3306 to localhost 3306
    /*var server = tunnel(dboptions.sshtunnel, function(error, server) {
        if (error) {
            //catch configuration and startup errors here.
        } else {
            console.log(server);*/
            MongoClient.connect(url, (err, database) => {
                if (err) {
                    //console.log(err);
                    return callback(err);
                } else {
                    db = database.db(dboptions.db);
                    return callback(null, database);
                }
            });
    /*    }
    });*/
}

Connection.getDB = function() {
    if (db) {
        return db;
    } else {
        //console.log("Not connected to the db!");
        return null;
    }
}

module.exports = Connection;
