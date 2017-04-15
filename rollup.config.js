import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import nodeGlobals from 'rollup-plugin-node-globals';

export default {
  entry: 'src/index.js',
  dest: 'dist/browser.js',
  format: 'es',
  format: 'iife',
  moduleName: 'observe',
  sourceMap: true,
  plugins: [
    nodeResolve({
      jsnext: true,
      main: true,
      browser: true
    }),
    commonjs(),
    nodeGlobals(),
  ],
};
