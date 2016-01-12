## Diffchecker for the Terminal

Now you can create cloud-hosted diffs right from the command line. Easily compare 2 files, or compare a current file with the version of itself from the most recent commit.

Why use this instead of a native app? Because your diffs are instantly uploaded so you can share them with others.

## Installation

First, make sure you have Node with npm installed from [nodejs.org](https://nodejs.org)

`npm install -g diffchecker`

## Usage

**To compare two files:**

`diffchecker file1.js file2.js`

**To compare a file with it's version from the most recent git commit:**

`diffchecker file1.js`

Both methods will open the diff in your default browser.

By default, the diff will expire in 1 hour. You can change it to 1 day, 1 month or forever like this:

`diffchecker --expire day file1.js file2.js`

Should you want to sign out:

`diffchecker --signout`
