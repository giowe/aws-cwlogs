#!/usr/bin/env node
'use strict';

const argv   = require('yargs').argv;
const CwLogs = require('./cwlogs');
const path   = require('path');

let config;
let configPath = path.join(__dirname, 'config.json');
try {
  config = require(configPath);
} catch(e) {
  config = {};
}

const commands = {
  list: () => {
    const inquirer = require('inquirer');

    const prompt = inquirer.createPromptModule();

    prompt([
      {type: 'list', name: 'name', message: 'message', choices: [
        'a', 'b', 'c'
      ]}
    ]).then(/* ... */);
  },

  help: () => {
    console.log([
      'cwlogs [logGroupName] [region] [options]',
      '--timeformat\t-t\t\tmomentjs time format;',
      '--interval\t-i\t\tinterval between every log request;',
      '--logformat\t-f\t\twhile watching logs generated from lambda functions the output is more readable if this options is set to "lambda";',
      '--streamname\t-n\t\tif not specified logs will be printed from the last stream name found;'
    ].join('\n'));
  },

  add: (options) => {
    options = options || {};
    const macroName = options.macroName || argv._[1];

    config[macroName] = {
      logGroupName: options.logGroupName || argv._[2],
      region: options.region || argv._[3],
      logStreamName: options.streamname || argv.streamname || argv.n,
      momentTimeFormat: options.timeformat || argv.timeformat || argv.t,
      interval: options.interval || argv.interval || argv.i,
      logFormat: options.logformat || argv.logformat || argv.f
    };

    try {
      require('fs').writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(`Successfully added ${macroName} to config.json`)
    } catch (e) {
      console.log(e);
    }
  },

  remove: (macroName) => {

  },

  startLogging: (options) => {
    options = options || {};

    const logGroupName =  options.logGroupName || argv._[0];
    const region = options.region || argv._[1];

    if (!logGroupName || !region) {
      console.log('missing params\n');
      return commands.help();
    }

    const cwlogs = new CwLogs({
      logGroupName: logGroupName,
      region: region,
      logStreamName: options.streamname || argv.streamname || argv.n,
      momentTimeFormat: options.timeformat || argv.timeformat || argv.t || 'hh:mm:ss:SSS',
      interval: options.interval || argv.interval || argv.i || 2000,
      logFormat: options.logformat || argv.logformat || argv.f || 'standard'
    });

    cwlogs.start();
  }
};


if (!argv._[0]) return commands.list();

const command = commands[argv._[0]];
if (command) return command();

commands.startLogging();
