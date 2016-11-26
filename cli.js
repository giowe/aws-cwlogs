#!/usr/bin/env node
'use strict';

const argv   = require('yargs').argv;
const CwLogs = require('./cwlogs');
const clc    = require('cli-color');
const path   = require('path');
const fs     = require('fs');

const configPath = path.join(__dirname, 'config.json');
const loadConfig = () => {
  try {
    return require(configPath);
  } catch(e) {
    return {
      macros: {}
    };
  }
};

const saveConfig = (config, cb) => {
  fs.writeFile(configPath, JSON.stringify(config, null, 2), (err) => {
    if (err) return cb(err);
    cb(null);
  });
};

const getMacroName = (logGroupName, region, logStreamName) => {
  return `${logGroupName} \t ${region}${logStreamName? ' \t ' + logStreamName : ''}`;
};

const commands = {
  list: () => {
    const config = loadConfig();
    const macros = Object.keys(config.macros);

    if(!macros.length) return commands.help();

    const inquirer = require('inquirer');
    const prompt = inquirer.createPromptModule();

    prompt([
      {type: 'list', name: 'macroName', message: 'Chose what you want to log:', choices: macros}
    ]).then(answers => { commands.startLogging(config.macros[answers.macroName]) } );
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

    const macroName = options.macroName || getMacroName(logGroupName, region, logStreamName);

    const config = loadConfig();
    config.macros[macroName] = {
      logGroupName: logGroupName,
      region: region,
      logStreamName: logStreamName,
      momentTimeFormat: options.momentTimeFormat || argv.timeformat || argv.t,
      interval: options.interval || argv.interval || argv.i,
      logFormat: options.logFormat || argv.logformat || argv.f
    };

    saveConfig(config, (err) => {
      if (err) return console.log(clc.red(err));
      console.log(`${clc.green('Successfully')} added ${clc.cyan(macroName)}`);
    });
  },

  remove: (options) => {
    options = options || {};

    const logGroupName =  options.logGroupName || argv._[1];
    const region = options.region || argv._[2];
    const logStreamName = options.logStreamName || argv.streamname || argv.n;

    const config = loadConfig();

    if (logGroupName && region) return deleteAndSave(getMacroName(logGroupName, region, logStreamName));

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
      saveConfig(config, (err) => {
        if (err) return console.log(clc.red(err));
        console.log(`${clc.green('Successfully')} removed ${clc.cyan(macroName)}`);
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

commands.startLogging();
