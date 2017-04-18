'use strict';

const AWS    = require('aws-sdk');
const clc    = require('cli-color');
const moment = require('moment');
const path   = require('path');

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
        if (err) {
          console.log(clc.red(err));
          return this.stop();
        }
        const params = {
          logGroupName: this.options.logGroupName,
          logStreamName: this.options.logStreamName || data.logStreams[0].logStreamName,
          startTime: this.lastLogTime
        };

        cloudwatchlogs.getLogEvents(params, (err, data) => {
          if (err) {
            console.log(clc.red(err));
            return this.stop();
          }
          const events = data.events;
          if (!events.length) return;

          let logFunction = (message, timestamp) => console.log(timestamp, message);
          if (this.options.logFormat && this.options.logFormat !== 'default') {

            if (typeof(logFunction) == "function") {
              logFunction = this.options.logFormat;
            } else {
              try {
                logFunction = require(path.join(__dirname, 'log-formats', `${this.options.logFormat}.js`));
              } catch(err) {}
            }
            
          }

          this.lastLogTime = events[events.length - 1].timestamp + 1;
          const l = events.length;
          for (let i = 0; i < l; i++) {
            const event = events[i];
            const message = event.message;
            const timestamp = `[ ${clc.blackBright(moment(event.timestamp).format(this.options.momentTimeFormat))} ]`;
            logFunction(message, timestamp, event);
          }

        });
      });
    }, this.options.interval);
  }

  stop(){
    clearInterval(this.interval);
  }
};
