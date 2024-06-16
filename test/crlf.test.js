const { beforeAll, describe, expect, it } = require('@jest/globals');
const path = require('path');
const ParserNode = require('tree-sitter');
const ParserWasm = require('web-tree-sitter');

const MODES = ['node', 'wasm'];
describe.each(
  MODES.includes(process.env.MODE) ? [process.env.MODE] : MODES
)('tree-sitter-talon [%s]',
  (MODE) => {
    let parser;
    beforeEach(async () => {
      switch (MODE) {
        // Load tree-sitter and tree-sitter-talon.node
        case 'node': {
          const pathToTreeSitterTalonNode = `../prebuilds/${process.platform}-${process.arch}/tree-sitter-talon.node`
          const TalonNode = require(pathToTreeSitterTalonNode);
          parser = new ParserNode().setLanguage(TalonNode);
        };
        // Load web-tree-sitter and tree-sitter-talon.wasm
        case 'wasm': {
          await ParserWasm.init();
          const pathToTreeSitterTalonWasm = path.resolve(__dirname, '..', 'tree-sitter-talon.wasm')
          const TalonWasm = await ParserWasm.Language.load(pathToTreeSitterTalonWasm);
          parser = new ParserWasm().setLanguage(TalonWasm);
        };
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