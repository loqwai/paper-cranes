import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function captureShaderMedia(shaderPath, options = {}) {
    const {
        duration = 5,           // seconds
        fps = 1,               // frames per second
        captureVideo = true,
        width = 800,
        height = 800,
        outputDir = './screenshots'
    } = options;
    
    // Create directory structure
    const shaderName = shaderPath.split('/').pop().replace('.frag', '');
    const baseDir = path.join(outputDir, shaderName);
    const screenshotsDir = path.join(baseDir, 'screenshots');
    const videosDir = path.join(baseDir, 'videos');
    
    // Create directories
    [baseDir, screenshotsDir, videosDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
    
    // Timestamp for this capture session
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    const browser = await chromium.launch({ 
        headless: true
    });
    
    const contextOptions = {
        viewport: { width, height }
    };
    
    // Set up video recording if requested
    if (captureVideo) {
        contextOptions.recordVideo = {
            dir: videosDir,
            size: { width, height }
        };
    }
    
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    
    // Build URL
    const baseUrl = 'http://localhost:6969';
    const url = `${baseUrl}/?shader=${shaderPath}&embed=true`;
    
    console.log(`\nCapturing media for: ${shaderName}`);
    console.log(`URL: ${url}`);
    console.log(`Output directory: ${baseDir}`);
    
    try {
        // Navigate to shader
        await page.goto(url, { waitUntil: 'networkidle' });
        
        // Wait for shader to initialize
        await page.waitForTimeout(1000);
        
        // Capture screenshots at intervals
        const frameCount = duration * fps;
        console.log(`Capturing ${frameCount} screenshots...`);
        
        for (let i = 0; i < frameCount; i++) {
            const filename = `${shaderName}-${timestamp}-frame-${String(i).padStart(3, '0')}.png`;
            const filepath = path.join(screenshotsDir, filename);
            
            await page.screenshot({ path: filepath });
            console.log(`  Frame ${i + 1}/${frameCount}: ${filename}`);
            
            // Wait for next frame (except after last frame)
            if (i < frameCount - 1) {
                await page.waitForTimeout(1000 / fps);
            }
        }
        
        // Close page to finalize video
        await page.close();
        
        // Save video with proper filename
        if (captureVideo) {
            const video = await context.video();
            if (video) {
                const videoPath = await video.path();
                const newVideoPath = path.join(videosDir, `${shaderName}-${timestamp}.webm`);
                
                // Wait a bit for video to be written
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                if (fs.existsSync(videoPath)) {
                    fs.renameSync(videoPath, newVideoPath);
                    console.log(`Video saved: ${newVideoPath}`);
                }
            }
        }
        
        // Create metadata file
        const metadata = {
            shader: shaderPath,
            shaderName,
            timestamp,
            url,
            duration,
            fps,
            frameCount,
            resolution: { width, height },
            captureVideo,
            frames: Array.from({ length: frameCount }, (_, i) => ({
                index: i,
                filename: `${shaderName}-${timestamp}-frame-${String(i).padStart(3, '0')}.png`,
                time: i / fps
            }))
        };
        
        const metadataPath = path.join(baseDir, `${shaderName}-${timestamp}-metadata.json`);
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
        console.log(`Metadata saved: ${metadataPath}`);
        
        console.log('✓ Media capture complete\n');
        
        return metadata;
        
    } catch (error) {
        console.error(`❌ Error capturing media: ${error.message}`);
        throw error;
    } finally {
        await context.close();
        await browser.close();
    }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const shaderPath = process.argv[2];
    
    if (!shaderPath) {
        console.log(`
Usage: node capture-shader-media.js <shader-path> [options]

Examples:
  node capture-shader-media.js claude-generated/quantum-particles
  node capture-shader-media.js plasma
  node capture-shader-media.js claude-generated/neural-network

The shader path is relative to the shaders directory.
        `);
        process.exit(1);
    }
    
    captureShaderMedia(shaderPath).catch(console.error);
}

export { captureShaderMedia };