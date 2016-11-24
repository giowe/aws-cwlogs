#!/usr/bin/env node
'use strict';

const argv   = require('yargs').argv;
const CwLogs = require('./cwlogs');

const logGroupName = argv._[0];
const region       = argv._[1];

if (!logGroupName || !region) return console.log(`
missing params.

cwlogs [logGroupName] [region] [options]

--timeformat\t-t\t\tmomentjs time format;
--interval\t-i\t\tinterval between every log request;
--logformat\t-f\t\twhile watching logs generated from lambda functions the output is more readable if this options is set to "lambda";
--streamname\t-n\t\tif not specified logs will be printed from the last stream name found;
`);

const cwlogs = new CwLogs({
  logGroupName: logGroupName,
  region: region,
  logStreamName: argv.streamname || argv.n,
  momentTimeFormat: argv.timeformat || argv.t || 'hh:mm:ss:SSS',
  interval: argv.interval || argv.i || 2000,
  logFormat: argv.logformat || argv.f || 'standard'
});

cwlogs.start();
