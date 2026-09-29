const esbuild = require('esbuild');
const fs = require('node:fs');
fs.mkdirSync('build', { recursive: true });
fs.copyFileSync('public/index.html', 'build/index.html');
esbuild.buildSync({
  entryPoints: ['src/index.js'], bundle: true, minify: true,
  outfile: 'build/app.js', loader: { '.js': 'jsx' },
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'eof'
});