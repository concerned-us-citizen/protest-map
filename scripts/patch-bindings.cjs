/* eslint-disable */
/**
 * Node.js 24 changed CallSite.getFileName() to return file:// URLs even for
 * CJS modules. bindings.js compares fileName !== __filename, but __filename
 * is a plain path, so the comparison fails on bindings' own stack frame and
 * it uses node_modules/bindings/ as the module root instead of the calling
 * package's root. This patches the comparison to handle both formats.
 */
const fs = require('fs');
const path = require('path');

const bindingsFile = path.resolve(__dirname, '../node_modules/bindings/bindings.js');

if (!fs.existsSync(bindingsFile)) process.exit(0);

let content = fs.readFileSync(bindingsFile, 'utf8');

if (content.includes('NODE24FIX')) process.exit(0);

content = content.replace(
  'if (fileName !== __filename) {',
  'if (fileName !== __filename && fileName !== ("file://" + __filename)) { // NODE24FIX'
);

fs.writeFileSync(bindingsFile, content);
console.log('Patched bindings.js for Node.js 24 compatibility');
