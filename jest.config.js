/** @type {import('jest').Config} */
const config = {
  testPathIgnorePatterns: [
    "/node_modules/",
    "/emsdk-cache/",
  ]
};
module.exports = config;
