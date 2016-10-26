# aws-cwlogs

<div>
	<a href="https://www.npmjs.com/package/aws-cwlogs"><img src='http://img.shields.io/npm/v/aws-cwlogs.svg?style=flat'></a>
	<a href="https://www.npmjs.com/package/aws-cwlogs"><img src='https://img.shields.io/npm/dm/aws-cwlogs.svg?style=flat-square'></a>
	<a href="https://david-dm.org/giowe/aws-cwlogs"><img src='https://david-dm.org/giowe/aws-cwlogs.svg'></a>
	<a href="https://www.youtube.com/watch?v=Sagg08DrO5U"><img src='http://img.shields.io/badge/gandalf-approved-61C6FF.svg'></a>
</div>

This module pulls the latest events from a specified log group in AWS CloudWatch Logs and prints the output to your terminal. The module keeps pulling logs while its running.

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
To use the aws-cwlogs it's important that you have properly installed the [aws-cli](http://docs.aws.amazon.com/cli/latest/userguide/installing.html) and
configured it with your credentials.

## Local Usage
If you installed aws-cwlogs locally you can simply use it like shown in the example:
```
  const CwLogs = require('aws-cwlogs');

  const options = {
    logGroupName: '/aws/lambda/test-lambda',
    region: 'eu-west-1'
    momentTimeFormat: 'hh:mm:ss:SSS',
    format: 'lambda',
    interval: 2000
  };

  const lambdaLogger = new CwLogs(options);
  lambdaLogger.start(options);
```
If you want to stop aws-cwlogs from pulling the new data from the specified log group you can simply use the stop command:
```
lambdaLogger.stop();
```

## Options
* `logGroupName`: **required** the name of AWS CloudWatch Logs log group;
* `region`: **required** the AWS region of the log group;
* `momentTimeFormat`: [moment.js](http://momentjs.com/docs/#/displaying/format/) time format for every log timestamp;
* `format`: while watching logs generated from AWS Lambda the output is more readable if this options is set to "lambda"; You can also pass a `function(timestamp, message, event))` if you want to customize the format of your logs.
* `interval`: the interval between every log request to AWS CloudWatch Logs;

## Global Usage
If you installed aws-cwlogs globally you can execute cwlogs command on your terminal following this syntax:
```
cwlogs [logGroupName] [region] [options]
```
*Options*:
* `--timeformat -t`
* `--interval   -i`
* `--logformat  -f`
