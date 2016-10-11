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
    console.log(members.length);

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
