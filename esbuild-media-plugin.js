import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

/**
 * esbuild plugin for processing screenshot media
 * - Watches screenshots directory
 * - Converts PNG to JPEG with resizing
 * - Copies videos and timeline files
 */

export const mediaProcessingPlugin = {
    name: 'media-processing',
    setup(build) {
        // Configuration
        const config = {
            sourceDir: './screenshots',
            targetDir: './dist/screenshots',
            maxSize: 800,
            jpegQuality: 85
        };
        
        // Ensure target directory exists
        if (!fs.existsSync(config.targetDir)) {
            fs.mkdirSync(config.targetDir, { recursive: true });
        }
        
        // Process media files on build start
        build.onStart(async () => {
            console.log('🦇 Processing vampire rave media...');
            
            try {
                // Check if ImageMagick is available
                await execAsync('convert --version').catch(() => {
                    console.warn('⚠️  ImageMagick not found - skipping image processing');
                    return false;
                });
                
                // Process all media files
                await processMediaDirectory(config.sourceDir, config.targetDir, config);
                
            } catch (error) {
                console.error('Media processing error:', error);
            }
        });
        
        // Watch for new screenshots (in dev mode)
        if (build.initialOptions.watch) {
            const watcher = fs.watch(config.sourceDir, { recursive: true }, async (eventType, filename) => {
                if (!filename) return;
                
                const ext = path.extname(filename).toLowerCase();
                const sourcePath = path.join(config.sourceDir, filename);
                
                // Skip if file doesn't exist (deleted)
                if (!fs.existsSync(sourcePath)) return;
                
                // Process based on file type
                if (['.png', '.jpg', '.jpeg'].includes(ext)) {
                    const targetSubdir = path.dirname(filename);
                    const targetDir = path.join(config.targetDir, targetSubdir);
                    
                    if (!fs.existsSync(targetDir)) {
                        fs.mkdirSync(targetDir, { recursive: true });
                    }
                    
                    await processImage(sourcePath, targetDir, path.basename(filename), config);
                } else if (['.webm', '.mp4'].includes(ext) || filename === 'timeline.json') {
                    // Copy videos and timeline files directly
                    const targetPath = path.join(config.targetDir, filename);
                    const targetDir = path.dirname(targetPath);
                    
                    if (!fs.existsSync(targetDir)) {
                        fs.mkdirSync(targetDir, { recursive: true });
                    }
                    
                    fs.copyFileSync(sourcePath, targetPath);
                    console.log(`📁 Copied: ${filename}`);
                }
            });
            
            // Cleanup watcher on dispose
            build.onDispose(() => {
                watcher.close();
            });
        }
    }
};

async function processMediaDirectory(sourceDir, targetDir, config) {
    if (!fs.existsSync(sourceDir)) return;
    
    const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
    
    for (const entry of entries) {
        const sourcePath = path.join(sourceDir, entry.name);
        const targetPath = path.join(targetDir, entry.name);
        
        if (entry.isDirectory()) {
            // Recursively process subdirectories
            if (!fs.existsSync(targetPath)) {
                fs.mkdirSync(targetPath, { recursive: true });
            }
            await processMediaDirectory(sourcePath, targetPath, config);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            
            if (['.png', '.jpg', '.jpeg'].includes(ext)) {
                // Process image
                await processImage(sourcePath, targetDir, entry.name, config);
            } else if (['.webm', '.mp4'].includes(ext) || entry.name === 'timeline.json') {
                // Copy other media files
                fs.copyFileSync(sourcePath, targetPath);
            }
        }
    }
}

async function processImage(sourcePath, targetDir, filename, config) {
    try {
        // Convert PNG to JPG
        let outputFilename = filename;
        if (filename.toLowerCase().endsWith('.png')) {
            outputFilename = filename.slice(0, -4) + '.jpg';
        }
        
        const targetPath = path.join(targetDir, outputFilename);
        
        // Skip if already processed and up to date
        if (fs.existsSync(targetPath)) {
            const sourceStats = fs.statSync(sourcePath);
            const targetStats = fs.statSync(targetPath);
            if (targetStats.mtime >= sourceStats.mtime) {
                return; // Already processed
            }
        }
        
        // Try to use ImageMagick if available
        try {
            const command = [
                'convert',
                `"${sourcePath}"`,
                '-resize', `${config.maxSize}x${config.maxSize}>`,
                '-quality', config.jpegQuality,
                '-strip',
                `"${targetPath}"`
            ].join(' ');
            
            await execAsync(command);
            console.log(`🖼️  Processed: ${filename}`);
        } catch (error) {
            // Fallback: just copy the file if ImageMagick fails
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`📋 Copied: ${filename} (ImageMagick unavailable)`);
        }
        
    } catch (error) {
        console.error(`Failed to process ${filename}:`, error.message);
    }
}

/**
 * Helper to add media routes to esbuild dev server
 */
export function getMediaRoutes() {
    return {
        '/screenshots': './dist/screenshots'
    };
}