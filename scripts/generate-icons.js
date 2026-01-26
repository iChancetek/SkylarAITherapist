const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceImage = process.argv[2];
const publicDir = path.join(__dirname, '..', 'public');

if (!fs.existsSync(sourceImage)) {
    console.error('Source image not found:', sourceImage);
    process.exit(1);
}

async function generateIcons() {
    try {
        console.log(`Processing ${sourceImage}...`);

        // Generate 192x192
        await sharp(sourceImage)
            .resize(192, 192)
            .toFile(path.join(publicDir, 'icon-192.png'));
        console.log('✓ Created public/icon-192.png');

        // Generate 512x512
        await sharp(sourceImage)
            .resize(512, 512)
            .toFile(path.join(publicDir, 'icon-512.png'));
        console.log('✓ Created public/icon-512.png');

    } catch (error) {
        console.error('Error processing icons:', error);
        process.exit(1);
    }
}

generateIcons();
