#!/usr/bin/env node
'use strict';

const argv   = require('yargs').argv;
const CwLogs = require('./cwlogs');

const logGroupName = argv._[0];
const region       = argv._[1];

if (!logGroupName || !region) return console.log(`\nmissing params.\n\ncwlogs [logGroupName] [region] [options]\n\n--timeformat -t\t\tmomentjs time format\n--interval -i\t\tinterval between every log refresh`);

CwLogs.start({
  logGroupName: logGroupName,
  region: region,
  momentTimeFormat: argv.timeformat || argv.t || 'hh:mm:ss:SSS',
  interval: argv.interval || argv.i || 2000
});
