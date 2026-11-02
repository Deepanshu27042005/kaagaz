const fs = require('fs');
const path = require('path');

const publicDir = path.resolve(__dirname, '..', 'public');
const tesseractDir = path.join(publicDir, 'tesseract');
const tesseractPackage = path.dirname(require.resolve('tesseract.js/package.json'));
const corePackage = path.dirname(require.resolve('tesseract.js-core/package.json'));
const pdfjsPackage = path.dirname(require.resolve('pdfjs-dist/package.json'));

fs.mkdirSync(tesseractDir, { recursive: true });

const assets = [
  [path.join(tesseractPackage, 'dist', 'worker.min.js'), path.join(tesseractDir, 'worker.min.js')],
  [path.join(corePackage, 'tesseract-core-simd-lstm.wasm.js'), path.join(tesseractDir, 'tesseract-core-simd-lstm.wasm.js')],
  [path.join(corePackage, 'tesseract-core-simd-lstm.wasm'), path.join(tesseractDir, 'tesseract-core-simd-lstm.wasm')],
  [path.join(corePackage, 'tesseract-core-lstm.wasm.js'), path.join(tesseractDir, 'tesseract-core-lstm.wasm.js')],
  [path.join(corePackage, 'tesseract-core-lstm.wasm'), path.join(tesseractDir, 'tesseract-core-lstm.wasm')],
  [path.join(pdfjsPackage, 'build', 'pdf.worker.min.mjs'), path.join(publicDir, 'pdf.worker.min.mjs')],
];

for (const [source, destination] of assets) {
  if (!fs.existsSync(source)) {
    throw new Error(`Required OCR asset was not found: ${source}`);
  }
  fs.copyFileSync(source, destination);
}
