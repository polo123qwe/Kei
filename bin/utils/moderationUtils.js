const Discord = require('discord.js');
var logType = require('../../consts/logMessageType');
var discordUtils = require('./discordUtils');
var logger = require('./logger');

//Send the type as a string
exports.logMessage = function(type, moderatorUser, targetUser, channel, reason) {
    if (!logType.hasOwnProperty(type.toUpperCase())) {
        //Invalid logging
        return;
    }

    if (!reason) {
        reason = "No reason specified";
    }
    var embed = new Discord.RichEmbed();
    embed.setTitle(type);
    embed.addField("User", `${targetUser.username}#${targetUser.discriminator} (${targetUser.id})`, false);
    embed.addField("Moderator", `${moderatorUser.username}#${moderatorUser.discriminator} (${moderatorUser.id})`, false);
    embed.addField("Reason", `${reason}`, false);
    embed.setTimestamp();
    embed.setColor(logType[type]);
    return channel.send({
        embed: embed
    }).catch();
}

//Placeholders are only for bans
exports.logPlaceholder = function(targetUser, channel) {
    var embed = new Discord.RichEmbed();
    embed.setTitle("BAN");
    embed.setColor(logType["BAN"]);

    channel.send({
        embed: embed
    }).then(m => {
        embed.setTitle("BAN");
        embed.addField("User", `${targetUser.username}#${targetUser.discriminator} (${targetUser.id})`, false);
        embed.addField("Moderator", `${m.id}`, false);
        embed.addField("Reason", `${m.id}`, false);
        embed.setTimestamp();
        return m.edit("", {
            embed: embed
        }).catch();
    }).catch((e) => {
		logger.warn(discordUtils.missingPerms("Send Message", member.guild, member));
	});
}

exports.editEmbed = function(message, moderatorUser, reason) {

    if (!reason) {
        reason = "No reason specified";
    }

    var rawEmbed = message.embeds[0];
    var rawEmbedFields = {};
    var embed = new Discord.RichEmbed();
    embed.setTitle(rawEmbed.title);
    embed.setColor(rawEmbed.color);

    for (var field of rawEmbed.fields) {
        rawEmbedFields[field.name] = field.value
    }

    if (rawEmbedFields.hasOwnProperty("User")) {
        embed.addField("User", rawEmbedFields["User"], false);
    }
    if (rawEmbedFields.hasOwnProperty("Moderator")) {
        embed.addField("Moderator", `${moderatorUser.username}#${moderatorUser.discriminator} (${moderatorUser.id})`, false);
    }

    embed.addField("Reason", reason, false);

    embed.setTimestamp(new Date(rawEmbed.createdTimestamp));
    return message.edit("", {
        embed: embed
    }).catch();
}
