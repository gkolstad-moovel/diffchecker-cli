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
