const express = require('express');
const { chromium } = require('playwright');

const app = express();
app.use(express.json());

app.post('/autofill', async (req, res) => {
  try {
    const token = process.env.BROWSERLESS_TOKEN;
    const wsEndpoint = `wss://chrome.browserless.io?token=${token}`;

    const { email, plate, birthdate, license_years, zip } = req.body;

    // ✅ Έλεγχος ότι όλα τα πεδία υπάρχουν
    if (!email || !plate || !birthdate || !license_years || !zip) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    console.log("📡 Connecting to browserless...");
    const browser = await chromium.connectOverCDP({ wsEndpoint });
    const context = await browser.newContext();
    const page = await context.newPage();

    // 👉 Φόρμα της InsuranceMarket
    await page.goto('https://www.insurancemarket.gr/form/car', { waitUntil: 'networkidle' });

    await page.fill('input[placeholder="ΧΧΧ1688"]', plate);
    await page.click('button:has-text("Αναζήτηση Οχήματος")');

    await page.waitForTimeout(5000);
    
    //await page.waitForSelector('input[name="birthday"]', { timeout: 10000 });
    // Parse birthdate string 
    const [day, month, year] = birthdate.split('/');
    //await page.fill('input[name="birthday"]', birthdate);

    await page.fill('input[placeholder="ΗΗ"]', day);
    await page.fill('input[placeholder="ΜΜ"]', month);
    await page.fill('input[placeholder="ΕΕΕΕ"]', year);
    await page.keyboard.press('Enter');

    await page.waitForSelector('label:has-text("B")');
    await page.click('label:has-text("B")');

    await page.waitForSelector('input[name="licenseYears"]', { timeout: 10000 });
    await page.fill('input[name="licenseYears"]', license_years.toString());

    await page.fill('input[name="zip"]', zip);
    await page.click('button:has-text("Σύγκριση προσφορών")');

    await page.waitForNavigation({ waitUntil: 'networkidle' });

    const finalUrl = page.url();
    await browser.close();

    res.json({ success: true, url: finalUrl });
  } catch (error) {
    console.error("🔥 Error during /autofill:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
