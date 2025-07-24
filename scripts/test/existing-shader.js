import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext({
    viewport: { width: 800, height: 800 }
  });
  
  const page = await context.newPage();
  
  // Test with a known working shader
  const url = 'http://localhost:6969/?shader=plasma&embed=true';
  console.log(`Testing: ${url}`);
  
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Check if canvas is rendering
  const pixel = await page.evaluate(() => {
    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d');
    const pixel = ctx.getImageData(400, 400, 1, 1).data;
    return { r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] };
  });
  
  console.log(`Center pixel: rgb(${pixel.r}, ${pixel.g}, ${pixel.b})`);
  
  if (pixel.r > 0 || pixel.g > 0 || pixel.b > 0) {
    console.log('✓ Shader is rendering');
  } else {
    console.log('❌ Shader is black');
  }
  
  await browser.close();
}

main().catch(console.error);