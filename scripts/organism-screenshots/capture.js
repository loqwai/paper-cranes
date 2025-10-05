import { chromium } from 'playwright';

async function capture(iteration) {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        permissions: ['microphone']
    });

    const page = await context.newPage();

    // Navigate to shader
    await page.goto('http://localhost:6969/?shader=graph/holistic-organism&noaudio=true');

    // Wait for shader to load
    await page.waitForTimeout(2000);

    // Take screenshot
    const timestamp = Date.now();
    const filename = `/Users/hypnodroid/Projects/paper-cranes/scripts/organism-screenshots/v${iteration}_${timestamp}.png`;
    await page.screenshot({ path: filename });

    console.log(`Screenshot saved: ${filename}`);

    await browser.close();
    return filename;
}

// Run with iteration number from command line
const iteration = process.argv[2] || '1';
capture(iteration).catch(console.error);
