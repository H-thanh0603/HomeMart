'use strict';
/**
 * Custom Jest transformer cho các file .js ESM trong node_modules (NestJS 12
 * ship ESM-only). esbuild transpile ESM → CJS, hiểu cả `import.meta`.
 *
 * Chỉ áp dụng cho .js; file .ts vẫn do ts-jest transform (decorators OK).
 */
const esbuild = require('esbuild');

module.exports = {
  process(sourceText, sourcePath) {
    const result = esbuild.buildSync({
      stdin: {
        contents: sourceText,
        loader: 'js',
        resolveDir: require('path').dirname(sourcePath),
        sourcefile: sourcePath,
      },
      bundle: false,
      format: 'cjs',
      target: 'node20',
      write: false,
    });
    return { code: result.outputFiles[0].text };
  },
};
