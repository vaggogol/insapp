const express = require('express');
const { chromium } = require('playwright');

const app = express();
app.use(express.json());

app.post('/autofill', async (req, res) => {
  try {
    const browser = await chromium.connectOverCDP({
      wsEndpoint: `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_TOKEN}`
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://www.insurancemarket.gr/form/car', { waitUntil: 'networkidle' });

    await page.fill('input[name="plate"]', 'ΜΥΕ8450');
    await page.click('button:has-text("Αναζήτηση Οχήματος")');

    await page.waitForSelector('input[name="birthday"]', { timeout: 10000 });
    await page.fill('input[name="birthday"]', '30/07/1985');
    await page.keyboard.press('Enter');

    await page.waitForSelector('label:has-text("B")');
    await page.click('label:has-text("B")');

    await page.waitForSelector('input[name="licenseYears"]', { timeout: 10000 });
    await page.fill('input[name="licenseYears"]', '10');

    await page.fill('input[name="zip"]', '81100');
    await page.click('button:has-text("Σύγκριση προσφορών")');

    await page.waitForNavigation({ waitUntil: 'networkidle' });

    const finalUrl = page.url();
    await browser.close();

    res.json({ success: true, url: finalUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});