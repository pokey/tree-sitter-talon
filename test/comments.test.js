const { beforeEach, describe, expect, it } = require('@jest/globals');
const { modes, setup } = require('./common.js');

const MODES = modes();
describe.each(MODES)('comments [%s]', (MODE) => {
  let parser;
  beforeEach(async () => { parser = await setup(MODE) });
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
