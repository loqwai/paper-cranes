const esbuild = require('esbuild');
const path = require('path');
const ncp = require('ncp').ncp;
// Define your entry points
const entryPoints = ['index.js', 'service-worker.js'];

// esbuild configuration for tree-shaking
esbuild.build({
  entryPoints: entryPoints,
  bundle: true,
  minify: true,
  sourcemap: true,
  outdir: path.join(__dirname, 'dist'),
  treeShaking: true, // The essence of your quest
}).then(() => {
  ncp('index.html', 'dist/')
  ncp('index.css', 'dist/')
  ncp('favicon.ico', 'dist/favicon.ico')
  ncp('shaders', 'dist/shaders')
  ncp('./src/audio/analyzers', 'dist/analyzers')
  ncp('./src/utils', './dist/utils')
}).catch(console.error)
