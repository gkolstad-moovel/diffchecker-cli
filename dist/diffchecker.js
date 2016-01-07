#!/usr/bin/env node
'use strict';

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _opener = require('opener');

var _opener2 = _interopRequireDefault(_opener);

var _prompt = require('prompt');

var _prompt2 = _interopRequireDefault(_prompt);

var _gitFs = require('git-fs');

var _gitFs2 = _interopRequireDefault(_gitFs);

var _ga = require('ga');

var _ga2 = _interopRequireDefault(_ga);

var _minimist = require('minimist');

var _minimist2 = _interopRequireDefault(_minimist);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var API_URI = 'https://diffchecker-api-production.herokuapp.com';
var ga = new _ga2.default('UA-8857839-4', 'http://www.diffchecker.com');
var options = (0, _minimist2.default)(process.argv.slice(2));

function getConfigPath() {
  var userHomePath = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
  return _path2.default.join(userHomePath, '/diffchecker.json');
}

function authorization() {
  return new Promise(function (resolve, reject) {
    try {
      var config = require(getConfigPath());
      resolve(config);
    } catch (err) {
      console.log("You don't appear to be logged in. Sign up for a free account at https://www.diffchecker.com/signup and enter your credentials.");
      _prompt2.default.start();
      _prompt2.default.get({
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
      }, function (error, result) {
        _superagent2.default.post(API_URI + '/sessions').send(result).end(function (er, response) {
          if (er) reject(er);
          ga.trackEvent({
            category: 'user',
            action: 'login',
            label: 'client',
            value: 'cli'
          });

          var conf = { authToken: response.body.authToken };

          _fs2.default.writeFile(getConfigPath(), JSON.stringify(conf, null, 2), function (e) {
            if (e) reject(e);

            resolve(conf);
          });
        });
      });
    }
  });
}

function gitDiff(source) {
  return new Promise(function (resolve, reject) {
    require('child_process').exec('git rev-parse --show-toplevel', function (error, dir) {
      if (error) reject(Error("Tried to look for a git version of that file, but couldn't locate a git repository nearby."));

      var gitDir = dir.trim('\n');

      (0, _gitFs2.default)(gitDir);
      _gitFs2.default.getHead(function (err, hash) {
        if (err) reject(Error("Couldn't get the hash of the most recent commit."));

        _gitFs2.default.readFile(hash, source, 'utf8', function (e, data) {
          if (e) reject(Error("Couldn't read the file from the git repository. Are you sure it exists in the latest commit?"));

          resolve(data);
        });
      });
    });
  });
}

authorization().then(function (conf) {
  function transmit(_ref) {
    var left = _ref.left;
    var right = _ref.right;

    _superagent2.default.post(API_URI + '/diffs').set('Authorization', 'Bearer ' + conf.authToken).send({
      left: left,
      right: right,
      expiry: options.expire || 'hour',
      title: options.title || null
    }).end(function (error, response) {
      if (error) {
        console.log(error);
        process.exit(1);
      }

      var url = 'https://diffchecker.com/' + response.body.slug;

      ga.trackEvent({
        category: 'diff',
        action: 'submit',
        label: 'client'
      }, function diffCreateError(e) {
        if (e) console.log('diff create error', e);
        console.log('Your diff is ready: ' + url);
        (0, _opener2.default)(url);
      });
    });
  }

  /* Check if there's just one argument. If there is, assume user wants to compare with most recent git commit. Otherwise, read the next argument as a file to compare with. */

  if (options.signout) {
    _fs2.default.unlink(getConfigPath(), function () {
      console.log("You've been signed out. Run the command again to sign in.");
      process.exit();
    });
  } else if (options._.length === 1) {
    gitDiff(options._[0]).then(function (left) {
      transmit({
        left: left,
        'right': _fs2.default.readFileSync(options._[0], 'utf-8')
      });
    });
  } else {
    transmit({
      left: _fs2.default.readFileSync(options._[0], 'utf-8'),
      right: _fs2.default.readFileSync(options._[0], 'utf-8')
    });
  }
});
