#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

const MODEL_PATH = path.resolve(__dirname, '..', 'assets', 'models', 'facenet_mobile.tflite');
const MAX_RECOMMENDED_BYTES = 8 * 1024 * 1024;

function size(file) {
  try { return fs.statSync(file).size; } catch { return 0; }
}

function fetchTo(url, destPath) {
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(destPath);
    https.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        out.close();
        fs.unlinkSync(destPath);
        return resolve(fetchTo(res.headers.location, destPath));
      }
      if (res.statusCode !== 200) {
        out.close();
        try { fs.unlinkSync(destPath); } catch {}
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(out);
      out.on('finish', () => out.close(() => resolve(undefined)));
    }).on('error', (err) => {
      try { fs.unlinkSync(destPath); } catch {}
      reject(err);
    });
  });
}

async function main() {
  const sourceUrl = process.argv[2];
  if (!sourceUrl) {
    console.error('Usage: node scripts/download-facenet.js <url-to-tflite>');
    console.error('Recommended models (MobileFaceNet INT8, ~5 MB):');
    console.error('  - https://github.com/sirius-ai/MobileFaceNet_TF/raw/master/arch/pretrained_model/MobileFaceNet_9925_9680.pb');
    console.error('  - (or any other source you trust)');
    process.exit(1);
  }

  const tmp = MODEL_PATH + '.tmp';
  console.log(`Fetching ${sourceUrl} ...`);
  await fetchTo(sourceUrl, tmp);
  const bytes = size(tmp);
  console.log(`Downloaded ${bytes} bytes`);

  const buf = fs.readFileSync(tmp);
  const marker = buf.slice(4, 8).toString('ascii');
  if (marker !== 'TFL3') {
    console.error(`Downloaded file does not look like a TFLite model (bytes 4-7: "${marker}", expected "TFL3"). Aborting.`);
    fs.unlinkSync(tmp);
    process.exit(2);
  }

  if (bytes > MAX_RECOMMENDED_BYTES) {
    console.warn(`Warning: model is ${(bytes / 1024 / 1024).toFixed(1)} MB — larger than recommended (~${MAX_RECOMMENDED_BYTES / 1024 / 1024} MB).`);
  }

  fs.renameSync(tmp, MODEL_PATH);
  console.log(`Replaced ${MODEL_PATH}`);
}

main().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(3);
});
