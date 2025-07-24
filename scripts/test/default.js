import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ 
    headless: true
  });
  
  const page = await browser.newPage();
  
  // Test with default shader (no shader param)
  const url = 'http://localhost:6969/?embed=true';
  console.log(`Testing: ${url}`);
  
  await page.goto(url);
  await page.waitForTimeout(2000);
  
  // Take screenshot first
  await page.screenshot({ path: 'tmp/default-test.png' });
  
  // Check if canvas exists
  const canvasExists = await page.evaluate(() => {
    const canvas = document.getElementById('visualizer');
    return canvas !== null;
  });
  
  console.log('Canvas exists:', canvasExists);
  
  if (canvasExists) {
    // Get pixel data
    const pixel = await page.evaluate(() => {
      const canvas = document.getElementById('visualizer');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const pixel = ctx.getImageData(400, 400, 1, 1).data;
      return { r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] };
    });
    
    console.log(`Center pixel: rgb(${pixel.r}, ${pixel.g}, ${pixel.b})`);
    
    if (pixel.r > 0 || pixel.g > 0 || pixel.b > 0) {
      console.log('✓ Shader is rendering');
    } else {
      console.log('❌ Shader is black');
    }
  }
  
  await browser.close();
}

main().catch(console.error);