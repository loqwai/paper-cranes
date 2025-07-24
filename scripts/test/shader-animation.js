import { chromium } from 'playwright';
import fs from 'fs';

async function testShaderAnimation(shaderName) {
  const browser = await chromium.launch({ 
    headless: true
  });
  
  const page = await browser.newPage();
  
  // Test shader
  const url = `http://localhost:6969/?shader=claude-generated/${shaderName}&embed=true`;
  console.log(`\nTesting animation for: ${shaderName}`);
  console.log(`URL: ${url}`);
  
  await page.goto(url);
  await page.waitForTimeout(1000); // Let shader initialize
  
  // Take multiple screenshots over time
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotTimes = [0, 2000, 4000, 6000]; // At 0s, 2s, 4s, 6s
  
  for (let i = 0; i < screenshotTimes.length; i++) {
    if (i > 0) {
      await page.waitForTimeout(screenshotTimes[i] - screenshotTimes[i-1]);
    }
    
    const filename = `./tmp/screenshots/${shaderName}-${timestamp}-${i}.png`;
    await page.screenshot({ path: filename });
    console.log(`  Screenshot ${i+1}: ${filename}`);
  }
  
  await browser.close();
  console.log(`✓ Animation test complete for ${shaderName}`);
}

// Test the quantum particles shader
testShaderAnimation('quantum-particles').catch(console.error);