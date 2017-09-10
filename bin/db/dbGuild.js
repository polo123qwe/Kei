var Connection = require('./dbConnection');
var logger = require('../utils/logger');

exports.fetchChannel = function(channel_id, callback) {

    var db = Connection.getDB();
    if (!db) return callback("Not connected to DB!");

    var collection = db.collection('channels');

    collection.findOne({
        _id: channel_id
    }, callback);
}

exports.fetchGuild = function(guild_id, callback) {

    var db = Connection.getDB();
    if (!db) return callback("Not connected to DB!");

    var collection = db.collection('guilds');

    collection.findOne({
        _id: guild_id
    }, callback);
}

exports.fetchRoleID = function(roleToFind, guild_id, callback) {
    var rolesAllowed = ["warned", "muted", "member", "lurker"];

    if (!rolesAllowed.includes(roleToFind)) {
        return callback(null);
    }
    exports.fetchGuild(guild_id, function(err, guildData) {
        if (err) {
            logger.error(err);
            return callback(null);
        } else if (guildData && guildData.hasOwnProperty(roleToFind)) {
            return callback(guildData[roleToFind]);
        } else {
            return callback(null);
        }
    });
}

exports.storeNewAccount = function(guild_id, user_id) {
    return new Promise(function(resolve, reject) {
	    var db = Connection.getDB();
	    if (!db) return reject("Not connected to DB!");

	    var collection = db.collection('newaccounts');

	    var elementToInsert = {
	        user_id: user_id,
	        guild_id: guild_id,
	        timestamp: Date.now()
	    };

	    collection.insertOne(elementToInsert, (err, r) => {
	        if (err) return reject(err);
	        return resolve();
	    });
	});
}

exports.fetchNewAccounts = function(guild_id) {
    return new Promise(function(resolve, reject) {
        var db = Connection.getDB();
        if (!db) return reject("Not connected to DB!");

        var collection = db.collection('newaccounts');

        collection.find({
            guild_id: guild_id,
        }, function(err, cur) {
            if (err) return reject(err);

            cur.sort({
                timestamp: -1
            }).toArray().then(arr => {
                return resolve(arr);
            }).catch(reject);
        });
    });
}

exports.deleteNewAccount = function(guild_id, user_id) {
    return new Promise(function(resolve, reject) {
        var db = Connection.getDB();
        if (!db) return reject("Not connected to DB!");

        var collection = db.collection('newaccounts');

        var elementToRemove = {
            user_id: user_id,
            guild_id: guild_id
        };

        collection.findOneAndDelete(elementToRemove, (err, r) => {
            if (err) return reject(err);
            return resolve();
        });
    });
}

//TODO: checkAccount, fix ask cmd with non ascii chars
