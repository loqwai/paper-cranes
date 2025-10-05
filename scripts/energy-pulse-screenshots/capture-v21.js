// V21 Audio Reactivity Analysis - Multiple captures with live audio
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Navigate WITH AUDIO - critical for testing
  console.log('Loading shader with LIVE AUDIO...');
  await page.goto('http://localhost:6969/?shader=graph/energy-pulse');

  // Wait for audio initialization
  await page.waitForTimeout(2000);
  console.log('Audio initialized, capturing variations...');

  // Capture 6 screenshots with 5 second gaps to capture audio variation
  for (let i = 1; i <= 6; i++) {
    console.log(`Waiting for audio variation ${i}...`);
    await page.waitForTimeout(5000); // 5 seconds of audio playback

    const filename = `v21-audio-${i}.png`;
    await page.screenshot({
      path: `/Users/hypnodroid/Projects/paper-cranes/scripts/energy-pulse-screenshots/${filename}`,
      fullPage: false
    });
    console.log(`Captured ${filename}`);
  }

  console.log('All captures complete');
  await browser.close();
})();
