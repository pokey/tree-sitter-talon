const { beforeEach, describe, expect, it } = require('@jest/globals');
const { fetchAllTestData, getTestModes, createParser } = require('./common.js');
const { globSync } = require('glob');
const fs = require('fs');
const path = require('path');

const MODES = getTestModes();
const TEST_DATA_DIRS = fetchAllTestData();
describe.each(MODES)('examples [%s]', (mode) => {
  let parser;
  beforeEach(async () => { parser = await createParser(mode) });
  describe.each(TEST_DATA_DIRS)('%s', (testDataDir) => {
    const testDataFiles = globSync(path.join(testDataDir, '**', '*.talon'));
    it.each(testDataFiles)('%s', (testDataFile) => {
      const sourceCode = fs.readFileSync(testDataFile, 'utf8')
      const tree = parser.parse(sourceCode);
      expect(tree).toBeDefined();
    });
  });
});
