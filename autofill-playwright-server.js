import { config } from 'dotenv';
import playwright from 'playwright';
import express from 'express';

// In production, let Railway supply the env vars; locally load from .env.local.
config({ path: process.env.NODE_ENV === 'production' ? undefined : '.env.local' });

const app = express();
app.use(express.json());

app.post('/autofill', async (req, res) => {
  // Using the env variable name provided in the Browserless snippet:
  const token = process.env.BROWSERLESS_TEST_TOKEN;
  // Recommended endpoint for v2:
  const BROWSERLESS_ENDPOINT = 'wss://production-sfo.browserless.io';

  if (!token) {
    return res.status(500).json({ success: false, error: 'Missing BROWSERLESS_TEST_TOKEN' });
  }

  const { email, plate, birthdate, license_years, zip } = req.body;
  console.log('✅ Received payload:', req.body);

  if (!email || !plate || !birthdate || !license_years || !zip) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  let browser;
  try {
    console.log('📡 Connecting to Browserless.io via CDP...');
    browser = await playwright.chromium.connectOverCDP(`${BROWSERLESS_ENDPOINT}?token=${token}`);
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to InsuranceMarket form
    await page.goto('https://www.insurancemarket.gr/form/car', { waitUntil: 'networkidle' });

    // Fill in the form based on provided data
    await page.fill('input[placeholder="ΧΧΧ1688"]', plate);
    await page.click('button:has-text("Αναζήτηση Οχήματος")');
    await page.waitForTimeout(5000);

    // Parse birthdate string (expected as "day/month/year")
    const [day, month, year] = birthdate.split('/');

    await page.fill('input[placeholder="ΗΗ"]', day);
    await page.fill('input[placeholder="ΜΜ"]', month);
    await page.fill('input[placeholder="ΕΕΕΕ"]', year);
    await page.keyboard.press('Enter');

    // Handle the license years multiselect
    const licenseYearsDiv = await page.locator('div[data-field="licenseYears"]');
    await licenseYearsDiv.locator('div.multiselect__input').click();
    const optionText = `Από ${license_years} έως ${license_years + 1} έτη`;
    await licenseYearsDiv.locator(`li.multiselect__element span.multiselect__option >> text=${optionText}`).click();

    // Handle the postal code multiselect
    const postalCodeDiv = await page.locator('div[data-field="postalCode"]');
    await postalCodeDiv.locator('div.multiselect__input').click();
    await postalCodeDiv.locator(`li.multiselect__element span.multiselect__option >> text=${zip}`).click();

    // Submit the form and wait for navigation after clicking the button
    await page.click('button:has-text("Σύγκριση προσφορών")');
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    const finalUrl = page.url();

    res.json({ success: true, url: finalUrl });
  } catch (error) {
    console.error('🔥 Autofill error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (browser) {
      console.log('🧹 Closing browser connection...');
      await browser.close();
    }
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
