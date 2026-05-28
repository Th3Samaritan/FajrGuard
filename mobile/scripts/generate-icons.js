const sharp = require('sharp');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');
const svgPath = path.join(assetsDir, 'icon.svg');

const sizes = [
  { name: 'icon.png', width: 1024, height: 1024 },
  { name: 'adaptive-icon.png', width: 1024, height: 1024 },
  { name: 'favicon.png', width: 48, height: 48 },
  { name: 'splash-icon.png', width: 128, height: 128 },
];

async function convert() {
  for (const size of sizes) {
    const outputPath = path.join(assetsDir, size.name);
    await sharp(svgPath)
      .resize(size.width, size.height)
      .png()
      .toFile(outputPath);
    console.log(`Created ${size.name} (${size.width}x${size.height})`);
  }
  console.log('All icons generated.');
}

convert().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
