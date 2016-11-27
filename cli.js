#!/usr/bin/env node
'use strict';

const argv   = require('yargs').argv;
const CwLogs = require('./cwlogs');
const clc    = require('cli-color');
const path   = require('path');
const fs     = require('fs');
const AWS    = require('aws-sdk');

let _s3Conainer = {};
function _s3 (region) {
  if (!_s3Conainer[region]) _s3Conainer[region] = new AWS.S3({region: region});
  return _s3Conainer[region];
}

function _hasS3Origin (config) {
  const s3Origin = config.s3Origin;
  return s3Origin.bucket && s3Origin.region && s3Origin.key;
}

const _configPath = path.join(__dirname, 'config.json');
function _loadConfig() {
  try {
    return require(_configPath);
  } catch(e) {
    return {
      macros: {},
      s3Origin: {}
    };
  }
}

function _saveConfig (config, dontSync, cb) {
  if (typeof cb === 'undefined'){
    cb = dontSync;
    dontSync = false;
  }

  fs.writeFile(_configPath, JSON.stringify(config, null, 2), (err) => {
    if (err) return cb(err);

    if (dontSync || !_hasS3Origin(config)) return cb(null, `${clc.green('Successfully')} saved`);

    _saveRemoteConfig(config, (err) => {
      if (err) return cb(err);
      cb(null, `${clc.green('Successfully')} synced`);
    });
  });
}

function _loadRemoteConfig (config, cb) {
  const s3Origin = config.s3Origin;

  const params = {
    Bucket: s3Origin.bucket,
    Key: s3Origin.key
  };
  _s3(s3Origin.region).getObject(params, (err, data) => {
    if (err) return cb (err);
    try {
      cb(null, JSON.parse(data.Body));
    } catch (err) {
      cb(err);
    }
  });
}

function _saveRemoteConfig(config, cb) {
  const s3Origin = config.s3Origin;

  const params = {
    Bucket: s3Origin.bucket,
    Key: s3Origin.key,
    Body: JSON.stringify(config, null, 2),
    ContentType: 'application/json'
  };

  _s3(s3Origin.region).putObject(params, (err) => {
    if (err) return cb(err);
    cb(null);
  });
}

function _getMacroName(logGroupName, region, logStreamName) {
  return `${logGroupName} \t ${region}${logStreamName? ' \t ' + logStreamName : ''}`;
}

function _sync (config, cb) {
  config = config || _loadConfig();

  if (!_hasS3Origin(config)) return console.log(clc.red('missing params in s3Origin; run cwlogs configure command'));

  _loadRemoteConfig(config, (err, remoteConfig) => {
    if (err && err.code === 'NoSuchKey') {
      const s3Origin = config.s3Origin;
      console.log(`Creating ${clc.cyan(s3Origin.key)} in ${clc.cyan(s3Origin.bucket)}`);
    }
    else if (err) return cb(err);

    const updatedConfig = Object.assign({}, remoteConfig, config);

    _saveRemoteConfig(updatedConfig, (err) => {
      if (err) return cb(err);
      cb(null, updatedConfig);
    })
  })
}

const commands = {
  list: () => {
    let config = _loadConfig();

    if (_hasS3Origin(config)) _loadRemoteConfig(config, (err, remoteConfig) => {
      if (err) return console.log(clc.red(err));
      Object.assign(config.macros, remoteConfig.macros);

      const macros = Object.keys(config.macros);

      if(!macros.length) return console.log('No macros found in the list');

      const inquirer = require('inquirer');
      const prompt = inquirer.createPromptModule();

      prompt([
        {type: 'list', name: 'macroName', message: 'Chose what you want to log:', choices: macros}
      ]).then(answers => { commands.startLogging(config.macros[answers.macroName]) } );
    });
  },

  help: (command) => {
    const params = [
      '  --streamname\t-n\tif not specified logs will be printed from the last stream name found;',
      '  --timeformat\t-t\tmomentjs time format;',
      '  --interval\t-i\tinterval between every log request;',
      '  --logformat\t-f\tlogs generated from lambda functions are more readable setting this options to "lambda";'
    ].join('\n');

    const commands = {
      startLogging: [
        `${clc.cyan('cwlogs [logGroupName] [region] [options]')} - ${clc.magenta('logs data from the specified log group')}`,
        params
      ].join('\n'),

      list: [
        `${clc.cyan('cwlogs')} - ${clc.magenta('show a list of previously recorded cwlogs macros and logs data from the selected one')}`,
      ].join('\n'),

      add: [
        `${clc.cyan('cwlogs add [logGroupName] [region] [options]')} - ${clc.magenta('add the specified parameters to the macro list')}`,
        params,
      ].join('\n'),

      removeList: [
        `${clc.cyan('cwlogs remove')} - ${clc.magenta('remove the selected macro from the list')}`,
      ].join('\n'),

      remove: [
        `${clc.cyan('cwlogs remove [logGroupName] [region] [options]')} - ${clc.magenta('remove the specified macro from the list')}`,
        params,
      ].join('\n'),
    };

    const commandInfo = commands[command];
    if (commandInfo) return console.log(commandInfo);

    console.log('cwlogs commands:\n');
    Object.keys(commands).forEach( key => console.log(commands[key], '\n') );
  },

  add: (options) => {
    options = options || {};

    const logGroupName =  options.logGroupName || argv._[1];
    const region = options.region || argv._[2];
    const logStreamName = options.logStreamName || argv.streamname || argv.n;

    if (!logGroupName || !region) {
      console.log(clc.red('missing params'), '\n');
      return commands.help('add');
    }

    const macroName = options.macroName || _getMacroName(logGroupName, region, logStreamName);

    const config = _loadConfig();
    config.macros[macroName] = {
      logGroupName: logGroupName,
      region: region,
      logStreamName: logStreamName,
      momentTimeFormat: options.momentTimeFormat || argv.timeformat || argv.t,
      interval: options.interval || argv.interval || argv.i,
      logFormat: options.logFormat || argv.logformat || argv.f
    };

    _saveConfig(config, (err, message) => {
      if (err) return console.log(clc.red(err));
      console.log(message);
    });
  },

  remove: (options) => {
    options = options || {};

    const logGroupName =  options.logGroupName || argv._[1];
    const region = options.region || argv._[2];
    const logStreamName = options.logStreamName || argv.streamname || argv.n;

    const config = _loadConfig();

    if (logGroupName && region) return deleteAndSave(_getMacroName(logGroupName, region, logStreamName));

    const inquirer = require('inquirer');
    const prompt = inquirer.createPromptModule();

    const macros = Object.keys(config.macros);
    if(!macros.length) return console.log('No macros to remove');

    prompt([
      {type: 'list', name: 'macroName', message: 'Chose what you want to log:', choices: macros}
    ]).then(macroNameAnswer => {
      const macroName = macroNameAnswer.macroName;
      prompt([
        {type: 'confirm', name: 'confirm', message: `Are you sure to remove ${macroName} macro?`, default: false}
      ]).then(confirmAnswer => {
        if (confirmAnswer.confirm) deleteAndSave(macroName);
      });
    });

    function deleteAndSave(macroName) {
      const macroObj = config.macros[macroName];
      if (!macroObj) return console.log(clc.red(`No macro found with ${macroName} name`));
      delete config.macros[macroName];
      _saveConfig(config, (err, message) => {
        if (err) return console.log(clc.red(err));
        console.log(message);
      });
    }

  },

  startLogging: (options) => {
    options = options || {};

    const logGroupName =  options.logGroupName || argv._[0];
    const region = options.region || argv._[1];

    if (!logGroupName || !region) {
      console.log(clc.red('missing params)'), '\n');
      return commands.help('startLogging');
    }

    const cwlogs = new CwLogs({
      logGroupName: logGroupName,
      region: region,
      logStreamName: options.logStreamName || argv.streamname || argv.n,
      momentTimeFormat: options.momentTimeFormat || argv.timeformat || argv.t || 'hh:mm:ss:SSS',
      interval: options.interval || argv.interval || argv.i || 2000,
      logFormat: options.logFormat || argv.logformat || argv.f || 'standard'
    });

    cwlogs.start();
  },

  configure: () => {
    const inquirer = require('inquirer');
    const prompt = inquirer.createPromptModule();
    const config = _loadConfig();

    prompt([
      {type: 'input', name: 'bucket', message: 'S3 bucket name:', default: config.s3Origin.bucket},
      {type: 'input', name: 'region', message: 'S3 bucket region:', default: config.s3Origin.region},
      {type: 'input', name: 'key', message: 'Config file key:', default: config.s3Origin.key}
    ]).then((answers) => {
      config.s3Origin = answers;
      _saveConfig(config, true, (err, message) => {
        if (err) return console.log(clc.red(err));
        console.log(message);
      });
    });
  },
};

if (argv.help) return commands.help(process.argv[2]);

if (argv.version || argv.v) {
  const pkg = require(path.join(__dirname, 'package.json'));
  return console.log(pkg.name, pkg.version);
}
if (!argv._[0]) return commands.list();

const command = commands[argv._[0]];
if (command) return command();

commands.startLogging();
