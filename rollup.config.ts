import { getBabelOutputPlugin } from '@rollup/plugin-babel';

export default {
  input: 'tmp/index.js',
  output: {
    file: 'dist/index.js',
    format: 'cjs',
  },
  plugins: [
    getBabelOutputPlugin({
      presets: ['@babel/preset-env'],
    }),
  ],
};
