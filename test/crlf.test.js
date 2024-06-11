const { beforeAll, describe, expect, it } = require('@jest/globals');
const path = require('path');
let ParserWasm = require('web-tree-sitter');
let ParserNode = require('tree-sitter');

describe.each([
  { name: 'wasm' },
  { name: 'node' },
])('tree-sitter-talon [$name]', ({ name }) => {
  let parser;
  beforeAll(async () => {
    // Initialise web-tree-sitter
    return await ParserWasm.init();
  });
  beforeEach(async () => {
    // Load tree-sitter-talon.wasm
    if (name === 'wasm') {
      const pathToTreeSitterTalonWasm = path.resolve(__dirname, '..', 'tree-sitter-talon.wasm')
      const TalonWasm = await ParserWasm.Language.load(pathToTreeSitterTalonWasm);
      parser = new ParserWasm().setLanguage(TalonWasm);
    }
    // Load tree-sitter-talon.node
    if (name === 'node') {
      const pathToTreeSitterTalonNode = `../prebuilds/${process.platform}-${process.arch}/tree-sitter-talon.node`
      const TalonNode = require(pathToTreeSitterTalonNode);
      parser = new ParserNode().setLanguage(TalonNode);
    }
  });
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