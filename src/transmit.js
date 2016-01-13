import request from 'superagent';
import opener from 'opener';
import { argv } from 'yargs';

import { config } from './config';
import ga from './ga';

export default function transmit ({ left, right }) {
  request
    .post(process.env.API_URL + '/diffs')
    .set('Authorization', 'Bearer ' + config.authToken)
    .send({
      left,
      right,
      expiry: argv.expire || 'forever',
      title: argv.title || null
    })
    .end((error, response) => {
      if (error) {
        console.log(error);
        process.exit(1);
      }

      const url = 'https://www.diffchecker.com/' + response.body.slug;

      ga.trackEvent({
        category: 'diff',
        action: 'submit',
        label: 'cli'
      }, function diffCreateError () {
        console.log('Your diff is ready: ' + url);
        opener(url, () => {
          process.exit();
        });
      });
    });
}
