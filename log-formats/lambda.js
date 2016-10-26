'use strict';

const clc    = require('cli-color');

module.exports = (message, timestamp, event) => {
  const splittedMessage = message.split('\t');
  const header = splittedMessage.shift().split(' ');
  const body = splittedMessage.join(' ').slice(0, -1);
  let out;
  switch (header[0].toUpperCase()){
    case 'START':
      out = [
        '┌──────────────────────',
        timestamp,
        ` ${clc.green(header[0])}`,
        body,
        '\n│'
      ];
      break;
    case 'END':
      out = [
        '│',
        '\n└──────────────────────',
        timestamp,
        ` ${clc.magenta(header[0])}`,
        body
      ];
      break;
    case 'REPORT':
      out = [
        `${clc.yellow(header[0])} `,
        body,
        '\n'
      ];
      break;
    default:
      out = [
        '│ ',
        timestamp,
        body
      ];
  }

  console.log(out.join(''));
};
