const utils = require('./utils')
const winston = require('winston');

module.exports = new(winston.Logger)({
    transports: [
        new(winston.transports.Console)({
            'timestamp': () => {
				return utils.unixToTime(Date.now());
			},
            'colorize': true
        })
    ]
});
