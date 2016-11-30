var dbUtils = require('./dbUtils');
var discordUtils = require('./discordUtils');

var memberRemovalTimer;
var client;

module.exports = function(cli) {
    if (memberRemovalTimer) {
        clearInterval(memberRemovalTimer);
    }
    client = cli;
    memberRemoval();
    memberRemovalTimer = setInterval(memberRemoval, 24 * 3600000);
}

function memberRemoval() {
    client.guilds.forEach((guild) => {
        //Fetch all the members of the guild
        guild.fetchMembers().then(guild => {
            dbUtils.fetchGuild(guild.id, (err, guildData) => {
                if (err) return console.log(err);
                if (guildData && guildData.hasOwnProperty('automember') && guildData.automember) {
                    //Array of all the users we want to remove
                    var memberRoleName = 'member';
                    if (guildData && guildData.hasOwnProperty('member')) {
                        memberRoleName = guildData.member;
                    }
                    var membersToUpdate = [];

                    checkUsers(guild.members.array(), (err) => {
                        if (err) console.log(err);

                        updateUserRoles(membersToUpdate, guild, memberRoleName);
                    });

                    function checkUsers(members, callback) {
                        if (members.length <= 0) return callback(null);

                        //Member we are going to check
                        var member = members.pop();
                        //Check if the member has the member role or is trusted, otherwise skip
                        if (!member.roles.exists(r => r.name.toLowerCase() == memberRoleName) ||
                            member.roles.exists(r => r.name.toLowerCase() == "trusted member")) {
                            return checkUsers(members, callback);
                        }

                        dbUtils.fetchUserActivity(guild.id, member.user.id, 14, (err, res) => {
                            if (err) return callback(err);
                            var totalMsgs = 0;
                            for (var day of res) {
                                totalMsgs += day.msgs;
                            }
                            if (totalMsgs < 50) {
                                //console.log(`${member.user.username} added`);
                                membersToUpdate.push(member);
                            }
                            return checkUsers(members, callback);
                        });
                    }
                }
            });
        });
    });
}

function updateUserRoles(membersToUpdate, guild, memberRoleName) {
    if (membersToUpdate.length < 1) return;

    //Avoid ratelimits
    var member = membersToUpdate.pop();
    //Find the color role (if any) and the member role
    var roles = []
    var colorRole = member.roles.find(r => r.name.startsWith("#"));
    if (colorRole) roles.push(colorRole);
    var memberRole = member.roles.find(r => r.name.toLowerCase() == memberRoleName.toLowerCase());
    roles.push(memberRole);

    member.removeRoles(roles).then(() => {
        setTimeout(() => {
            //Add the role
            var roleToAdd = guild.roles.find(r => r.name.toLowerCase() == "lurker");

            member.addRole(roleToAdd).then(() => {
                setTimeout(() => {
                    //Send message and proceed to next member
                    var channel = discordUtils.findActivityChannel(guild);
                    if (!channel) return updateUserRoles(membersToUpdate, guild, memberRoleName);
                    channel.sendMessage(`${member.user.username} is now a lurker.`).then(() => {
                        return updateUserRoles(membersToUpdate, guild, memberRoleName);
                    }).catch(console.log);
                }, 1000);
            }).catch(console.log);
        }, 1000);
    }).catch(console.log);
}
