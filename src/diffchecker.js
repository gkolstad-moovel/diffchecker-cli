#!/usr/bin/env node

import request from 'superagent';
import fs from 'fs';
import opener from 'opener';
import prompt from 'prompt';
import git from 'git-fs';
import GoogleAnalytics from 'ga';
import minimist from 'minimist';
import path from 'path';

const API_URI = 'https://diffchecker-api-production.herokuapp.com';
const ga = new GoogleAnalytics('UA-8857839-4', 'http://www.diffchecker.com');
const options = minimist(process.argv.slice(2));

function getConfigPath () {
  const userHomePath = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
  return path.join(userHomePath, '/diffchecker.json');
}

function authorization () {
  return new Promise((resolve, reject) => {
    try {
      const config = require(getConfigPath());
      resolve(config);
    } catch (err) {
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
          .post(API_URI + '/sessions')
          .send(result)
          .end((er, response) => {
            if (er) reject(er);
            ga.trackEvent({
              category: 'user',
              action: 'login',
              label: 'client',
              value: 'cli'
            });

            const conf = { authToken: response.body.authToken };

            fs.writeFile(getConfigPath(), JSON.stringify(conf, null, 2), (e) => {
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
    require('child_process').exec('git rev-parse --show-toplevel', (error, dir) => {
      if (error) reject(Error("Tried to look for a git version of that file, but couldn't locate a git repository nearby."));

      const gitDir = dir.trim('\n');

      git(gitDir);
      git.getHead((err, hash) => {
        if (err) reject(Error("Couldn't get the hash of the most recent commit."));

        git.readFile(hash, source, 'utf8', (e, data) => {
          if (e) reject(Error("Couldn't read the file from the git repository. Are you sure it exists in the latest commit?"));

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
      .post(API_URI + '/diffs')
      .set('Authorization', 'Bearer ' + conf.authToken)
      .send({
        left,
        right,
        expiry: options.expire || 'hour',
        title: options.title || null
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
          if (e) console.log('diff create error', e);
          console.log('Your diff is ready: ' + url);
          opener(url);
        });
      });
  }

  /* Check if there's just one argument. If there is, assume user wants to compare with most recent git commit. Otherwise, read the next argument as a file to compare with. */

  if (options.signout) {
    fs.unlink(getConfigPath(), () => {
      console.log("You've been signed out. Run the command again to sign in.");
      process.exit();
    });
  } else if (options._.length === 1) {
    gitDiff(options._[0])
    .then(left => {
      transmit({
        left,
        'right': fs.readFileSync(options._[0], 'utf-8')
      });
    });
  } else {
    transmit({
      left: fs.readFileSync(options._[0], 'utf-8'),
      right: fs.readFileSync(options._[0], 'utf-8')
    });
  }
});
