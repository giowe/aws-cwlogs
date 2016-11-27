# aws-cwlogs

<div>
	<a href="https://www.npmjs.com/package/aws-cwlogs"><img src='http://img.shields.io/npm/v/aws-cwlogs.svg?style=flat'></a>
	<a href="https://www.npmjs.com/package/aws-cwlogs"><img src='https://img.shields.io/npm/dm/aws-cwlogs.svg?style=flat-square'></a>
	<a href="https://david-dm.org/giowe/aws-cwlogs"><img src='https://david-dm.org/giowe/aws-cwlogs/status.svg'></a>
	<a href="https://www.youtube.com/watch?v=Sagg08DrO5U"><img src='http://img.shields.io/badge/gandalf-approved-61C6FF.svg'></a>
</div>

This module pulls the latest events from a specified log group in AWS CloudWatch Logs and prints the output to console. The module keeps pulling logs while its running.

## Installation
You can install aws-cwlog both locally
```
npm install aws-cwlogs
```

or globally
```
npm install aws-cwlogs -g
```

## Configuration
To use aws-cwlogs it's important that you have properly installed the [aws-cli](http://docs.aws.amazon.com/cli/latest/userguide/installing.html) and
configured it with your credentials.

## Local Usage
If you installed aws-cwlogs locally you can simply use it like shown in the example:
```
  const CwLogs = require('aws-cwlogs');

  const options = {
    logGroupName: '/aws/lambda/test-lambda',
    region: 'eu-west-1',
    momentTimeFormat: 'hh:mm:ss:SSS', //optional
    logFormat: 'lambda',              //optional
    interval: 2000,                   //optional
    streamname: 'production'          //optional
  };

  const lambdaLogger = new CwLogs(options);
  lambdaLogger.start(options);
```
If you want to stop aws-cwlogs from pulling the new data from the specified log group you can simply use the stop command:
```
lambdaLogger.stop();
```

## Options
* `logGroupName`: **required** name of AWS CloudWatch Logs log group;
* `region`: **required** AWS region of the log group;
* `streamname`: logs will be printed from the last stream name found unless specified;
* `momentTimeFormat`: [moment.js](http://momentjs.com/docs/#/displaying/format/) log timestamp format;
* `logFormat`: logs generated from AWS Lambda are more readable if you set this option to "lambda"; You can also pass a `function(timestamp, message, event))` if you want to customize the format of your logs.
* `interval`: interval between every log request to AWS CloudWatch Logs in milliseconds (keep it at 2000 ms or greater);

## Global Usage
If you installed aws-cwlogs globally you can use this commands:

* `cwlogs [logGroupName] [region] [options]` - prints log data from the specified log group to console
  * `--streamname -n` - logs will be printed from the last stream name found unless specified;
  * `--timeformat -t` -	momentjs time format;
  * `--logformat -f` - logs generated from AWS Lambda are more readable if you set this option to "lambda";
  * `--interval -i` - interval between each log request;


* `cwlogs` - shows a list of previously recorded cwlogs macros and prints data from the selected one to console

* `cwlogs add [logGroupName] [region] [options]` - adds the specified parameters to the macro list
  * `--streamname -n` - logs will be printed from the last stream name found unless specified;
  * `--timeformat -t` -	momentjs time format;
  * `--logformat -f` - logs generated from AWS Lambda are more readable if you set this option to "lambda";
  * `--interval -i` -	interval between each log request;

* `cwlogs remove` - removes the selected macro from the list

* `cwlogs remove` [logGroupName] [region] [options] - removes the specified macro from the list
  * `--streamname -n` - logs will be printed from the last stream name found unless specified;
  * `--timeformat -t` - momentjs time format;
  * `--logformat -f` - logs generated from AWS Lambda are more readable if you set this option to "lambda";
  * `--interval -i` - interval between each log request;

* `cwlogs configure` - setup cwlogs to sync your local configurations with a remote config file on AWS S3
