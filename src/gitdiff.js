import git from 'git-fs';
import spawn from 'child_process';

export default function gitDiff (source) {
  return new Promise((resolve, reject) => {
    spawn.exec('git rev-parse --show-toplevel', (error, dir) => {
      if (error || dir.length === 0) return reject(new Error("Tried to look for a git version of that file, but couldn't locate a git repository nearby."));

      const gitDir = dir.trim('\n');

      /* Uses git-fs to look in the git repo as if it were a file system (like fs). */
      git(gitDir);
      git.getHead((err, hash) => {
        if (err) return reject(new Error("Couldn't get the hash of the most recent commit."));

        git.readFile(hash, source, 'utf8', (e, data) => {
          if (e) return reject(new Error("Couldn't read the file from the git repository. Are you sure it exists in the latest commit?"));

          resolve(data);
        });
      });
    });
  });
}
