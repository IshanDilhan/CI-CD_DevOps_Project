const { test } = require('node:test');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

test('renders the existing todo UI with portfolio branding and CRUD controls', () => {
  const result = esbuild.buildSync({
    entryPoints: ['src/App.js'], bundle: true, write: false, platform: 'node',
    format: 'cjs', loader: { '.js': 'jsx', '.css': 'empty' }, external: ['react']
  });
  const output = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, output, output.exports);
  const html = renderToStaticMarkup(React.createElement(output.exports.default));
  assert.match(html, /DevOps Todo Lab/);
  assert.match(html, /<form/);
  assert.match(html, />Add</);
  assert.match(html, /Description/);
  assert.match(html, /Delete/);
  assert.doesNotMatch(html, /Cloud&amp;Cloud/);
});
