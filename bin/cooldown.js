var lastTimeRan = {};

module.exports = function(userID, serverID, cmd) {
    if (cmd == null) {
        return ':warning: There was an error processing the command. Try again.';
    }
    var cmdName = cmd.name;
    /* If userID is master, he can run the command */
    /*if (config.permissions.owner.indexOf(userID) != -1) {
        return '';
    }*/

    if (!lastTimeRan.hasOwnProperty(serverID)) {
        lastTimeRan[serverID] = {};
    }
    if (!lastTimeRan[serverID].hasOwnProperty(cmdName)) {
        lastTimeRan[serverID][cmdName] = {};
    }

    if (cmd.hasOwnProperty('cd') && cmd.cd > 0) {

        if (!lastTimeRan[serverID][cmdName].hasOwnProperty(userID)) {
            lastTimeRan[serverID][cmdName][userID] = new Date().valueOf();
            return '';
        }
        var now = Date.now();
        var userCD = lastTimeRan[serverID][cmdName][userID];
        if (now < (userCD + (cmd.cd * 1000))) {
            var time = Math.round(((userCD + cmd.cd * 1000) - now) / 1000);
            return cmd.name + ' is on cooldown ***' + time + '*** seconds.';
        }

    }
    lastTimeRan[serverID][cmdName][userID] = now;
    return '';
}
