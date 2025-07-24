#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Simple visual verification tool
 * Generates an HTML page showing the latest frame from each shader test
 */
function generateVisualCheck() {
    const outputDirs = ['../../test-output', '../../test-output-quick'];
    const images = [];
    
    for (const outputDir of outputDirs) {
        const fullPath = path.join(__dirname, outputDir);
        if (!fs.existsSync(fullPath)) continue;
        
        // Find all image files
        function findImages(dir, prefix = '') {
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    
                    if (entry.isDirectory() && entry.name !== 'videos') {
                        findImages(fullPath, path.join(prefix, entry.name));
                    } else if (entry.isFile() && entry.name.endsWith('.png')) {
                        const relativePath = path.join(prefix, entry.name);
                        const shaderMatch = prefix.match(/^([^\/]+)/);
                        const shaderName = shaderMatch ? shaderMatch[1] : 'unknown';
                        
                        images.push({
                            path: path.join(outputDir, relativePath),
                            shader: shaderName,
                            filename: entry.name,
                            fullPath: fullPath
                        });
                    }
                }
            } catch (err) {
                console.error(`Error reading ${dir}:`, err.message);
            }
        }
        
        findImages(fullPath);
    }
    
    // Group by shader and pick latest
    const shaderImages = {};
    for (const img of images) {
        if (!shaderImages[img.shader]) {
            shaderImages[img.shader] = [];
        }
        shaderImages[img.shader].push(img);
    }
    
    // Sort and pick representative images
    const selectedImages = [];
    for (const [shader, imgs] of Object.entries(shaderImages)) {
        // Sort by filename (frames are numbered)
        imgs.sort((a, b) => b.filename.localeCompare(a.filename));
        
        // Pick first, middle, and last
        if (imgs.length > 0) {
            selectedImages.push({
                shader,
                first: imgs[imgs.length - 1],
                middle: imgs[Math.floor(imgs.length / 2)],
                last: imgs[0]
            });
        }
    }
    
    // Generate HTML
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>Shader Visual Check</title>
    <style>
        body {
            font-family: -apple-system, sans-serif;
            background: #1a1a1a;
            color: #e0e0e0;
            margin: 0;
            padding: 20px;
        }
        
        h1 {
            text-align: center;
            color: #00ff88;
        }
        
        .info {
            text-align: center;
            color: #888;
            margin-bottom: 30px;
        }
        
        .shader-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .shader-card {
            background: #2a2a2a;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 15px;
        }
        
        .shader-name {
            font-size: 16px;
            font-weight: bold;
            color: #00ccff;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .film-strip-link {
            font-size: 12px;
            font-weight: normal;
            color: #00ff88;
            text-decoration: none;
            padding: 4px 8px;
            border: 1px solid #00ff88;
            border-radius: 4px;
            transition: background 0.2s;
        }
        
        .film-strip-link:hover {
            background: rgba(0, 255, 136, 0.1);
        }
        
        .images {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 5px;
        }
        
        .image-wrapper {
            position: relative;
        }
        
        .image-wrapper img {
            width: 100%;
            height: auto;
            border: 1px solid #444;
            border-radius: 4px;
        }
        
        .image-label {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(0,0,0,0.7);
            color: #aaa;
            font-size: 10px;
            padding: 2px;
            text-align: center;
        }
        
        .error {
            background: #3a2a2a;
            border: 1px solid #ff4444;
            color: #ff6666;
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
        }
        
        .success {
            color: #00ff88;
        }
    </style>
</head>
<body>
    <h1>🎨 Shader Visual Check</h1>
    <div class="info">
        Generated: ${new Date().toLocaleString()}<br>
        Total Shaders: ${selectedImages.length}
    </div>
    
    <div class="shader-grid">
        ${selectedImages.map(({ shader, first, middle, last }) => `
            <div class="shader-card">
                <div class="shader-name">
                    <span>${shader}</span>
                    <a href="film-strip-viewer.html?shader=${encodeURIComponent(shader)}" class="film-strip-link">
                        🎬 View Film Strip
                    </a>
                </div>
                <div class="images">
                    ${first ? `
                        <div class="image-wrapper">
                            <img src="${first.path}" alt="${shader} first frame">
                            <div class="image-label">First</div>
                        </div>
                    ` : '<div class="error">No first frame</div>'}
                    
                    ${middle && middle !== first ? `
                        <div class="image-wrapper">
                            <img src="${middle.path}" alt="${shader} middle frame">
                            <div class="image-label">Middle</div>
                        </div>
                    ` : '<div></div>'}
                    
                    ${last && last !== first ? `
                        <div class="image-wrapper">
                            <img src="${last.path}" alt="${shader} last frame">
                            <div class="image-label">Last</div>
                        </div>
                    ` : '<div></div>'}
                </div>
            </div>
        `).join('')}
    </div>
    
    <script>
        // Simple image analysis
        document.querySelectorAll('img').forEach(img => {
            img.onerror = function() {
                this.parentElement.innerHTML = '<div class="error">Failed to load</div>';
            };
            
            img.onload = function() {
                // Create canvas for basic analysis
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 10;
                canvas.height = 10;
                
                try {
                    ctx.drawImage(img, 0, 0, 10, 10);
                    const data = ctx.getImageData(0, 0, 10, 10).data;
                    
                    let totalBrightness = 0;
                    for (let i = 0; i < data.length; i += 4) {
                        totalBrightness += (data[i] + data[i+1] + data[i+2]) / 3;
                    }
                    
                    const avgBrightness = totalBrightness / (data.length / 4);
                    
                    if (avgBrightness < 5) {
                        img.style.border = '2px solid #ff4444';
                        img.title = 'Warning: Possibly black frame';
                    } else if (avgBrightness > 250) {
                        img.style.border = '2px solid #ffaa00';
                        img.title = 'Warning: Possibly white/blown out';
                    } else {
                        img.style.border = '2px solid #00ff88';
                        img.title = 'Looks good!';
                    }
                } catch(e) {
                    // Canvas error - ignore
                }
            };
        });
    </script>
</body>
</html>`;
    
    const outputPath = path.join(__dirname, '../../visual-check.html');
    fs.writeFileSync(outputPath, html);
    
    console.log(`\n✅ Visual check page generated!`);
    console.log(`📂 Open in browser: file://${path.resolve(outputPath)}\n`);
    
    // Also log summary
    console.log('Shader Summary:');
    for (const { shader, first, middle, last } of selectedImages) {
        const frameCount = shaderImages[shader].length;
        console.log(`  ${shader}: ${frameCount} frames captured`);
    }
}

// Run
generateVisualCheck();