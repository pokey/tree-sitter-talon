const childProcess = require('child_process');
const fs = require('fs');
const packageJson = require('../package.json');
const path = require('path');
const ParserNode = require('tree-sitter');
const ParserWasm = require('web-tree-sitter');

function getTestModes() {
  const MODES = ['node', 'wasm'];
  return MODES.includes(process.env.MODE) ? [process.env.MODE] : MODES;
}

async function createParserNode() {
  const pathToTreeSitterTalonNode = `../prebuilds/${process.platform}-${process.arch}/tree-sitter-talon.node`
  const TalonNode = require(pathToTreeSitterTalonNode);
  return new ParserNode().setLanguage(TalonNode);
}

async function createParserWasm() {
  await ParserWasm.init();
  const pathToTreeSitterTalonWasm = path.resolve(__dirname, '..', 'tree-sitter-talon.wasm')
  const TalonWasm = await ParserWasm.Language.load(pathToTreeSitterTalonWasm);
  return new ParserWasm().setLanguage(TalonWasm);
}

async function createParser(MODE) {
  switch (MODE) {
    // Load tree-sitter and tree-sitter-talon.node
    case 'node': {
      return await createParserNode();
    };
    // Load web-tree-sitter and tree-sitter-talon.wasm
    case 'wasm': {
      return await createParserWasm();
    };
  }
}

const RE_GITHUB_URL = /^github:(?<user>[^/]+)\/(?<repo>[^#]+)#(?<hash>.+)$/;
const TEST_DATA_DIR = path.join(__dirname, 'data');

function fetchTestData(url) {
  const match = url.match(RE_GITHUB_URL);
  if (match !== undefined) {
    const { user, repo, hash } = match.groups;
    if (!fs.existsSync(TEST_DATA_DIR)) {
      fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
    }
    const dataDir = path.join(TEST_DATA_DIR, user, repo);
    if (!fs.existsSync(dataDir)) {
      childProcess.execSync(`git clone 'https://github.com/${user}/${repo}' '${dataDir}'`);
    }
    childProcess.execSync(`git fetch --quiet`, { cwd: dataDir });
    childProcess.execSync(`git reset --hard "${hash}" --quiet`, { cwd: dataDir });
    return dataDir;
  }
}

function fetchAllTestData() {
  const urls = packageJson?.['tree-sitter-talon']?.['tested-with'];
  const dirs = [];
  if (urls !== undefined && Array.isArray(urls)) {
    for (const url of urls) {
      dirs.push(fetchTestData(url));
    }
  }
  return dirs;
}

module.exports = { fetchAllTestData, fetchTestData, getTestModes, createParserNode, createParserWasm, createParser };
