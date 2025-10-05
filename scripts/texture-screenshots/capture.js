import { chromium } from 'playwright';

async function captureScreenshot(iteration) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    // Log console messages
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

    // Navigate to shader
    await page.goto('http://localhost:6969/?shader=graph/texture-weave&noaudio=true');
    
    // Wait for shader to initialize and render
    await page.waitForTimeout(3000);
    
    // Take screenshot
    const filename = 'texture-v' + iteration.toString().padStart(3, '0') + '.png';
    await page.screenshot({ 
        path: '/Users/hypnodroid/Projects/paper-cranes/scripts/texture-screenshots/' + filename,
        fullPage: false 
    });
    
    console.log('Captured: ' + filename);
    
    await browser.close();
}

// Get iteration from command line
const iteration = parseInt(process.argv[2] || '1');
captureScreenshot(iteration);
