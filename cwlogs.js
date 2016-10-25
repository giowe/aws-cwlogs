'use strict';

const AWS    = require('aws-sdk');
const clc    = require('cli-color');
const moment = require('moment');

let _lastLogTime = 0;
let _interval;
let _options = {
  logGroupName: '',
  region: '',
  momentTimeFormat: 'hh:mm:ss:SSS',
  interval: 2000
};

module.exports = class CwLogs {
  static start(options) {
    _options = Object.assign({}, _options, options);
    const cloudwatchlogs = new AWS.CloudWatchLogs( {region: _options.region} );

    _interval = setInterval(() => {
      const params = {
        logGroupName: _options.logGroupName,
        descending: true,
        limit: 1,
        orderBy: 'LastEventTime'
      };

      cloudwatchlogs.describeLogStreams(params, function(err, data) {
        if (err) return console.log(clc.red(err));
        const params = {
          logGroupName: _options.logGroupName,
          logStreamName: data.logStreams[0].logStreamName,
          startTime: _lastLogTime
        };

        cloudwatchlogs.getLogEvents(params, function(err, data) {
          if (err) return console.log(clc.red(err));
          const events = data.events;
          if (!events.length) return;
          _lastLogTime = events[events.length - 1].timestamp + 1;
          const l = events.length;
          for (let i = 0; i < l; i++) logEvent(events[i]);
        });
      });
    }, _options.interval);

  }

  static stop(){
    clearInterval(_interval);
  }
};

function logEvent(event) {
  const timestamp = `[ ${clc.blackBright(moment(event.timestamp).format(_options.momentTimeFormat))} ]`;
  const splitted  = event.message.split('\t');
  const header    = splitted.shift().split(' ');
  const message   = splitted.join(' ').slice(0, -1);
  let out;
  switch (header[0].toUpperCase()){
    case 'START':
      out = [
        '┌──────────────────────',
        timestamp,
        ` ${clc.green(header[0])}`,
        message,
        '\n│'
      ];
      break;
    case 'END':
      out = [
        '│',
        '\n└──────────────────────',
        timestamp,
        ` ${clc.magenta(header[0])}`,
        message
      ];
      break;
    case 'REPORT':
      out = [
        `${clc.yellow(header[0])} `,
        message,
        '\n'
      ];
      break;
    default:
      out = [
        '│ ',
        timestamp,
        message
      ];
  }

  console.log(out.join(''));
}
