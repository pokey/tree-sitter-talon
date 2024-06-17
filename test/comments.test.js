const { beforeEach, describe, expect, it } = require('@jest/globals');
const { getTestModes, createParser } = require('./common.js');

const MODES = getTestModes();
describe.each(MODES)('comments [%s]', (MODE) => {
  let parser;
  beforeEach(async () => { parser = await createParser(MODE) });
  it('should strip newlines from comments', () => {
    const sourceCode = '# Comment\n-';
    const tree = parser.parse(sourceCode);
    expect(tree.rootNode.child(0).text).toEqual('# Comment');
  })
  it('should strip CRLFs from comments', () => {
    const sourceCode = '# Comment\r\n-';
    const tree = parser.parse(sourceCode);
    expect(tree.rootNode.child(0).text).toEqual('# Comment');
  });
});
