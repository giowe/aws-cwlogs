#!/usr/bin/env node
'use strict';

const argv   = require('yargs').argv;
const CwLogs = require('./cwlogs');
const clc    = require('cli-color');
const path   = require('path');
const fs     = require('fs');
const AWS    = require('aws-sdk');

const _latestLabel = '_latest_';
const _configPath = path.join(__dirname, 'config.json');
function _loadConfig() {
  try {
    return require(_configPath);
  } catch(e) {
    return _saveConfig({
      region: 'us-east-1',
      logStreamName: _latestLabel,
      momentTimeFormat: 'hh:mm:ss:SSS',
      logFormat: 'default',
      interval: 2000
    });
  }
}

function _getLocalPackageName() {
  try {
    return require(path.join(process.cwd(), 'package.json')).name;
  } catch(err) {
    return null;
  }
}

function _saveConfig (config) {
  try {
    fs.writeFileSync(_configPath, JSON.stringify(config, null, 2));
    return config;
  } catch(err) {
    console.log(clc.red(err));
    return null;
  }
}

function _getLogGroups(options, cb) {
  const config = _loadConfig();
  if (options.logGroupName && options.logStreamName) return cb(null, options);

  const region = options.region || config.region;
  const cloudwatchlogs = new AWS.CloudWatchLogs( {region: region} );
  cloudwatchlogs.describeLogGroups({}, (err, data) => {
    if (err) return console.log(clc.red('Error:\n'), err);

    const logGroupNames = [];
    data.logGroups.forEach( logGroup => logGroupNames.push(logGroup.logGroupName) );

    if (logGroupNames.length === 0) return cb(`No log groups found on AWS ClodWatch Logs in ${region} region`);

    const inquirer = require('inquirer');
    const prompt = inquirer.createPromptModule();
    prompt([
        { type: 'list', name: 'logGroupName', message: 'Chose a log group:', choices: logGroupNames, default: _getLocalPackageName()}
      ]).then( answer => {
      const logGroupName = answer.logGroupName;
      const params = {
        logGroupName: logGroupName,
        descending: true,
        orderBy: 'LastEventTime'
      };

      const cwlogsParams = {
        logGroupName: logGroupName,
        region: region,
        logStreamName: options.logStreamName,
        momentTimeFormat: options.momentTimeFormat || config.momentTimeFormat,
        interval: options.interval || config.interval,
        logFormat: options.logFormat || config.logFormat
      };

      if (options.logStreamName) return cb(null, cwlogsParams);

      cloudwatchlogs.describeLogStreams(params, (err, data) => {
        if (err) return cb(err);
        const logStreamNames = [_latestLabel];
        data.logStreams.forEach( logStream => logStreamNames.push(logStream.logStreamName) );

        if (logStreamNames.length === 1) return console.log(clc.red(`No log streams found in ${logGroupName}`));

        prompt([
          { type: 'list', name: 'logStreamName', message: 'Chose a log stream:', choices: logStreamNames }
        ]).then( answers => {
          cwlogsParams.logStreamName = answers.logStreamName;
          cb(null, cwlogsParams);
        });
      });
    });
  });
}

function _startLogging (options) {
  options = options || {};
  const config = _loadConfig();

  const logGroupName =  options.logGroupName || argv._[0];

  if (!logGroupName) {
    console.log(clc.red('Missing log group name'), '\n');
    return commands.help('startLogging');
  }

  const logStreamName = options.logStreamName || argv.streamname || argv.n || config.logStreamName;

  const cwlogs = new CwLogs({
    logGroupName: logGroupName,
    region: options.region || argv.region || argv.r || config.region,
    logStreamName: logStreamName === _latestLabel? null : logStreamName,
    momentTimeFormat: options.momentTimeFormat || argv.timeformat || argv.t || config.momentTimeFormat,
    interval: options.interval || argv.interval || argv.i || config.interval,
    logFormat: options.logFormat || argv.logformat || argv.f || config.logFormat
  });

  cwlogs.start();
}

const commands = {
  list: () => {
    const options = {
      logGroupName: argv._[0],
      region: argv.region || argv.r,
      logStreamName: argv.streamname || argv.n,
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
      '  --streamname\t-n\tlogs will be printed from the last stream name found unless specified;',
      '  --timeformat\t-t\tmomentjs time format;',
      '  --logformat\t-f\tlogs generated from AWS Lambda are more readable if you set this option to "lambda";',
      '  --interval\t-i\tinterval between each log request (keep it at 2000 ms or greater);'
    ].join('\n');

    //todo rifare la sintassi perchè cambia
    const commands = {
      startLogging: [
        `${clc.cyan('cwlogs [logGroupName] [options]')} - ${clc.magenta('prints log data from the specified log group to console')}`,
        params
      ].join('\n'),

      list: [
        `${clc.cyan('cwlogs')} - ${clc.magenta('shows a list of previously recorded cwlogs macros and prints data from the selected one to console')}`,
      ].join('\n'),

      configure: [
        `${clc.cyan('cwlogs configure')} - ${clc.magenta('setup cwlogs to sync your local configurations with a remote config file on AWS S3')}`,
      ].join('\n'),
    };

    const commandInfo = commands[command];
    if (commandInfo) return console.log(commandInfo);

    console.log('cwlogs commands:\n');
    Object.keys(commands).forEach( key => console.log(commands[key], '\n') );
  },

  configure: () => {
    const inquirer = require('inquirer');
    const config = _loadConfig();
    const prompt = inquirer.createPromptModule();

    console.log('Configure default params:');
    prompt([
      {type: 'input', name: 'region', message: 'Region:', default: config.region},
      {type: 'input', name: 'logStreamName', message: 'Log stream name: ', default: config.logStreamName},
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
if (!argv._[0]) return commands.list();

const command = commands[argv._[0]];
if (command) return command();

_startLogging();
