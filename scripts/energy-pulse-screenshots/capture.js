import { chromium } from 'playwright';

const version = process.argv[2] || 'v15';
const url = 'http://localhost:6969/?shader=graph/energy-pulse&noaudio=true';
const outputPath = `/Users/hypnodroid/Projects/paper-cranes/.playwright-mcp/energy-pulse-${version}.png`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(url);

  // Wait for shader to load and render
  await page.waitForTimeout(2000);

  await page.screenshot({ path: outputPath });

  console.log(`Screenshot saved to ${outputPath}`);

  await browser.close();
})();
