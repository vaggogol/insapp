import { config } from 'dotenv';
import playwright from 'playwright';
import express from 'express';

// In production, let Railway supply the env vars; locally load from .env.local.
config({ path: process.env.NODE_ENV === 'production' ? undefined : '.env.local' });

const app = express();
app.use(express.json());

app.post('/autofill', async (req, res) => {
  // Using the env variable name provided in the Browserless snippet:
  const token = process.env.BROWSERLESS_TOKEN;
  // Recommended endpoint for v2:
  const BROWSERLESS_ENDPOINT = 'wss://production-sfo.browserless.io';

  if (!token) {
    return res.status(500).json({ success: false, error: 'Missing BROWSERLESS_TOKEN' });
  }

  const { email, plate, birthdate, license_years, zip } = req.body;
  console.log('✅ Received payload:', req.body);

  console.log('Received token:',token);

  if (!email || !plate || !birthdate || !license_years || !zip) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  let browser=null;
  try {
    console.log('📡 Connecting to Browserless.io via CDP...');
    const proxy = '91.236.74.10:8080';

    const browserlessUrl = `${BROWSERLESS_ENDPOINT}?token=${token}&--proxy-server=${proxy}`;
    //const browserlessUrl = `${BROWSERLESS_ENDPOINT}?token=${token}`;
    browser = await playwright.chromium.connectOverCDP(browserlessUrl);
    
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to InsuranceMarket form
    await page.goto('https://www.insurancemarket.gr/form/car', { waitUntil: 'networkidle' });

await page.locator('id=CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll').click();
 
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
 
// Helper: wait for modal to disappear if present
const modal = page.locator('.vehicle-selection.modal.fade.show');
if (await modal.isVisible()) {
  console.log('Modal is visible — waiting for it to disappear...');
  await modal.waitFor({ state: 'hidden', timeout: 10000 });
}

// Handle the license years multiselect
const licenseYearsDiv = await page.locator('div[data-field="licenseYears"]');
await licenseYearsDiv.locator('div.multiselect__select').click();

const optionText = `Από ${license_years} έως ${license_years + 1} έτη`;
await licenseYearsDiv.locator(`li.multiselect__element span.multiselect__option >> text=${optionText}`).click({ force: true });

// Handle the postal code multiselect
// Re-check if modal shows again before the next action
if (await modal.isVisible()) {
  console.log('Modal re-appeared — waiting again...');
  await modal.waitFor({ state: 'hidden', timeout: 10000 });
}

const postalCodeDiv = await page.locator('div[data-field="postalCode"]');
await postalCodeDiv.locator('div.multiselect__select').click();

await postalCodeDiv.locator(`li.multiselect__element span.multiselect__option >> text=${zip}`).click({ force: true });
 
    // Submit the form and wait for navigation after clicking the button
    await page.click('button:has-text("Σύγκριση προσφορών")');
    await page.waitForNavigation()
    const finalUrl = await page.evaluate(() => document.location.href);
 
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
