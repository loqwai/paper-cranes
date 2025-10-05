import { chromium } from 'playwright';

async function debug() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        permissions: ['microphone']
    });

    const page = await context.newPage();

    // Listen for console messages
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err));

    // Navigate to shader
    await page.goto('http://localhost:6969/?shader=graph/holistic-organism&noaudio=true');

    // Wait and check for errors
    await page.waitForTimeout(3000);

    // Check if canvas exists and has content
    const canvasInfo = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return { error: 'No canvas found' };

        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hasContent = imageData.data.some(v => v > 0);

        return {
            width: canvas.width,
            height: canvas.height,
            hasContent
        };
    });

    console.log('Canvas info:', canvasInfo);

    await browser.close();
}

debug().catch(console.error);
