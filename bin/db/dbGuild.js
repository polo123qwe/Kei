var Connection = require('./dbConnection');

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

	if(!rolesAllowed.includes(roleToFind)){
		return callback(null);
	}
	exports.fetchGuild(guild_id, function(err, guildData){
		if(err){
			console.log(err)
			return callback(null);
		} else if(guildData && guildData.hasOwnProperty(roleToFind)){
			return callback(guildData[roleToFind]);
		} else {
			return callback(null);
		}
	});
}
