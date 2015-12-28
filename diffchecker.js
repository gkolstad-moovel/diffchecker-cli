import request from 'superagent';
import fs from 'fs';
import opener from 'opener';

if (process.argv.length !== 4) {
  console.log("There should be 2 arguments. There are only " + (process.argv.length - 1) + ".\n");
  process.exit(1);
}

const file1 = fs.readFileSync(process.argv[2], 'utf-8');
const file2 = fs.readFileSync(process.argv[3], 'utf-8');

request
  .post('https://diffchecker-api-production.herokuapp.com/diffs')
  .send({
    left: file1,
    right: file2,
    expiry: 'hour',
    title: null
  })
  .end( (error, response) => {
    if (error) {
      console.log(error);
      process.exit(1);
    }

    const url = 'http://diffchecker.com/' + response.body.slug;

    console.log(url + '\n');
    opener(url);
    process.exit();
  });
