const { beforeEach, describe, expect, it } = require('@jest/globals');
const { modes, setup } = require('./common.js');
const { globSync } = require('glob');
const fs = require('fs');

const MODES = modes();
const REPOS = fs.readdirSync('./examples');
const TABLE = MODES.flatMap((mode) => REPOS.map((repo) => [repo, mode]));

describe.each(TABLE)('%s [%s]', (REPO, MODE) => {
  let parser;
  beforeEach(async () => { parser = await setup(MODE) });
  const files = globSync(`./examples/${REPO}/**/*.talon`);
  it.each(files)('%s', (file) => {
    const sourceCode = fs.readFileSync(file, 'utf8')
    const tree = parser.parse(sourceCode);
    expect(tree).toBeDefined();
  });
});
