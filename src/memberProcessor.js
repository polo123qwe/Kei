var dbUtils = require('./db/dbUtils');
var dbGuild = require('./db/dbGuild');
var discordUtils = require('./utils/discordUtils');
var logger = require('./utils/logger');

var memberRoleName = {};

module.exports = function(client, member) {
	if(member == null) return;
    //We avoid calling the DB if the user has the role already
    if (memberRoleName[member.guild.id] && member.roles.exists(r => r.name.toLowerCase() == memberRoleName[member.guild.id])) {
        return;
    }

    dbGuild.fetchGuild(member.guild.id, function(err, guildData) {
        if (err) return logger.error(err);
        //We check if the server has a member role different from default
        if (!memberRoleName[member.guild.id]) {
            memberRoleName[member.guild.id] = 'member';
            if (guildData && guildData.hasOwnProperty('member')) {
                memberRoleName[member.guild.id] = guildData.member;
            }
        }

        if (!member.guild.roles.has(memberRoleName[member.guild.id])) {
            return;
        }

		//Check if user has the role already
		if (member.roles.has(memberRoleName[member.guild.id])) {
			return;
		}

        var memberRole = member.guild.roles.get(memberRoleName[member.guild.id]);

        //If the server has the automember enabled we do the checks to add the user to member
        if (guildData && guildData.hasOwnProperty('automember') && guildData.automember) {
            dbUtils.fetchUserActivity(member.guild.id, member.user.id, 7, (err, res) => {
                if (err) return logger.error(err);
				if (res.length >= 4) {
                    var promote = 0;
                    for (var day of res) {
                        if (day.msgs > 35) {
                            promote++;
                        }
                    }
                    if (promote >= 3) {
                        addToRole();
                    }
                }
				function addToRole() {
					member.addRole(memberRole).then(() => {
						logger.info(`Membered ${member.user.username} in ${member.guild.name}`);

						var channel = discordUtils.findActivityChannel(member.guild);
						if (channel) {
							channel.send(`Congratulations ${member} you are now a member!`).catch((e) => {
								logger.warn(discordUtils.missingPerms("Send Message", member.guild, member));
							});
						}
					}).catch((e) => {
						logger.warn(discordUtils.missingPerms("Add Role", member.guild, member));
					});
				}
            });
        }
    });
}
