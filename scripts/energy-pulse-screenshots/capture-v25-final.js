// V25 FINAL Audio Reactivity Analysis - Museum quality demo-ready
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Loading V25 FINAL with LIVE AUDIO...');
  await page.goto('http://localhost:6969/?shader=graph/energy-pulse');

  await page.waitForTimeout(2000);
  console.log('Audio initialized, capturing final variations...');

  for (let i = 1; i <= 8; i++) {
    console.log(`Capturing final variation ${i}...`);
    await page.waitForTimeout(5000);

    const filename = `v25-final-${i}.png`;
    await page.screenshot({
      path: `/Users/hypnodroid/Projects/paper-cranes/scripts/energy-pulse-screenshots/${filename}`,
      fullPage: false
    });
    console.log(`Captured ${filename}`);
  }

  console.log('V25 FINAL captures complete - ready for demo');
  await browser.close();
})();
