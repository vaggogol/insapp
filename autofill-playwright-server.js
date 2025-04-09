import express from 'express';
import { chromium } from 'playwright';
import { config } from 'dotenv';

// Διαβάζει από .env.local (ή .env)
config({ path: '.env.local' });

const app = express();
app.use(express.json());

app.post('/autofill', async (req, res) => {
  const token = process.env.BROWSERLESS_TOKEN;
  const BROWSERLESS_ENDPOINT = 'wss://chrome.browserless.io'; // ή production-sfo αν θέλεις

  if (!token) {
    return res.status(500).json({ success: false, error: 'Missing BROWSERLESS_TOKEN' });
  }

  const { email, plate, birthdate, license_years, zip } = req.body;

  console.log('✅ Received payload:', req.body);

  if (!email || !plate || !birthdate || !license_years || !zip) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  let browser;

  try {
    console.log('📡 Connecting to Browserless...');
    browser = await chromium.connectOverCDP(`${BROWSERLESS_ENDPOINT}?token=${token}`);
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://www.insurancemarket.gr/form/car', { waitUntil: 'networkidle' });

    await page.fill('input[placeholder="ΧΧΧ1688"]', plate);
    await page.click('button:has-text("Αναζήτηση Οχήματος")');
    await page.waitForTimeout(5000);

    const [day, month, year] = birthdate.split('/');

    await page.fill('input[placeholder="ΗΗ"]', day);
    await page.fill('input[placeholder="ΜΜ"]', month);
    await page.fill('input[placeholder="ΕΕΕΕ"]', year);
    await page.keyboard.press('Enter');

    const licenseYearsDiv = await page.locator('div[data-field="licenseYears"]');
    await licenseYearsDiv.locator('div.multiselect__input').click();

    const optionText = `Από ${license_years} έως ${license_years + 1} έτη`;
    await licenseYearsDiv.locator(`li.multiselect__element span.multiselect__option >> text=${optionText}`).click();

    const postalCodeDiv = await page.locator('div[data-field="postalCode"]');
    await postalCodeDiv.locator('div.multiselect__input').click();
    await postalCodeDiv.locator(`li.multiselect__element span.multiselect__option >> text=${zip}`).click();

    await page.click('button:has-text("Σύγκριση προσφορών")');
    await page.waitForNavigation({ waitUntil: 'networkidle' });

    const finalUrl = page.url();

    res.json({ success: true, url: finalUrl });
  } catch (error) {
    console.error('🔥 Autofill error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (browser) {
      console.log('🧹 Closing browser...');
      await browser.close();
    }
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
