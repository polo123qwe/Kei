var Connection = require('./dbConnection');

exports.updateUserJoined = function(guild_id, user_id, joinedTimestamp, callback) {
    var operation = {
        $set: {
            "users.$.last_joined": joinedTimestamp
        },
        $push: {
            "users.$.joined": joinedTimestamp
        }
    }
    var fields = {
        "last_joined": joinedTimestamp,
        "joined": [joinedTimestamp]
    }
    insertIntoMembers(guild_id, user_id, operation, fields, callback);
}

exports.updateUserLeft = function(guild_id, user_id, leftTimestamp, callback) {
    var operation = {
        $set: {
            "users.$.last_left": leftTimestamp,
            "users.$.isInGuild": false
        },
        $push: {
            "users.$.left": leftTimestamp
        }
    }
    var fields = {
        "last_left": leftTimestamp,
        "left": [leftTimestamp],
        "isInGuild": false
    }
    insertIntoMembers(guild_id, user_id, operation, fields, callback);
}

exports.updateNickname = function(guild_id, user_id, nickname, callback) {
    var operation = {
        $push: {
            "users.$.nicknames": nickname
        }
    }
    var fields = {
        "nicknames": [nickname],
    }
    insertIntoMembers(guild_id, user_id, operation, fields, callback);
}

/*
 * Generic template to insert into the db, where updateOperation is the operation
 * to be updated and fields is an object with all the fields that the update
 * operation modifies and the value it assigns
 */
function insertIntoMembers(guild_id, user_id, updateOperation, fields, callback) {
    var db = Connection.getDB();
    if (!db) return callback("Not connected to DB!");

    var collection = db.collection('members');

    var insertObject = {
        _id: user_id,
        isInGuild: true
    }
    for (var field in fields) {
        insertObject[field] = fields[field];
    }
    //If the element exists
    collection.updateOne({
        "_id": guild_id,
        "users._id": user_id
    }, updateOperation, (err, res) => {
        if (err) {
            console.log(err);
            return callback(err);
        }
        if (res.matchedCount < 1) addElement();
        else {
            console.log("We updated the document");
            callback(null);
        }
    });

    //If the element doesnt exist
    function addElement() {
        console.log("We add a document");
        console.log(insertObject);
        collection.updateOne({
            "_id": guild_id,
            "users.user_id": {
                "$ne": user_id
            }
        }, {
            $addToSet: {
                users: insertObject
            }
        }, {
            upsert: true
        }, (err, res) => {
            if (err) {
                console.log(err);
                return callback(err);
            } else callback(null)
        });

    }
}

exports.updateUsername = function(user_id, username, callback){

    var db = Connection.getDB();
    if (!db) return callback("Not connected to DB!");

    var collection = db.collection('users');

    var operation = {
        $push: {
            "usernames": username
        }
    }

    collection.findOneAndUpdate({
        _id: user_id
    }, operation, {
        upsert: true,
        returnOriginal: false
    }, (err, res) => {
        if (err) return console.log(err);
        console.log(res);
    })
}

exports.updateValue =  function(user_id, key, value, callback) {
    var db = Connection.getDB();
    if (!db) return callback("Not connected to DB!");

    var collection = db.collection('users');

    collection.findOneAndUpdate({
        _id: user_id
    }, {
        key: value
    }, {
        upsert: true,
        returnOriginal: false
    }, (err, res) => {
        if (err) return console.log(err);
        console.log(res);
    })
}

exports.fetchMember = function(guild_id, user_id, callback) {

    var db = Connection.getDB();
    if (!db) return callback("Not connected to DB!");

    var collection = db.collection('members');

    collection.findOne({
        _id: guild_id,
        "users._id": user_id
    }, (err, res) => {
        if (err) return console.log(err);
        if (res && res.users[0]) console.log(res.users[0]);
    });
}

exports.fetchUser = function(guild_id, user_id, callback) {

    var db = Connection.getDB();
    if (!db) return callback("Not connected to DB!");

    var collection = db.collection('users');

    collection.findOne({
        _id: user_id
    }, (err, res) => {
        if (err) return console.log(err);
        if (res) console.log(res);
    });
}
