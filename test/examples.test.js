const { beforeEach, describe, expect, it } = require('@jest/globals');
const { fetchAllTestData, getTestModes, createParser } = require('./common.js');
const fs = require('fs');

const MODES = getTestModes();
const TEST_DATA = fetchAllTestData();
const TEST_DIRS = Object.keys(TEST_DATA);

describe.each(MODES)('examples [%s]', (mode) => {
  let parser;
  beforeEach(async () => { parser = await createParser(mode) });
  describe.each(TEST_DIRS)('%s', (testDir) => {
    const testFiles = TEST_DATA[testDir];
    it.each(testFiles)('%s', (testFile) => {
      const sourceCode = fs.readFileSync(testFile, 'utf8')
      const tree = parser.parse(sourceCode);
      expect(tree).toBeDefined();
    });
  });
});
