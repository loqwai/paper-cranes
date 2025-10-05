const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required'
    ]
  });

  const context = await browser.newContext({
    permissions: ['microphone']
  });

  const page = await context.newPage();

  // Navigate to shader WITH audio enabled
  const iteration = process.argv[2] || '001';
  const url = 'http://localhost:6975/?shader=graph/harmonic-field';

  console.log(`Testing iteration ${iteration} at ${url}`);
  await page.goto(url);

  // Wait for WebGL to initialize
  await page.waitForTimeout(2000);

  // Take screenshots at different times to capture audio variation
  const screenshots = [
    { delay: 5000, name: `iteration-${iteration}-capture-1.png` },
    { delay: 5000, name: `iteration-${iteration}-capture-2.png` },
    { delay: 5000, name: `iteration-${iteration}-capture-3.png` },
    { delay: 5000, name: `iteration-${iteration}-capture-4.png` }
  ];

  for (const shot of screenshots) {
    await page.waitForTimeout(shot.delay);
    await page.screenshot({
      path: `/Users/hypnodroid/Projects/paper-cranes/scripts/harmonic-screenshots/${shot.name}`,
      fullPage: false
    });
    console.log(`Captured ${shot.name}`);
  }

  console.log(`Iteration ${iteration} complete - check screenshots for audio reactivity`);

  await browser.close();
})();
