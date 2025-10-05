// V23 Audio Reactivity Analysis - Fixed fade balance
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Loading V23 with LIVE AUDIO...');
  await page.goto('http://localhost:6969/?shader=graph/energy-pulse');

  await page.waitForTimeout(2000);
  console.log('Audio initialized, capturing variations...');

  for (let i = 1; i <= 6; i++) {
    console.log(`Waiting for audio variation ${i}...`);
    await page.waitForTimeout(5000);

    const filename = `v23-audio-${i}.png`;
    await page.screenshot({
      path: `/Users/hypnodroid/Projects/paper-cranes/scripts/energy-pulse-screenshots/${filename}`,
      fullPage: false
    });
    console.log(`Captured ${filename}`);
  }

  console.log('V23 captures complete');
  await browser.close();
})();
