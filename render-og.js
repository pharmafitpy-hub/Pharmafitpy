const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });

  const url = 'file:///' + path.resolve(__dirname, 'og-preview.html').replace(/\\/g, '/');
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.waitForSelector('canvas');
  await new Promise(r => setTimeout(r, 400));

  const base64 = await page.evaluate(() => document.getElementById('c').toDataURL('image/jpeg', 0.95));
  const buf = Buffer.from(base64.replace(/^data:image\/jpeg;base64,/, ''), 'base64');
  const out = path.join(__dirname, 'og-image.jpg');
  fs.writeFileSync(out, buf);
  console.log(`✅ og-image.jpg salvo — ${buf.length} bytes`);

  await browser.close();
})();
