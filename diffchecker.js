import request from 'superagent';
import fs from 'fs';
import opener from 'opener';
import prompt from 'prompt';

const API_URI = 'https://diffchecker-api-production.herokuapp.com';

if (process.argv.length !== 4) {
  console.log('There should be 2 arguments. There are only ' + (process.argv.length - 1) + '.\n');
  process.exit(1);
}

function authorization () {
  return new Promise((resolve, reject) => {
    try {
      const config = require('./diffchecker.json');
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

            const config = { authToken: response.body.authToken };

            fs.writeFile('./diffchecker.json', JSON.stringify(config, null, 2), (e) => {
              if (e) reject(e);

              resolve(config);
            });
          });
      });
    }
  });
}

const file1 = fs.readFileSync(process.argv[2], 'utf-8');
const file2 = fs.readFileSync(process.argv[3], 'utf-8');

authorization()
.then(config => {
  request
    .post(API_URI + '/diffs')
    .set('Authorization', 'Bearer ' + config.authToken)
    .send({
      left: file1,
      right: file2,
      expiry: 'hour',
      title: null
    })
    .end((error, response) => {
      if (error) {
        console.log(error);
        process.exit(1);
      }

      const url = 'https://diffchecker.com/' + response.body.slug;

      console.log('Diff created at: ' + url);
      opener(url);
      process.exit();
    });
})
.catch(error => {
  console.log(error);
});
