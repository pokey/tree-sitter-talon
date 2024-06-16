const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const REPOS = [
  {
    "owner": "AndreasArvidsson",
    "name": "andreas-talon",
    "commit": "43811bae4c1a75f2ecd29240891f6612a1b7cec5"
  },
  {
    "owner": "nriley",
    "name": "talon_community",
    "commit": "1ff0e36f47689193be1d8909b9935f7c7004a045"
  },
  {
    "owner": "phillco",
    "name": "talon-axkit",
    "commit": "8eecc78b2de65b68123a6e1eae72a5a790a4e407"
  },
  {
    "owner": "talonhub",
    "name": "community",
    "commit": "93c9261c240078c46290ae1a500f2c9cfc749833"
  },
]

const pathToExamples = path.join('test', 'examples');
fs.mkdirSync(pathToExamples, { recursive: true });
for (const { owner, name, commit } of REPOS) {
  const pathToTarget = path.join(pathToExamples, `${owner}-${name}`);
  if (!fs.existsSync(pathToTarget)) {
    childProcess.execSync(`git clone https://github.com/${owner}/${name} ${pathToTarget}`);
  }
  childProcess.execSync(`git fetch --quiet`, { cwd: pathToTarget });
  childProcess.execSync(`git reset --hard "${commit}" --quiet`, { cwd: pathToTarget });
}
