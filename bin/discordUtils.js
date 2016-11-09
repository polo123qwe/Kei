var Connection = require('./dbConnection');

//Find mentions and IDs
exports.getMembersFromMessage = function(msg, suffix){
    var members = [];
    var users = msg.mentions.users.array();

    for(var mention of users){
        members.push(msg.guild.members.find("id", mention.id));
    }

    for(var element of suffix){
        if(msg.guild.members.exists("id", element)){
            members.push(msg.guild.members.find("id", element));
        }
    }
    //console.log(members.length);

    return members;
}

exports.getRole = function(guild, roleName){
    var role = guild.roles.find((r) => {
        return r.name.toLowerCase() == roleName.toLowerCase() ||
            r.id == roleName
    });
    return role;
}

exports.findLogsChannel = function(guild, callback){
    var db = Connection.getDB();
    var logchannelName = "log";

    if(db){
        var collection = db.collection('guilds');

        collection.findOne({_id:guild.id}, function(err, res){
            if(res && res.hasOwnProperty("log")){
                logchannelName = res.logs;
            }
            return fetchChannel();
        })
    } else {
        return fetchChannel();
    }
    function fetchChannel(){
        var channel = guild.channels.find("name", logchannelName);
        callback(channel);
    }
}

exports.sendAndDelete = function(channel, content, delay) {
    var d = DELAY;
    if (delay) {
        d = delay;
    }
    channel.sendMessage(content).then((reply) => {
        setTimeout(() => {
            reply.delete();
        }, d);
    });
}

//Perform various tests to find out if the value sent is a user, checking name,
//nick and ID of given user. We use filter as a boolean to accept partial matches
exports.isUser = function(value, m, filter) {
    //We get all the values to ease handling
    value = value.toLowerCase();
    var username = m.user.username.toLowerCase();
    var nick = m.nickname;
    var bool = false;
    if (filter) { //If we only want strict matches
        bool = (username + "#" + m.user.discriminator) == value;
        bool = bool || username == value;
        if (nick) {
            nick = nick.toLowerCase();
            bool = bool || nick == value;
        }
    } else {
        bool = username.includes(value);
        if (nick) {
            nick = nick.toLowerCase();
            bool = bool || nick.includes(value);
        }
    }
    bool = bool || m.user.id == value;
    //console.log(m.user.username + " " + bool);
    return bool;
}
