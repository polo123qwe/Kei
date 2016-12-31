var discordUtils = require('./bin/discordUtils');
var dbUtils = require('./bin/dbUtils');
var utils = require('./bin/utils');
var Connection = require('./bin/dbConnection');
var memberMessages;

var timeout;
var eliminatedRole;
var eventChannel;
var activityChannel;
var guildM
var guildID = "132490115137142784"
var thisClient;
module.exports = function(client) {
    if (timeout != null) return;

    getValue((err, event) => {
        if (err) return console.log(err);
        thisClient = client;

        guild = thisClient.guilds.get(guildID);
        memberMessages = {};

        //Find all the data we will use
        eventChannel = guild.channels.get("253664283060207631");
        activityChannel = guild.channels.get("252209543965048832");
        eliminatedRole = guild.roles.find("name", "Eliminated");

        var days = event.days;
        var span = ((31 - days.length) * 24 * 3600000);
        var time = span - (Date.now() - event.timestamp);

        awaitAndRun(time, days);
    });
}

function awaitAndRun(time, days) {
    console.log(`It will happen in ${utils.convertUnixToDate(time)}`);
    if (time < 1) time = 3000;
    timeout = setTimeout(() => {

        console.log("Starting elimination");
        getMessageCount((err, res) => {
            for (var user of res) {
                var member = guild.members.get(user._id);

                if (member && !member.roles.exists("name", "Eliminated")) {
                    memberMessages[user._id] = {
                        priority: getPriority(member),
                        msgs: user.msgs,
                        member: member
                    }
                }
            }

            processMembers(days);
        });
    }, time);
}

function processMembers(days) {
    var members = [];
    for (var member in memberMessages) {
        members.push({
            user_id: member,
            priority: memberMessages[member].priority,
            msgs: memberMessages[member].msgs,
            member: memberMessages[member].member,
        });
    }

    members.sort(function(a, b) {
        if (a.msgs == b.msgs) {
            if (a.priority == b.priority) {
                return 0;
            } else if (a.priority > b.priority) {
                return -1;
            } else {
                return 1;
            }
        } else if (a.msgs > b.msgs) {
            return -1;
        } else {
            return 1;
        }
    });

    var amount = days[0];
    var usersToEliminate = members.slice();
    console.log(usersToEliminate.length + " is the length of the array usersToEliminate and " + amount + " is objective");
    while (amount > 0) {
        usersToEliminate.shift();
        amount--;
    }
    console.log(`After, its ${usersToEliminate.length}`);
    addRole(usersToEliminate, () => {
        activityChannel.sendMessage(`**${days[0]}** are remaining.`).then(() => {
            getAndUpdate((err, event) => {
                memberMessages = {};
                var days = event.value.days;

                var span = 1 * 24 * 3600000;
                console.log(`It will happen in ${span}`);
                awaitAndRun(span, days);
            })
        });
    });
}

function addRole(usersToEliminate, callback) {
    if (usersToEliminate.length < 1) return callback();

    var userData = usersToEliminate.pop();
    setTimeout(() => {
        userData.member.addRole(eliminatedRole).then(() => {
            console.log(userData.member.user.username + " eliminated");
            return addRole(usersToEliminate, callback);
        }).catch(console.log)
    }, 1000);
}

function getPriority(mem) {
    var priority = 0;
    if (mem.roles.array().length != 0) {
        priority = 1;
        if (mem.roles.exists(r => r.name.toLowerCase() == 'member')) {
            priority = 2;
        }
        if (mem.roles.exists(r => r.name.toLowerCase() == 'trusted member')) {
            priority = 3;
        }
    }
    return priority;
}

function getMessageCount(callback) {
    var db = Connection.getDB();
    if (!db) return callback("Not connected to DB!");

    var collection = db.collection('logs');

    collection.aggregate([{
        "$match": {
            channel_id: "253664283060207631",
            guild_id: guildID
        }
    }, {
        "$group": {
            _id: "$author_id",
            msgs: {
                $sum: 1
            }
        }
    }, {
        "$sort": {
            msgs: 1
        }
    }], callback);
}

function getAndUpdate(callback) {

    var db = Connection.getDB();
    if (!db) return callback("Not connected to DB!");

    var collection = db.collection('events');

    collection.findOneAndUpdate({
        _id: guildID
    }, {
        $pop: {
            days: -1
        }
    }, {
        returnOriginal: false,
        upsert: true
    }, callback);
}

function getValue(callback) {

    var db = Connection.getDB();
    if (!db) return callback("Not connected to DB!");

    var collection = db.collection('events');

    collection.findOne({
        _id: guildID
    }, callback);
}
