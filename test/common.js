const path = require('path');
const ParserNode = require('tree-sitter');
const ParserWasm = require('web-tree-sitter');

function modes() {
  const MODES = ['node', 'wasm'];
  return MODES.includes(process.env.MODE) ? [process.env.MODE] : MODES;
}

async function setupNode() {
  const pathToTreeSitterTalonNode = `../prebuilds/${process.platform}-${process.arch}/tree-sitter-talon.node`
  const TalonNode = require(pathToTreeSitterTalonNode);
  return new ParserNode().setLanguage(TalonNode);
}

async function setupWasm() {
  await ParserWasm.init();
  const pathToTreeSitterTalonWasm = path.resolve(__dirname, '..', 'tree-sitter-talon.wasm')
  const TalonWasm = await ParserWasm.Language.load(pathToTreeSitterTalonWasm);
  return new ParserWasm().setLanguage(TalonWasm);
}

async function setup(MODE) {
  switch (MODE) {
    // Load tree-sitter and tree-sitter-talon.node
    case 'node': {
      return await setupNode();
    };
    // Load web-tree-sitter and tree-sitter-talon.wasm
    case 'wasm': {
      return await setupWasm();
    };
  }
}

module.exports = { modes, setupNode, setupWasm, setup };