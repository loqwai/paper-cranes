import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:6969';
const SHADER_DIR = './shaders/claude-generated';

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getPixelColor(page, x, y) {
  return await page.evaluate(({ x, y }) => {
    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d');
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    return {
      r: pixel[0],
      g: pixel[1],
      b: pixel[2],
      a: pixel[3]
    };
  }, { x, y });
}

async function testShader(page, shaderName) {
  console.log(`\nTesting shader: ${shaderName}`);
  
  const url = `${BASE_URL}/?shader=claude-generated/${shaderName}&embed=true`;
  console.log(`  URL: ${url}`);
  
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await wait(1000); // Let shader initialize
    
    // Get canvas dimensions
    const canvasSize = await page.evaluate(() => {
      const canvas = document.getElementById('visualizer');
      return { width: canvas.width, height: canvas.height };
    });
    
    console.log(`  Canvas size: ${canvasSize.width}x${canvasSize.height}`);
    
    // Check if shader is rendering (not black)
    const centerX = Math.floor(canvasSize.width / 2);
    const centerY = Math.floor(canvasSize.height / 2);
    
    // Sample multiple points
    const samplePoints = [
      { x: centerX, y: centerY, name: 'center' },
      { x: Math.floor(canvasSize.width * 0.25), y: centerY, name: 'left' },
      { x: Math.floor(canvasSize.width * 0.75), y: centerY, name: 'right' },
      { x: centerX, y: Math.floor(canvasSize.height * 0.25), name: 'top' },
      { x: centerX, y: Math.floor(canvasSize.height * 0.75), name: 'bottom' }
    ];
    
    let hasColor = false;
    for (const point of samplePoints) {
      const color = await getPixelColor(page, point.x, point.y);
      console.log(`  ${point.name}: rgb(${color.r}, ${color.g}, ${color.b})`);
      
      // Check if any channel has non-zero value
      if (color.r > 0 || color.g > 0 || color.b > 0) {
        hasColor = true;
      }
    }
    
    if (!hasColor) {
      console.log('  ❌ Shader appears to be completely black');
      return false;
    }
    
    // Test animation by checking if pixels change over time
    console.log('  Testing animation...');
    const initialColor = await getPixelColor(page, centerX, centerY);
    await wait(2000); // Wait 2 seconds
    const laterColor = await getPixelColor(page, centerX, centerY);
    
    const colorChanged = initialColor.r !== laterColor.r || 
                        initialColor.g !== laterColor.g || 
                        initialColor.b !== laterColor.b;
    
    if (colorChanged) {
      console.log('  ✓ Animation detected');
    } else {
      console.log('  ⚠️  No animation detected (might be static or slow)');
    }
    
    // Take screenshot
    const screenshotPath = path.join('tmp', `${shaderName}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`  Screenshot saved to: ${screenshotPath}`);
    
    console.log('  ✓ Shader test passed');
    return true;
    
  } catch (error) {
    console.error(`  ❌ Error testing shader: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('Starting shader tests...');
  
  // Create tmp directory if it doesn't exist
  if (!fs.existsSync('tmp')) {
    fs.mkdirSync('tmp');
  }
  
  const browser = await chromium.launch({ 
    headless: true,  // Set to true for CI/automated testing
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext({
    viewport: { width: 800, height: 800 }
  });
  
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`  Browser console error: ${msg.text()}`);
    }
  });
  
  // Test each shader
  const shaders = fs.readdirSync(SHADER_DIR)
    .filter(file => file.endsWith('.frag'))
    .map(file => file.replace('.frag', ''));
  
  console.log(`Found ${shaders.length} shaders to test`);
  
  const results = {};
  for (const shader of shaders) {
    results[shader] = await testShader(page, shader);
  }
  
  // Summary
  console.log('\n=== Test Summary ===');
  let passed = 0;
  for (const [shader, result] of Object.entries(results)) {
    console.log(`${shader}: ${result ? '✓ PASSED' : '❌ FAILED'}`);
    if (result) passed++;
  }
  console.log(`\nTotal: ${passed}/${shaders.length} passed`);
  
  await browser.close();
}

main().catch(console.error);