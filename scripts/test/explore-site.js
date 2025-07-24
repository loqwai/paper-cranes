import { chromium } from 'playwright';

async function exploreSite() {
  const browser = await chromium.launch({ 
    headless: true
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log(`Console [${msg.type()}]: ${msg.text()}`);
  });
  
  // Go to homepage
  console.log('=== Loading homepage ===');
  await page.goto('http://localhost:6969/', { waitUntil: 'networkidle' });
  
  // Get all scripts loaded
  const scripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script')).map(s => ({
      src: s.src,
      type: s.type,
      inline: !s.src
    }));
  });
  
  console.log('\n=== Scripts loaded ===');
  scripts.forEach(s => {
    if (s.src) {
      console.log(`${s.type || 'classic'}: ${s.src}`);
    } else {
      console.log(`${s.type || 'classic'}: <inline script>`);
    }
  });
  
  // Get all links
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('link')).map(l => ({
      rel: l.rel,
      href: l.href
    }));
  });
  
  console.log('\n=== Links/Stylesheets ===');
  links.forEach(l => console.log(`${l.rel}: ${l.href}`));
  
  // Check global variables
  const globals = await page.evaluate(() => {
    const interesting = ['cranes', 'window.cranes', 'makeVisualizer'];
    const found = {};
    interesting.forEach(name => {
      try {
        const val = eval(name);
        found[name] = typeof val;
      } catch(e) {
        found[name] = 'undefined';
      }
    });
    return found;
  });
  
  console.log('\n=== Global variables ===');
  Object.entries(globals).forEach(([k, v]) => console.log(`${k}: ${v}`));
  
  // Try different shader URLs
  console.log('\n=== Testing shader URLs ===');
  
  // Test 1: Default shader
  await page.goto('http://localhost:6969/?shader=default&embed=true');
  await page.waitForTimeout(1000);
  let hasCanvas = await page.evaluate(() => !!document.getElementById('visualizer'));
  console.log(`?shader=default - Canvas exists: ${hasCanvas}`);
  
  // Test 2: Plasma shader  
  await page.goto('http://localhost:6969/?shader=plasma&embed=true');
  await page.waitForTimeout(1000);
  hasCanvas = await page.evaluate(() => !!document.getElementById('visualizer'));
  console.log(`?shader=plasma - Canvas exists: ${hasCanvas}`);
  
  // Test 3: Claude generated shader
  await page.goto('http://localhost:6969/?shader=claude-generated/quantum-particles&embed=true');
  await page.waitForTimeout(1000);
  hasCanvas = await page.evaluate(() => !!document.getElementById('visualizer'));
  console.log(`?shader=claude-generated/quantum-particles - Canvas exists: ${hasCanvas}`);
  
  // Check network requests for shader loading
  console.log('\n=== Monitoring network for shader requests ===');
  const responses = [];
  page.on('response', response => {
    if (response.url().includes('shader') || response.url().includes('.frag')) {
      responses.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
    }
  });
  
  await page.goto('http://localhost:6969/?shader=claude-generated/quantum-particles&embed=true');
  await page.waitForTimeout(2000);
  
  console.log('\nShader-related requests:');
  responses.forEach(r => {
    console.log(`${r.status} ${r.statusText}: ${r.url}`);
  });
  
  await browser.close();
}

exploreSite().catch(console.error);