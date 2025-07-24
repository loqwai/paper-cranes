import { chromium } from 'playwright';
import fs from 'fs';

const shaders = [
    'quantum-particles',
    'liquid-crystal', 
    'neural-network',
    'geometric-bloom',
    'aurora-waves',
    'fractal-garden',
    'time-crystals',
    'sonic-mandala',
    'digital-rain',
    'cosmic-web'
];

async function testAllShaders() {
    const browser = await chromium.launch({ 
        headless: true
    });
    
    const page = await browser.newPage();
    
    for (const shader of shaders) {
        console.log(`\n=== Testing ${shader} ===`);
        
        const url = `http://localhost:6969/?shader=claude-generated/${shader}&embed=true`;
        console.log(`URL: ${url}`);
        
        try {
            await page.goto(url);
            await page.waitForTimeout(1500);
            
            // Take screenshots at different times
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            
            for (let i = 0; i < 3; i++) {
                if (i > 0) await page.waitForTimeout(2000);
                
                const filename = `./tmp/screenshots/${shader}-${timestamp}-${i}.png`;
                await page.screenshot({ path: filename });
                console.log(`  Screenshot ${i+1}: ${filename}`);
            }
            
            console.log(`✓ ${shader} test complete`);
        } catch (error) {
            console.error(`❌ Error testing ${shader}: ${error.message}`);
        }
    }
    
    await browser.close();
}

testAllShaders().catch(console.error);