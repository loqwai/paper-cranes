#!/usr/bin/env node
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Process screenshots: resize and convert PNG to JPEG
 * Maintains vampire naming convention
 */

const CONFIG = {
    sourceDir: path.join(__dirname, '../screenshots'),
    targetDir: path.join(__dirname, '../dist/screenshots'),
    maxWidth: 800,
    maxHeight: 800,
    jpegQuality: 85,
    // Match vampire naming pattern
    vampirePattern: /^[\d\-T:.Z]+🦇🌙.*\.(png|jpg|jpeg)$/i
};

async function processScreenshots() {
    console.log('🦇 Processing screenshots for the vampire rave...\n');
    
    // Check if ImageMagick is installed
    try {
        await execAsync('convert --version');
    } catch (error) {
        console.error('❌ ImageMagick is not installed!');
        console.error('Please install it:');
        console.error('  macOS: brew install imagemagick');
        console.error('  Ubuntu: sudo apt-get install imagemagick');
        console.error('  Windows: Download from https://imagemagick.org/script/download.php');
        process.exit(1);
    }
    
    // Create target directory if it doesn't exist
    if (!fs.existsSync(CONFIG.targetDir)) {
        fs.mkdirSync(CONFIG.targetDir, { recursive: true });
    }
    
    // Process all images recursively
    const processed = await processDirectory(CONFIG.sourceDir, CONFIG.targetDir);
    
    console.log(`\n✅ Processed ${processed} images!`);
    console.log(`📂 Output directory: ${CONFIG.targetDir}`);
}

async function processDirectory(sourceDir, targetDir) {
    let processedCount = 0;
    
    // Ensure target directory exists
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    
    const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
    
    for (const entry of entries) {
        const sourcePath = path.join(sourceDir, entry.name);
        const targetPath = path.join(targetDir, entry.name);
        
        if (entry.isDirectory()) {
            // Recursively process subdirectories
            processedCount += await processDirectory(sourcePath, targetPath);
        } else if (entry.isFile() && isImageFile(entry.name)) {
            // Process image file
            const processed = await processImage(sourcePath, targetDir, entry.name);
            if (processed) processedCount++;
        }
    }
    
    return processedCount;
}

function isImageFile(filename) {
    return /\.(png|jpg|jpeg|webp)$/i.test(filename);
}

async function processImage(sourcePath, targetDir, filename) {
    try {
        // Determine output filename (convert PNG to JPG)
        let outputFilename = filename;
        if (filename.toLowerCase().endsWith('.png')) {
            outputFilename = filename.slice(0, -4) + '.jpg';
        }
        
        const targetPath = path.join(targetDir, outputFilename);
        
        // Check if already processed (skip if target is newer)
        if (fs.existsSync(targetPath)) {
            const sourceStats = fs.statSync(sourcePath);
            const targetStats = fs.statSync(targetPath);
            if (targetStats.mtime > sourceStats.mtime) {
                console.log(`⏭️  Skipping (already processed): ${filename}`);
                return false;
            }
        }
        
        // Build ImageMagick command
        const command = [
            'convert',
            `"${sourcePath}"`,
            '-resize', `${CONFIG.maxWidth}x${CONFIG.maxHeight}>`, // Only shrink larger images
            '-quality', CONFIG.jpegQuality,
            '-strip', // Remove metadata
            `"${targetPath}"`
        ].join(' ');
        
        // Execute conversion
        await execAsync(command);
        
        // Copy videos alongside images
        const videoPath = sourcePath.replace(/\.(png|jpg|jpeg)$/i, '.webm');
        if (fs.existsSync(videoPath)) {
            const videoTarget = targetPath.replace(/\.jpg$/i, '.webm');
            fs.copyFileSync(videoPath, videoTarget);
        }
        
        console.log(`✅ Processed: ${filename} → ${outputFilename}`);
        return true;
        
    } catch (error) {
        console.error(`❌ Failed to process ${filename}: ${error.message}`);
        return false;
    }
}

// Additional utility: Watch mode
async function watchScreenshots() {
    console.log('👁️  Watching for new screenshots...\n');
    
    const { watch } = await import('fs');
    
    // Watch the screenshots directory
    const watcher = watch(CONFIG.sourceDir, { recursive: true }, async (eventType, filename) => {
        if (eventType === 'change' && filename && isImageFile(filename)) {
            const sourcePath = path.join(CONFIG.sourceDir, filename);
            const targetSubdir = path.dirname(filename);
            const targetDir = path.join(CONFIG.targetDir, targetSubdir);
            
            console.log(`\n🔄 Change detected: ${filename}`);
            await processImage(sourcePath, targetDir, path.basename(filename));
        }
    });
    
    console.log('Press Ctrl+C to stop watching.\n');
    
    // Keep process alive
    process.on('SIGINT', () => {
        console.log('\n👋 Stopping watch mode.');
        watcher.close();
        process.exit(0);
    });
}

// Copy timeline JSON files
async function copyTimelineFiles(sourceDir, targetDir) {
    const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
    
    for (const entry of entries) {
        const sourcePath = path.join(sourceDir, entry.name);
        const targetPath = path.join(targetDir, entry.name);
        
        if (entry.isDirectory()) {
            if (!fs.existsSync(targetPath)) {
                fs.mkdirSync(targetPath, { recursive: true });
            }
            await copyTimelineFiles(sourcePath, targetPath);
        } else if (entry.name === 'timeline.json') {
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`📄 Copied timeline: ${targetPath}`);
        }
    }
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--watch')) {
    // Watch mode
    processScreenshots().then(() => watchScreenshots());
} else if (args.includes('--help')) {
    console.log(`
Screenshot Processor

Usage: node process-screenshots.js [options]

Options:
  --watch    Watch for changes and process automatically
  --help     Show this help message

This script:
- Converts PNG screenshots to JPEG
- Resizes images to max 800x800 (maintaining aspect ratio)
- Preserves vampire naming convention
- Copies associated .webm videos
- Copies timeline.json files
    `);
} else {
    // One-time processing
    processScreenshots()
        .then(() => copyTimelineFiles(CONFIG.sourceDir, CONFIG.targetDir))
        .catch(console.error);
}