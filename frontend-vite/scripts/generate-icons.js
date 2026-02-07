
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '../public');
const SVG_Source = path.join(PUBLIC_DIR, 'logo.svg');

const sizes = [
    { name: 'pwa-192x192.png', size: 192 },
    { name: 'pwa-512x512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'favicon.png', size: 64 }
];

async function generate() {
    console.log(`Generating icons from ${SVG_Source}...`);

    if (!fs.existsSync(SVG_Source)) {
        console.error("Source SVG not found!");
        process.exit(1);
    }

    // Force background to match index.html
    const bg = { r: 18, g: 18, b: 18, alpha: 1 }; // #121212

    for (const icon of sizes) {
        const dest = path.join(PUBLIC_DIR, icon.name);
        console.log(`Creating ${icon.name} (${icon.size}x${icon.size})...`);

        await sharp(SVG_Source)
            .resize(icon.size, icon.size)
            .png()
            .toFile(dest);
    }

    // Also copy favicon.png to favicon.ico for legacy compatibility (just a copy, standard practice now)
    // Or we can just leave it as png.
    // Let's create a specific .ico if possible, but sharp defaults to png. 
    // We'll just copy favicon.png to favicon.ico as a fallback.
    fs.copyFileSync(path.join(PUBLIC_DIR, 'favicon.png'), path.join(PUBLIC_DIR, 'favicon.ico'));

    console.log("Icons generated successfully!");
}

generate().catch(err => {
    console.error("Error generating icons:", err);
    process.exit(1);
});
