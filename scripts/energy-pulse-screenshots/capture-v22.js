// V22 Audio Reactivity Analysis - Sharper particles, richer colors
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Loading V22 with LIVE AUDIO...');
  await page.goto('http://localhost:6969/?shader=graph/energy-pulse');

  await page.waitForTimeout(2000);
  console.log('Audio initialized, capturing variations...');

  for (let i = 1; i <= 6; i++) {
    console.log(`Waiting for audio variation ${i}...`);
    await page.waitForTimeout(5000);

    const filename = `v22-audio-${i}.png`;
    await page.screenshot({
      path: `/Users/hypnodroid/Projects/paper-cranes/scripts/energy-pulse-screenshots/${filename}`,
      fullPage: false
    });
    console.log(`Captured ${filename}`);
  }

  console.log('V22 captures complete');
  await browser.close();
})();
