const Discord = require('discord.js');
var http = require('http');
var Command = require('../commandTemplate');
var Connection = require('../db/dbConnection');
var levels = require('../../consts/levels.json');
var paramtypes = require('../../consts/paramtypes.json');
var utils = require('../utils/utils');
var discordUtils = require('../utils/discordUtils');
var dbUtils = require('../db/dbUtils');
var dbGuild = require('../db/dbGuild');
var forecast_key = require('../../config').apis.forecastKey;
var Forecast = require('forecast.io-bluebird');
var weatherOptions = require('../../consts/weather');
var commands = [];

try {
    var api_key = require("../../config.json").apis.osu;
} catch (e) {
    api_key = "";
}
var osuapi = require('osu-api');

var cmd;
////////////////////////////////////////////////////////////
cmd = new Command('urban', 'External Data');
cmd.addHelp('Returns the urban dictionary definition of the word');
cmd.addUsage('<word(s)>')
cmd.dm = true;
cmd.cd = 5;
cmd.minLvl = levels.DEFAULT;
cmd.params.push(paramtypes.PARAM);
cmd.execution = function(client, msg, suffix) {

    var result = suffix.join("+");
    msg.channel.send("http://www.urbandictionary.com/define.php?term=" + result);
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('osu', 'External Data');
cmd.addHelp('Returns the osu of the given username');
cmd.addUsage('<username> ["-taiko"/"-mania"/"-ctb"/"-standard"]')
cmd.dm = true;
cmd.cd = 5;
cmd.minLvl = levels.DEFAULT;
cmd.params.push(paramtypes.PARAM);
cmd.execution = function(client, msg, suffix) {

    var mode;
    var option = "standard";

    var index = suffix.findIndex(p => {
        return p.startsWith("-");
    });

    if (index > -1) {
        //We remove the - from the option
        option = suffix.splice(index, 1)[0].substr(1, option.length);
    }

    var username = suffix.join(" ");

    if (modes.hasOwnProperty(option)) {
        mode = modes[option];
    } else {
        //if the input is not correct we default at standard
        option = "standard";
        mode = modes.standard
    }

    var osu_a = new osuapi.Api(api_key, mode);

    osu_a.getUser(username, function(err, out) {
        if (err != null) {
            console.log("Error " + err);
        }
        if (out == null) out = "No user found";
        else out = stringify(out);
        msg.channel.send(out);
    });

    function stringify(out) {
        var str = `[${option}] User ${out.username} is rank #${out.pp_rank} (${out.pp_raw}) has ${(Math.round(out.accuracy * 100) / 100)}% accuracy. For more information: \n <https://osu.ppy.sh/u/${out.user_id}>`;
        return str;
    }
}

var modes = {
    standard: osuapi.Modes.osu,
    ctb: osuapi.Modes.CtB,
    mania: osuapi.Modes.osumania,
    taiko: osuapi.Modes.taiko,
}

commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('weather', 'External Data');
cmd.addHelp('Returns the weather at given address');
cmd.addUsage('<address>')
cmd.dm = true;
cmd.cd = 5;
cmd.minLvl = levels.DEFAULT;
cmd.params.push(paramtypes.PARAM);
cmd.execution = function(client, msg, suffix) {
    geocode(suffix.join(" "), function(err, locat) {
        if (err != null) {
            // console.log('Error: ' + err);
        } else if (!locat) {
            msg.channel.send("No result found!");
        } else {
            getForecast(locat.geometry.location.lat, locat.geometry.location.lng, function(err, out) {
                if (err) return;
                else {
					var embed = new Discord.RichEmbed();
			        embed.setAuthor(locat.formatted_address);
			        embed.addField("Summary", out.summary, false);
			        embed.addField("Temperature", out.temperature + "ºC", false);
			        embed.addField("Humidity", Math.floor(out.humidity*100) + "%", false);
			        embed.addField("Probability of Rain", Math.floor(out.precipProbability*100) + "%", false);
			        embed.setColor("#4444AA");
					if(weatherOptions.hasOwnProperty(out.icon)){
						embed.setThumbnail(weatherOptions[out.icon]);
					}
					embed.setTimestamp();
					msg.channel.send({embed: embed});
                }
            });
        }
    });
}

function geocode(address, callback) {

    var url = "http://maps.googleapis.com/maps/api/geocode/json?address=" + encodeURIComponent(address) + "&sensor=false";

    http.get(url, function(res) {
        if (res.statusCode != 200) {
            callback("HTTP status = " + res.statusCode, null);
        } else {
            var output = '';
            res.setEncoding('utf8');
            res.on('data', function(chunk) {
                output += chunk;
            });
            res.on('end', function() {
                var response = JSON.parse(output);
                if (response.status == "OK") {
                    var location = response.results[0];
                    callback(null, location);
                } else if (response.status == "ZERO_RESULTS") {
                    callback(null, null);
                } else {
                    callback("Status = " + response.status, null);
                }
            });
        }
    }).on('error', function(e) {
        callback(e.message, null);
    });
}

function getForecast(latitude, longitude, callback) {
    var forecast = new Forecast({
        key: forecast_key,
        timeout: 2500
    });
    var options = {
        units: 'si',
    };
    forecast.fetch(latitude, longitude, options)
        .then(function(out) {
            var out = out.currently;
            callback(null, out);
        })
        .catch(function(error) {
            // console.error(error);
            callback(error);
        });
}

commands.push(cmd);
////////////////////////////////////////////////////////////


module.exports = commands;
