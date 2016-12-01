var discordUtils = require('./bin/discordUtils');
var dbUtils = require('./bin/dbUtils');
var Connection = require('./bin/dbConnection');
var memberMessages;

var eliminatedRole;
var eventChannel;
var activityChannel;

var thisClient;
var guildID = "132490115137142784"
module.exports = function(client) {
    var guild = client.guilds.find("id", guildID);
    memberMessages = {};

    //Find all the data we will use
    thisClient = client;
    eventChannel = guild.channels.find("id", "253664283060207631");
    activityChannel = guild.channels.find("id", "252209543965048832");
    eliminatedRole = guild.roles.find("name", "Eliminated");

    console.log("Starting elimination");
    guild.fetchMembers().then(guild => {
        getMessageCount((err, res) => {
            for (var user of res) {
                var member = guild.members.find("id", user._id);

                if (member) {
                    memberMessages[user._id] = {
                        priority: getPriority(member),
                        msgs: user.msgs,
                        member: member
                    }
                }
            }

            for (var member of guild.members.array()) {
                if (!memberMessages.hasOwnProperty(member.user.id)) {
                    memberMessages[member.user.id] = {
                        priority: getPriority(member),
                        msgs: 0,
                        member: member
                    }
                }
            };

            processMembers();
        });
    });

}

function processMembers() {
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

    getActualNumber((err, res) => {
        if (err) return console.log(err);
        var amount = res.value.days[0];
        var usersToEliminate = members.slice(amount, members.length);
        console.log(usersToEliminate.length + " is the length of the array usersToEliminate");
        addRole(usersToEliminate, () => {
            eventChannel.sendMessage(`**${usersToEliminate.length}** were eliminated today.`).then(() => {
                activityChannel.sendMessage(`**${usersToEliminate.length}** were eliminated today.`);
            });
        });
    })

}

function addRole(usersToEliminate, callback) {
    if (usersToEliminate.length < 1) callback();

    var userData = usersToEliminate.pop();
    setTimeout(() => {
        userData.member.addRole(eliminatedRole).then(() => {
            console.log(userData.member.user.username + " eliminated");
            return addRole(usersToEliminate, callback);
        })
    }, 1000);
}

function getPriority(member) {
    var priority = 0;
    if (member.roles.array().length != 0) {
        priority = 1;
        if (member.roles.exists(r => r.name.toLowerCase() == 'member')) {
            priority = 2;
        }
        if (member.roles.exists(r => r.name.toLowerCase() == 'trusted member')) {
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

function getActualNumber(callback) {

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
        returnOriginal: true,
        upsert: true
    }, callback);
}
