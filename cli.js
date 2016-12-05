#!/data/data/com.termux/files/usr/bin/env node
'use strict';

const argv    = require('yargs').argv;
const CwLogs   = require('./cwlogs');
const clc      = require('cli-color');
const path     = require('path');
const fs       = require('fs');
const AWS      = require('aws-sdk');
const inquirer = require('inquirer');
const homeDir  = require('homedir')();

const _latestLabel = 'latest';

const _configPath = path.join(homeDir, '.cwlogs-config.json');
function _saveConfig (config) {
  try {
    fs.writeFileSync(_configPath, JSON.stringify(config, null, 2));
    return config;
  } catch(err) {
    console.log(clc.red('Error:\n'), err);
    return null;
  }
}

//Load config
let config;
try {
  config = require(_configPath);
} catch(e) {
  config = _saveConfig({
    region: 'us-east-1',
    logStreamName: _latestLabel,
    momentTimeFormat: 'hh:mm:ss:SSS',
    logFormat: 'default',
    interval: 2000
  });
}

let _cloudwatchlogs;
function _getCloudWatchLogs(region) {
  if (_cloudwatchlogs) return _cloudwatchlogs;
  return new AWS.CloudWatchLogs({region: region});
}

function _getLocalPackageName() {
  try {
    return require(path.join(process.cwd(), 'package.json')).name;
  } catch(err) {
    return null;
  }
}

function _getSimilar(name, list){
  const l = list.length;
  for (let i = 0; i < l; i++) {
    const curName = list[i];
    if (curName.indexOf(name) !== -1) return curName;
  }
  return null;
}

function _getLogGroups(options, cb) {
  const logGroupName = options.logGroupName;
  const logStreamName = options.logStreamName;
  const region = options.region = options.region || config.region;
  options.momentTimeFormat = options.momentTimeFormat || config.momentTimeFormat
  options.interval = options.interval || config.interval;
  options.logFormat = options.logFormat || config.logFormat;

  const cloudwatchlogs = _getCloudWatchLogs(region);
  cloudwatchlogs.describeLogGroups({}, (err, data) => {
    if (err) return console.log(clc.red('Error:\n'), err);

    const logGroupNames = [];
    data.logGroups.forEach( logGroup => logGroupNames.push(logGroup.logGroupName) );

    //No log groups found
    if (logGroupNames.length === 0) return cb(`No log groups found on AWS ClodWatch Logs in ${region} region`);

    //Log group is specified and exists
    if (logGroupName && logGroupNames.indexOf(logGroupName) !== -1) {
      return _getLogStreams(options, next);
    }
    //Log group wasn't specified or it doesn't exists so show the list
    else {
      const prompt = inquirer.createPromptModule();
      prompt([
        { type: 'list', name: 'logGroupName', message: 'Chose a log group:', choices: logGroupNames, default: _getSimilar(logGroupName, logGroupNames) || _getLocalPackageName() }
      ]).then( answer => {
        options.logGroupName = answer.logGroupName;
        return _getLogStreams(options, next);
      });
    }

    function next(err, data) {
      if (err) return console.log(clc.red('Error:\n'), err);
      _startLogging(data);
    }
  });
}

function _getLogStreams(options, cb) {
  const logGroupName = options.logGroupName;
  const logStreamName = options.logStreamName;
  const cloudwatchlogs = _getCloudWatchLogs(options.region);
  const params = {
    logGroupName: logGroupName,
    descending: true,
    orderBy: 'LastEventTime'
  };

  cloudwatchlogs.describeLogStreams(params, (err, data) => {
    if (err) return cb(err);

    const logStreamNames = [_latestLabel];
    data.logStreams.forEach( logStream => logStreamNames.push(logStream.logStreamName) );

    //No log streams found
    if (logStreamNames.length === 1) return console.log(clc.red(`No log streams found in ${logGroupName}`));

    //Log stream is specified and exists
    if (logStreamName && logStreamNames.indexOf(logStreamName) !== -1) {
      return cb(null, options);
    }
    //Log stream wasn't specified or it doesn't exists so show the list
    else {
      const prompt = inquirer.createPromptModule();
      prompt([
        { type: 'list', name: 'logStreamName', message: 'Chose a log stream:', choices: logStreamNames, default: _getSimilar(logStreamName, logStreamNames)}
      ]).then( answers => {
        options.logStreamName = answers.logStreamName;
        return cb(null, options);
      });
    }
  });
}

function _startLogging (options) {
  if (options.logStreamName === _latestLabel) options.logStreamName = null;
  const cwlogs = new CwLogs(options);
  cwlogs.start();
}

const commands = {
  list: () => {
    const options = {
      logGroupName: argv._[0],
      logStreamName: argv._[1],
      region: argv.region || argv.r,
      momentTimeFormat:  argv.timeformat || argv.t ,
      interval: argv.interval || argv.i,
      logFormat: argv.logformat || argv.f
    };

    _getLogGroups(options, (err, options) => {
      if (err) return console.log(clc.red('Error:\n'), err);
      _startLogging(options);
    });
  },

  help: (command) => {
    const params = [
      '  --region\t-r\tCloud Watch Logs region;',
      '  --timeformat\t-t\tmomentjs time format;',
      '  --logformat\t-f\tlogs generated from AWS Lambda are more readable if you set this option to "lambda";',
      '  --interval\t-i\tinterval between each log request (keep it at 2000 ms or greater);'
    ].join('\n');

    const commands = {
      list: [
        `${clc.cyan('cwlogs (logGroupName) (logStreamName) (options)')} - ${clc.magenta('prints log data from the specified log group and log stream to console; all params are optional and if not set a list of all available options will be printed;')}`,
        params
      ].join('\n'),

      configure: [
        `${clc.cyan('cwlogs configure')} - ${clc.magenta('setup cwlogs default settings such us region, timeformat, logformat and interval;')}`,
      ].join('\n'),
    };

    const commandInfo = commands[command];
    if (commandInfo) return console.log(commandInfo);

    console.log('cwlogs commands:\n');
    Object.keys(commands).forEach( key => console.log(commands[key], '\n') );
  },

  configure: () => {
    const prompt = inquirer.createPromptModule();
    console.log('Configure default params:');
    prompt([
      {type: 'input', name: 'region', message: 'Region:', default: config.region},
      {type: 'input', name: 'momentTimeFormat', message: 'MomentJs time format:', default: config.momentTimeFormat},
      {type: 'input', name: 'logFormat', message: 'Log format template', default: config.logFormat},
      {type: 'input', name: 'interval', message: 'Interval between each log request (keep it at 2000 ms or greater):', default: config.interval},

    ]).then((answers) => {
      Object.assign(config, answers);
      if ( _saveConfig(config) ) console.log(`${clc.green('Successfully')} saved configurations` )
    });
  }
};

if (argv.help) return commands.help(process.argv[2]);

if (argv.version || argv.v) {
  const pkg = require(path.join(__dirname, 'package.json'));
  return console.log(pkg.name, pkg.version);
}

const command = commands[argv._[0]];
if (command) return command();

commands.list();
