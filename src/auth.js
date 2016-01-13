import request from 'superagent';
import fs from 'fs';
import prompt from 'prompt';

import { config, configPath } from './config';
import ga from './ga';

export default function authorization () {
  return new Promise((resolve, reject) => {
    if (config.authToken) {
      resolve(config);
    } else {
      console.log("You don't appear to be logged in. Sign up for a free account at https://www.diffchecker.com/signup and enter your credentials.");
      prompt.start();
      prompt.message = '>';
      prompt.delimiter = ' ';
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
            if (er) return reject(response.body.error.code);

            const conf = { authToken: response.body.authToken };

            fs.writeFile(configPath, JSON.stringify(conf, null, 2), (e) => {
              if (e) reject(e);

              ga.trackEvent({
                category: 'user',
                action: 'login',
                label: 'cli'
              }, function authenticated () {
                resolve(conf);
              });
            });
          });
      });
    }
  });
}
