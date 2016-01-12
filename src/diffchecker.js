#!/usr/bin/env node

import request from 'superagent';
import fs from 'fs';
import opener from 'opener';
import prompt from 'prompt';
import git from 'git-fs';
import GoogleAnalytics from 'ga';
import { argv } from 'yargs';
import path from 'path';
import spawn from 'child_process';

const ga = new GoogleAnalytics(process.env.GA_ID, process.env.GA_DOMAIN);
const configPath = path.join(process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'], '/.diffchecker.json');
const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath)) : false;

function authorization () {
  return new Promise((resolve, reject) => {
    if (config.authToken) {
      resolve(config);
    } else {
      console.log("You don't appear to be logged in. Sign up for a free account at https://www.diffchecker.com/signup and enter your credentials.");
      prompt.start();
      prompt.get({
        properties: {
          email: {
            required: true,
            message: 'Email'
          },
          password: {
            required: true,
            message: 'Password',
            hidden: true
          }
        }
      }, (error, result) => {
        request
          .post(process.env.API_URL + '/sessions')
          .send(result)
          .end((er, response) => {
            if (er) return reject(new Error(response.body.error.code));
            ga.trackEvent({
              category: 'user',
              action: 'login',
              label: 'client',
              value: 'cli'
            });

            const conf = { authToken: response.body.authToken };

            fs.writeFile(configPath, JSON.stringify(conf, null, 2), (e) => {
              if (e) reject(e);

              resolve(conf);
            });
          });
      });
    }
  });
}

function gitDiff (source) {
  return new Promise((resolve, reject) => {
    spawn.exec('git rev-parse --show-toplevel', (error, dir) => {
      if (error) reject(new Error("Tried to look for a git version of that file, but couldn't locate a git repository nearby."));

      const gitDir = dir.trim('\n');

      /* Uses git-fs to look in the git repo as if it were a file system (like fs). */
      git(gitDir); // initialize git-fs in the folder gitDir.
      git.getHead((err, hash) => {
        if (err) reject(new Error("Couldn't get the hash of the most recent commit."));

        git.readFile(hash, source, 'utf8', (e, data) => {
          if (e) reject(new Error("Couldn't read the file from the git repository. Are you sure it exists in the latest commit?"));

          resolve(data);
        });
      });
    });
  });
}

authorization()
.then(conf => {
  function transmit ({ left, right }) {
    request
      .post(process.env.API_URL + '/diffs')
      .set('Authorization', 'Bearer ' + conf.authToken)
      .send({
        left,
        right,
        expiry: argv.expire || 'hour',
        title: argv.title || null
      })
      .end((error, response) => {
        if (error) {
          console.log(error);
          process.exit(1);
        }

        const url = 'https://diffchecker.com/' + response.body.slug;

        ga.trackEvent({
          category: 'diff',
          action: 'submit',
          label: 'client'
        }, function diffCreateError(e) {
          if (e) {
            console.log('diff create error', e);
            process.exit();
          }
          console.log('Your diff is ready: ' + url);
          opener(url);
        });
      });
  }

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
