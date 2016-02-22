import request from 'superagent';
import opener from 'opener';
import { argv } from 'yargs';

import { config } from './config';
import ga from './ga';
import checkLanguage from './language-detection';

export default function transmit ({ left, right }) {
  request
    .post(process.env.API_URL + '/diffs')
    .set('Authorization', 'Bearer ' + config.authToken)
    .send({
      left,
      right,
      expiry: argv.expires || argv.e || 'forever',
      title: argv.title || null
    })
    .end((error, response) => {
      if (error) {
        console.log(error);
        process.exit(1);
      }

      const url = 'https://www.diffchecker.com/' + response.body.slug;
      const language = checkLanguage(left);

      ga.trackEvent({
        category: 'Diffs',
        action: 'Written in',
        label: language
      });

      ga.trackEvent({
        category: 'Diffs',
        action: 'Submitted from',
        label: 'CLI'
      }, function diffCreateError () {
        console.log('Your diff is ready: ' + url);
        opener(url, () => {
          process.exit();
        });
      });
    });
}
