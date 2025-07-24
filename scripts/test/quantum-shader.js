import { chromium } from 'playwright';
import fs from 'fs';

async function testQuantumShader() {
  const browser = await chromium.launch({ 
    headless: true
  });
  
  const page = await browser.newPage();
  
  // Monitor console for errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  // Test quantum particles shader
  const url = 'http://localhost:6969/?shader=claude-generated/quantum-particles&embed=true';
  console.log(`Testing: ${url}`);
  
  await page.goto(url);
  await page.waitForTimeout(2000);
  
  // Take screenshot
  await page.screenshot({ path: 'tmp/quantum-particles.png' });
  console.log('Screenshot saved to tmp/quantum-particles.png');
  
  // Check for shader errors
  const shaderErrors = errors.filter(e => e.includes('Shader'));
  if (shaderErrors.length > 0) {
    console.log('\nShader errors found:');
    shaderErrors.forEach(e => console.log(`  - ${e}`));
  }
  
  // Get canvas and check if it's rendering
  const canvasData = await page.evaluate(() => {
    const canvas = document.getElementById('visualizer');
    if (!canvas) return null;
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // Sample 5 random points
    const samples = [];
    for (let i = 0; i < 5; i++) {
      const x = Math.floor(Math.random() * canvas.width);
      const y = Math.floor(Math.random() * canvas.height);
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      samples.push({
        x, y,
        r: pixel[0],
        g: pixel[1], 
        b: pixel[2],
        a: pixel[3]
      });
    }
    
    return {
      width: canvas.width,
      height: canvas.height,
      samples
    };
  });
  
  if (!canvasData) {
    console.log('❌ Canvas not found');
  } else {
    console.log(`\nCanvas: ${canvasData.width}x${canvasData.height}`);
    console.log('Sample pixels:');
    
    let hasColor = false;
    canvasData.samples.forEach(s => {
      console.log(`  (${s.x}, ${s.y}): rgb(${s.r}, ${s.g}, ${s.b})`);
      if (s.r > 0 || s.g > 0 || s.b > 0) hasColor = true;
    });
    
    if (hasColor) {
      console.log('\n✓ Shader is rendering with color!');
    } else {
      console.log('\n❌ Shader appears to be black');
    }
  }
  
  await browser.close();
}

testQuantumShader().catch(console.error);