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
}).then(async () => {
  await new Promise((next) => {
    let i = 0;
    const done = () => { if (++i == 6) next() }
    ncp('index.html', 'dist/index.html', done)
    ncp('index.css', 'dist/index.css'), done
    ncp('favicon.ico', 'dist/favicon.ico', done)
    ncp('shaders', 'dist/shaders', done)
    ncp('./src/audio/analyzers', 'dist/analyzers', done)
    ncp('./src/utils', './dist/utils', done)
  });
}).catch(console.error)
