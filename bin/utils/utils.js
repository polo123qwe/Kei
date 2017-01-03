var unirest = require('unirest');
var hastebin = require('../../config.json').hastebin;

//Function to convert a timespan into a readable time
exports.convertUnixToDate = function(t) {
    var pad = function(n) {
        return n < 10 ? '0' + n : n;
    };
    var cd = 24 * 60 * 60 * 1000;
    var ch = 60 * 60 * 1000;
    var d = Math.floor(t / cd);
    var h = Math.floor((t - d * cd) / ch);
    var m = Math.round((t - d * cd - h * ch) / 60000);
    if (m === 60) {
        h++;
        m = 0;
    }
    if (h === 24) {
        d++;
        h = 0;
    }
    var mo = Math.floor(d / (365 / 12));
    d = d - Math.round(mo * (365 / 12));
    var output = "";
    if (mo != 0) {
        output += mo + " Months ";
    }
    if (d != 0) {
        output += d + " Days ";
    }
    if (h != 0) {
        output += pad(h) + " Hours ";
    }
    output += pad(m) + " Minutes.";
    return (output);
}

//Function to convert a timestamp into a readable time
exports.unixToTime = function(UNIX_timestamp) {
    var a = new Date(UNIX_timestamp);
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes() < 10 ? '0' + a.getMinutes() : a.getMinutes();
    var sec = a.getSeconds() < 10 ? '0' + a.getSeconds() : a.getSeconds();
    var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec;
    return time;
}

//Generates a hastebin document
exports.generateHasteBin = function(data, callback) {

    unirest.post(`https://hastebin.com/documents`)
        .send(data)
        .end(function(response) {
            return callback(`https://hastebin.com/${response.body.key}.txt`);
        });
}

exports.getRandom = function(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

exports.isNumber = function(text){
    return /^\d+$/.test(text);
}
