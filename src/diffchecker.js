#!/usr/bin/env node

import fs from 'fs';
import { argv } from 'yargs';
import path from 'path';

import authorization from './auth';
import gitDiff from './gitdiff';
import transmit from './transmit';
import { configPath } from './config';

if (argv.h || argv.help) {
  const help = fs.readFileSync(path.resolve(__dirname, '../help.txt'), 'utf-8');

  console.log(help);
} else if (argv.v || argv.version) {
  const npmPackage = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'));

  console.log(npmPackage.version);
} else {
  for (const arg in argv) {
    if (arg) {
      switch (arg) {
        case '$0':
        case 'v':
        case 'version':
        case 'expires':
        case 'signout':
        case 'h':
        case 'help':
        case '_':
          break;
        default:
          console.error("The option: '" + arg + "' is not accepted. Please see help by running diffchecker --help.");
          process.exit();
      }
    }
  }

  authorization()
  .then(() => {
    /* Check if there's just one argument. If there is, assume user wants to compare with most recent git commit. Otherwise, read the next argument as a file to compare with. */
    if (argv.signout) {
      fs.unlink(configPath, () => {
        console.log("You've been signed out. Run the command again to sign in.");
        process.exit();
      });
    } else if (argv._.length === 1) {
      gitDiff(argv._[0])
      .then(left => {
        transmit({
          left,
          'right': fs.readFileSync(argv._[0], 'utf-8')
        });
      })
      .catch(error => {
        console.log(error);
      });
    } else {
      transmit({
        left: fs.readFileSync(argv._[0], 'utf-8'),
        right: fs.readFileSync(argv._[0], 'utf-8')
      });
    }
  })
  .catch(error => {
    console.error(error);
  });
}
