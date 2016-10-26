'use strict';

const AWS    = require('aws-sdk');
const clc    = require('cli-color');
const moment = require('moment');

const _options = {
  logGroupName: '',
  region: '',
  momentTimeFormat: 'hh:mm:ss:SSS',
  interval: 2000,
  logFormat: 'standard'
};

module.exports = class CwLogs {
  constructor(options) {
    this.options = Object.assign({}, _options, options);
    this.lastLogTime = 0;
    return this;
  };

  start(){
    const cloudwatchlogs = new AWS.CloudWatchLogs( {region: this.options.region} );
    this.interval = setInterval(() => {
      const params = {
        logGroupName: this.options.logGroupName,
        descending: true,
        limit: 1,
        orderBy: 'LastEventTime'
      };

      cloudwatchlogs.describeLogStreams(params, (err, data) => {
        if (err) return console.log(clc.red(err));
        const params = {
          logGroupName: this.options.logGroupName,
          logStreamName: data.logStreams[0].logStreamName,
          startTime: this.lastLogTime
        };

        cloudwatchlogs.getLogEvents(params, (err, data) => {
          if (err) return console.log(clc.red(err));
          const events = data.events;
          if (!events.length) return;
          this.lastLogTime = events[events.length - 1].timestamp + 1;
          const l = events.length;
          for (let i = 0; i < l; i++) _logEvent(events[i], this.options);
        });
      });
    }, this.options.interval);
  }

  stop(){
    clearInterval(_interval);
  }
};

function _logEvent(event, options) {
  const timestamp = `[ ${clc.blackBright(moment(event.timestamp).format(options.momentTimeFormat))} ]`;

  switch (options.logFormat.toLowerCase()) {
    case 'lambda': {
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
      break;
    }
    default:
      console.log(timestamp, event.message, '\n');
  }
}
