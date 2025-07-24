#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate a film strip viewer HTML page that displays all frames
 * for a specific shader based on query parameter
 */
function generateFilmStripViewer() {
    const outputDirs = ['../../screenshots', '../../test-output', '../../test-output-quick'];
    
    // Collect all test data
    const shaderData = {};
    
    for (const outputDir of outputDirs) {
        const fullPath = path.join(__dirname, outputDir);
        if (!fs.existsSync(fullPath)) continue;
        
        // Find all shader directories
        const shaderDirs = fs.readdirSync(fullPath).filter(dir => {
            const dirPath = path.join(fullPath, dir);
            return fs.statSync(dirPath).isDirectory() && dir !== 'videos';
        });
        
        for (const shaderName of shaderDirs) {
            if (!shaderData[shaderName]) {
                shaderData[shaderName] = [];
            }
            
            const shaderDir = path.join(fullPath, shaderName);
            const sessions = fs.readdirSync(shaderDir).filter(session => {
                const sessionPath = path.join(shaderDir, session);
                return fs.statSync(sessionPath).isDirectory();
            });
            
            for (const sessionId of sessions) {
                const imagesDir = path.join(shaderDir, sessionId, 'images');
                
                if (fs.existsSync(imagesDir)) {
                    const images = fs.readdirSync(imagesDir)
                        .filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'))
                        .sort()
                        .map(img => path.join(outputDir, shaderName, sessionId, 'images', img));
                    
                    // Try to load session data or timeline
                    let sessionData = null;
                    const dataPath = path.join(shaderDir, sessionId, 'data', 'session-data.json');
                    const timelinePath = path.join(shaderDir, sessionId, 'timeline.json');
                    
                    if (fs.existsSync(timelinePath)) {
                        try {
                            sessionData = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));
                        } catch (e) {
                            console.error(`Error reading timeline: ${e.message}`);
                        }
                    } else if (fs.existsSync(dataPath)) {
                        try {
                            sessionData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
                        } catch (e) {
                            console.error(`Error reading session data: ${e.message}`);
                        }
                    }
                    
                    // Check for video files
                    const videosDir = path.join(shaderDir, sessionId, 'videos');
                    let videoPath = null;
                    if (fs.existsSync(videosDir)) {
                        const videos = fs.readdirSync(videosDir).filter(f => f.endsWith('.webm') || f.endsWith('.mp4'));
                        if (videos.length > 0) {
                            videoPath = path.join(outputDir, shaderName, sessionId, 'videos', videos[0]);
                        }
                    }
                    
                    if (images.length > 0) {
                        shaderData[shaderName].push({
                            sessionId,
                            images,
                            frameCount: images.length,
                            sessionData,
                            timestamp: sessionId,
                            videoPath
                        });
                    }
                }
            }
        }
    }
    
    // Sort sessions by timestamp (newest first)
    Object.keys(shaderData).forEach(shader => {
        shaderData[shader].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    });
    
    // Generate HTML
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>Shader Film Strip Viewer</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a;
            color: #e0e0e0;
            margin: 0;
            padding: 0;
            overflow-x: hidden;
        }
        
        .header {
            position: sticky;
            top: 0;
            background: rgba(10, 10, 10, 0.95);
            backdrop-filter: blur(10px);
            padding: 20px;
            border-bottom: 1px solid #333;
            z-index: 100;
        }
        
        h1 {
            margin: 0;
            color: #00ff88;
            font-size: 24px;
        }
        
        .shader-selector {
            margin-top: 15px;
            display: flex;
            gap: 15px;
            align-items: center;
        }
        
        select {
            background: #1a1a1a;
            border: 1px solid #444;
            color: #e0e0e0;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
        }
        
        .info {
            color: #888;
            font-size: 14px;
        }
        
        .content {
            padding: 20px;
        }
        
        .no-shader {
            text-align: center;
            color: #666;
            padding: 60px 20px;
            font-size: 18px;
        }
        
        .session {
            margin-bottom: 40px;
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .session-header {
            background: #222;
            padding: 15px 20px;
            border-bottom: 1px solid #333;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .session-title {
            font-size: 16px;
            color: #00ccff;
        }
        
        .session-info {
            color: #888;
            font-size: 12px;
        }
        
        .film-strip {
            overflow-x: auto;
            overflow-y: hidden;
            white-space: nowrap;
            padding: 20px;
            background: #0f0f0f;
            scrollbar-width: thin;
            scrollbar-color: #444 #1a1a1a;
        }
        
        .film-strip::-webkit-scrollbar {
            height: 8px;
        }
        
        .film-strip::-webkit-scrollbar-track {
            background: #1a1a1a;
        }
        
        .film-strip::-webkit-scrollbar-thumb {
            background: #444;
            border-radius: 4px;
        }
        
        .film-strip::-webkit-scrollbar-thumb:hover {
            background: #555;
        }
        
        .frame {
            display: inline-block;
            margin-right: 10px;
            position: relative;
            background: #000;
            border: 1px solid #333;
            border-radius: 4px;
            overflow: hidden;
            transition: transform 0.2s, border-color 0.2s;
        }
        
        .frame:hover {
            transform: scale(1.05);
            border-color: #00ccff;
            z-index: 10;
        }
        
        .frame img {
            height: 150px;
            width: auto;
            display: block;
        }
        
        .frame-number {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.8);
            color: #aaa;
            font-size: 10px;
            padding: 3px;
            text-align: center;
        }
        
        .frame-params {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.8);
            color: #888;
            font-size: 9px;
            padding: 3px;
            text-align: center;
            opacity: 0;
            transition: opacity 0.2s;
        }
        
        .frame:hover .frame-params {
            opacity: 1;
        }
        
        .animation-info {
            background: #1a1a1a;
            padding: 15px 20px;
            border-top: 1px solid #333;
            font-size: 12px;
            color: #888;
        }
        
        .param-badge {
            display: inline-block;
            background: #2a2a2a;
            border: 1px solid #444;
            padding: 2px 8px;
            border-radius: 12px;
            margin-right: 8px;
            color: #aaa;
        }
        
        .loading {
            text-align: center;
            padding: 40px;
            color: #666;
        }
        
        .error {
            background: #3a2a2a;
            border: 1px solid #ff4444;
            color: #ff6666;
            padding: 20px;
            margin: 20px;
            border-radius: 4px;
        }
        
        .video-container {
            background: #0a0a0a;
            padding: 20px;
            border-bottom: 1px solid #333;
        }
        
        .video-container video {
            max-height: 400px;
            width: auto;
            margin: 0 auto;
            display: block;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎬 Shader Film Strip Viewer</h1>
        <div class="shader-selector">
            <select id="shaderSelect" onchange="loadShader(this.value)">
                <option value="">Select a shader...</option>
                ${Object.keys(shaderData).sort().map(shader => 
                    `<option value="${shader}">${shader}</option>`
                ).join('')}
            </select>
            <span class="info" id="shaderInfo"></span>
        </div>
    </div>
    
    <div class="content" id="content">
        <div class="no-shader">
            Select a shader from the dropdown to view its animation film strips
        </div>
    </div>
    
    <script>
        const shaderData = ${JSON.stringify(shaderData, null, 2)};
        
        // Check URL params on load
        window.addEventListener('DOMContentLoaded', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const shader = urlParams.get('shader');
            
            if (shader && shaderData[shader]) {
                document.getElementById('shaderSelect').value = shader;
                loadShader(shader);
            }
        });
        
        function loadShader(shaderName) {
            if (!shaderName) {
                document.getElementById('content').innerHTML = \`
                    <div class="no-shader">
                        Select a shader from the dropdown to view its animation film strips
                    </div>
                \`;
                document.getElementById('shaderInfo').textContent = '';
                return;
            }
            
            const sessions = shaderData[shaderName];
            if (!sessions || sessions.length === 0) {
                document.getElementById('content').innerHTML = \`
                    <div class="error">
                        No test data found for shader: \${shaderName}
                    </div>
                \`;
                return;
            }
            
            // Update URL
            const url = new URL(window.location);
            url.searchParams.set('shader', shaderName);
            window.history.pushState({}, '', url);
            
            // Update info
            const totalFrames = sessions.reduce((sum, s) => sum + s.frameCount, 0);
            document.getElementById('shaderInfo').textContent = 
                \`\${sessions.length} test session\${sessions.length > 1 ? 's' : ''}, \${totalFrames} total frames\`;
            
            // Generate content
            let html = '';
            
            sessions.forEach((session, idx) => {
                const date = new Date(session.timestamp);
                const dateStr = date.toLocaleString();
                
                html += \`
                    <div class="session">
                        <div class="session-header">
                            <div class="session-title">Test Session #\${idx + 1}</div>
                            <div class="session-info">
                                \${dateStr} • \${session.frameCount} frames
                                \${session.videoPath ? '• 🎥 Video available' : ''}
                            </div>
                        </div>
                        \${session.videoPath ? \`
                        <div class="video-container">
                            <video controls width="100%" id="video-\${idx}">
                                <source src="\${session.videoPath.replace(/^\.\./, '')}" type="video/webm">
                                Your browser does not support the video tag.
                            </video>
                        </div>
                        \` : ''}
                        <div class="film-strip" id="strip-\${idx}">
                \`;
                
                // Add frames
                session.images.forEach((img, frameIdx) => {
                    let paramInfo = '';
                    
                    // Handle both old format (frames) and new format (timeline)
                    if (session.sessionData) {
                        const frameData = session.sessionData.timeline ? 
                            session.sessionData.timeline[frameIdx] : 
                            (session.sessionData.frames && session.sessionData.frames[frameIdx]);
                            
                        if (frameData && frameData.params) {
                            const params = Object.entries(frameData.params)
                                .map(([k, v]) => \`\${k}=\${typeof v === 'number' ? v.toFixed(2) : v}\`)
                                .join(' ');
                            paramInfo = params;
                        }
                    }
                    
                    // Convert path to web-served URL
                    const webPath = img.replace(/^\.\.\//, '/');
                    
                    html += \`
                        <div class="frame">
                            <img src="\${webPath}" alt="Frame \${frameIdx}" loading="lazy">
                            <div class="frame-number">Frame \${frameIdx}</div>
                            \${paramInfo ? \`<div class="frame-params">\${paramInfo}</div>\` : ''}
                        </div>
                    \`;
                });
                
                html += \`
                        </div>
                \`;
                
                // Add animation info if available
                if (session.sessionData) {
                    if (session.sessionData.animation) {
                        const anim = session.sessionData.animation;
                        html += \`
                            <div class="animation-info">
                                <strong>Animation:</strong> 
                                \${anim.duration}ms duration, 
                                \${anim.fps} FPS
                                \${anim.keyframes ? \`, \${anim.keyframes.length} keyframes\` : ''}
                            </div>
                        \`;
                    }
                    
                    // Show musical context for new timeline format
                    if (session.sessionData.description || session.sessionData.musicalContext) {
                        html += \`
                            <div class="animation-info">
                                \${session.sessionData.description ? \`<strong>\${session.sessionData.description}</strong><br>\` : ''}
                                \${session.sessionData.musicalContext ? \`<em>\${session.sessionData.musicalContext}</em>\` : ''}
                            </div>
                        \`;
                    }
                }
                
                html += \`</div>\`;
            });
            
            document.getElementById('content').innerHTML = html;
            
            // Smooth scroll behavior for film strips
            sessions.forEach((_, idx) => {
                const strip = document.getElementById(\`strip-\${idx}\`);
                if (strip) {
                    let isDown = false;
                    let startX;
                    let scrollLeft;
                    
                    strip.addEventListener('mousedown', (e) => {
                        isDown = true;
                        startX = e.pageX - strip.offsetLeft;
                        scrollLeft = strip.scrollLeft;
                        strip.style.cursor = 'grabbing';
                    });
                    
                    strip.addEventListener('mouseleave', () => {
                        isDown = false;
                        strip.style.cursor = 'grab';
                    });
                    
                    strip.addEventListener('mouseup', () => {
                        isDown = false;
                        strip.style.cursor = 'grab';
                    });
                    
                    strip.addEventListener('mousemove', (e) => {
                        if (!isDown) return;
                        e.preventDefault();
                        const x = e.pageX - strip.offsetLeft;
                        const walk = (x - startX) * 2;
                        strip.scrollLeft = scrollLeft - walk;
                    });
                    
                    strip.style.cursor = 'grab';
                }
            });
        }
    </script>
</body>
</html>`;
    
    const outputPath = path.join(__dirname, '../../film-strip-viewer.html');
    fs.writeFileSync(outputPath, html);
    
    console.log(`\n🎬 Film strip viewer generated!`);
    console.log(`📂 Open in browser: file://${path.resolve(outputPath)}`);
    console.log(`\nUsage:`);
    console.log(`  - Open the page and select a shader from dropdown`);
    console.log(`  - Or use URL parameter: ?shader=plasma`);
    console.log(`  - Scroll horizontally through each film strip`);
    console.log(`  - Hover over frames to see parameter values\n`);
}

// Run generator
generateFilmStripViewer();