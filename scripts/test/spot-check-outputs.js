import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate an HTML gallery for spot-checking shader test outputs
 */
function generateSpotCheckGallery() {
    const outputDir = path.join(__dirname, '../../test-output');
    const galleryPath = path.join(outputDir, 'gallery.html');
    
    if (!fs.existsSync(outputDir)) {
        console.error('No test output directory found. Run tests first!');
        return;
    }
    
    // Collect all shader test results
    const shaderResults = [];
    
    // Read directory structure
    const shaderDirs = fs.readdirSync(outputDir).filter(dir => {
        const fullPath = path.join(outputDir, dir);
        return fs.statSync(fullPath).isDirectory() && dir !== 'videos';
    });
    
    for (const shaderName of shaderDirs) {
        const shaderDir = path.join(outputDir, shaderName);
        const sessions = fs.readdirSync(shaderDir).filter(session => {
            const sessionPath = path.join(shaderDir, session);
            return fs.statSync(sessionPath).isDirectory();
        });
        
        for (const sessionId of sessions) {
            const sessionDir = path.join(shaderDir, sessionId);
            const imagesDir = path.join(sessionDir, 'images');
            
            if (fs.existsSync(imagesDir)) {
                const images = fs.readdirSync(imagesDir)
                    .filter(f => f.endsWith('.png'))
                    .sort();
                
                // Sample images: first, middle, last, and a few random ones
                const sampleIndices = [
                    0,
                    Math.floor(images.length * 0.25),
                    Math.floor(images.length * 0.5),
                    Math.floor(images.length * 0.75),
                    images.length - 1
                ];
                
                const samples = sampleIndices
                    .filter(i => i < images.length)
                    .map(i => images[i]);
                
                shaderResults.push({
                    shader: shaderName,
                    session: sessionId,
                    totalFrames: images.length,
                    samples: samples.map(img => 
                        path.relative(outputDir, path.join(imagesDir, img))
                    ),
                    dataPath: path.relative(outputDir, 
                        path.join(sessionDir, 'data', 'session-data.json')
                    )
                });
            }
        }
    }
    
    // Generate HTML
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>Shader Test Output Gallery</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1a1a1a;
            color: #e0e0e0;
            margin: 0;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        
        h1 {
            color: #00ff88;
            margin-bottom: 10px;
        }
        
        .stats {
            color: #888;
            font-size: 14px;
        }
        
        .shader-section {
            background: #2a2a2a;
            border-radius: 8px;
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid #333;
        }
        
        .shader-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .shader-name {
            font-size: 20px;
            color: #00ccff;
            font-weight: bold;
        }
        
        .session-info {
            font-size: 12px;
            color: #666;
        }
        
        .frame-info {
            color: #888;
            font-size: 14px;
        }
        
        .samples {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        
        .sample {
            position: relative;
            background: #1a1a1a;
            border-radius: 4px;
            overflow: hidden;
            border: 1px solid #444;
            transition: transform 0.2s, border-color 0.2s;
        }
        
        .sample:hover {
            transform: scale(1.05);
            border-color: #00ccff;
        }
        
        .sample img {
            width: 100%;
            height: auto;
            display: block;
        }
        
        .sample-label {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.8);
            color: #aaa;
            font-size: 11px;
            padding: 5px;
            text-align: center;
        }
        
        .no-results {
            text-align: center;
            color: #666;
            padding: 40px;
        }
        
        .filter-controls {
            background: #2a2a2a;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
            display: flex;
            gap: 20px;
            align-items: center;
        }
        
        .filter-controls input {
            background: #1a1a1a;
            border: 1px solid #444;
            color: #e0e0e0;
            padding: 8px 12px;
            border-radius: 4px;
            flex: 1;
        }
        
        .warning {
            background: #3a2a00;
            border: 1px solid #665500;
            color: #ffaa00;
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
            font-size: 12px;
        }
        
        .success {
            color: #00ff88;
        }
        
        .error {
            color: #ff4444;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎨 Shader Test Output Gallery</h1>
        <div class="stats">
            Generated: ${new Date().toLocaleString()}<br>
            Total Shaders Tested: ${shaderResults.length}
        </div>
    </div>
    
    <div class="filter-controls">
        <input type="text" id="searchInput" placeholder="Search shaders..." onkeyup="filterShaders()">
    </div>
    
    <div id="gallery">
        ${shaderResults.length === 0 ? 
            '<div class="no-results">No test results found. Run shader tests first!</div>' :
            shaderResults.map(result => `
                <div class="shader-section" data-shader="${result.shader}">
                    <div class="shader-header">
                        <div>
                            <div class="shader-name">${result.shader}</div>
                            <div class="session-info">Session: ${result.session}</div>
                        </div>
                        <div class="frame-info">
                            ${result.totalFrames} frames captured
                        </div>
                    </div>
                    
                    <div class="samples">
                        ${result.samples.map((img, idx) => `
                            <div class="sample">
                                <img src="${img}" alt="${result.shader} sample ${idx}" 
                                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><rect width=%22200%22 height=%22200%22 fill=%22%23333%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23666%22>Error loading image</text></svg>'">
                                <div class="sample-label">Frame ${['Start', '25%', '50%', '75%', 'End'][idx] || idx}</div>
                            </div>
                        `).join('')}
                    </div>
                    
                    ${result.samples.length === 0 ? 
                        '<div class="warning">⚠️ No images found for this test run</div>' : ''}
                </div>
            `).join('')
        }
    </div>
    
    <script>
        function filterShaders() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const sections = document.querySelectorAll('.shader-section');
            
            sections.forEach(section => {
                const shaderName = section.dataset.shader.toLowerCase();
                if (shaderName.includes(searchTerm)) {
                    section.style.display = 'block';
                } else {
                    section.style.display = 'none';
                }
            });
        }
        
        // Check for black images by analyzing pixel data (simplified check)
        document.querySelectorAll('.sample img').forEach(img => {
            img.onload = function() {
                // Create a canvas to check if image is mostly black
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 10;
                canvas.height = 10;
                ctx.drawImage(img, 0, 0, 10, 10);
                
                try {
                    const imageData = ctx.getImageData(0, 0, 10, 10);
                    const pixels = imageData.data;
                    let blackPixels = 0;
                    
                    for (let i = 0; i < pixels.length; i += 4) {
                        const brightness = (pixels[i] + pixels[i+1] + pixels[i+2]) / 3;
                        if (brightness < 10) blackPixels++;
                    }
                    
                    const blackRatio = blackPixels / (pixels.length / 4);
                    if (blackRatio > 0.95) {
                        img.parentElement.style.border = '2px solid #ff4444';
                        img.parentElement.insertAdjacentHTML('beforeend', 
                            '<div style="position:absolute;top:5px;right:5px;background:#ff4444;color:white;padding:2px 5px;font-size:10px;border-radius:3px;">BLACK</div>'
                        );
                    }
                } catch(e) {
                    // Canvas security error - ignore
                }
            }
        });
    </script>
</body>
</html>`;
    
    fs.writeFileSync(galleryPath, html);
    console.log(`\n✅ Spot-check gallery generated: ${galleryPath}`);
    console.log('📂 Open in browser: file://' + path.resolve(galleryPath));
    
    // Also generate a summary report
    const summaryPath = path.join(outputDir, 'summary.txt');
    const summary = shaderResults.map(r => 
        `${r.shader}: ${r.totalFrames} frames, session ${r.session}`
    ).join('\n');
    
    fs.writeFileSync(summaryPath, `Shader Test Summary
Generated: ${new Date().toLocaleString()}
Total Shaders: ${shaderResults.length}

${summary}
`);
    
    console.log(`📊 Summary report: ${summaryPath}\n`);
}

// Run gallery generation
generateSpotCheckGallery();