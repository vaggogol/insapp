const express = require('express');
const { chromium } = require('playwright');

const app = express();
app.use(express.json());

app.post('/autofill', async (req, res) => {
  try {
    const token = process.env.BROWSERLESS_TOKEN;
    const wsEndpoint = `wss://chrome.browserless.io?token=${token}`;

    const { email, plate, birthdate, license_years, zip } = req.body;
    console.log('email:', email);
    console.log('plate:', plate);
    console.log('birthdate:', birthdate);
    console.log('license_years:', license_years);
    console.log('zip:', zip);
    
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

    //await page.waitForSelector('label:has-text("B")');
    //await page.click('label:has-text("B")');

    const licenseYearsDiv = await page.locator('div[data-field="licenseYears"]');
  
    // Κλικ στο πεδίο εισαγωγής του σωστού multiselect μέσα στο div "licenseYears"
    await licenseYearsDiv.locator('div.multiselect__input').click();
  
    // Ορισμός της τιμής που θέλεις να επιλέξεις (π.χ. 16)
    const selectedValue = 16;
    const optionText = `Από ${license_years} έως ${license_years + 1} έτη`;
  
    // Επιλογή του στοιχείου από τη λίστα του σωστού multiselect
    await licenseYearsDiv.locator(`li.multiselect__element span.multiselect__option >> text=${optionText}`).click();


    // Στοχεύουμε το div με το data-field="postalCode"
    const postalCodeDiv = await page.locator('div[data-field="postalCode"]');
  
    // Κλικ στο πεδίο εισαγωγής του σωστού multiselect μέσα στο div "postalCode"
    await postalCodeDiv.locator('div.multiselect__input').click();
  
    // Ορισμός της τιμής που θέλεις να επιλέξεις (π.χ. 10544)
    const selectedPostalCode = zip;
  
    // Δημιουργία του πλήρους κειμένου της επιλογής που θέλεις να βρεις
    // Αν το "10544" εμφανίζεται με κείμενο όπως "10554 Αθηνα Αθηνα", το 10544 θα αναζητηθεί σε κάθε επιλογή που περιέχει αυτό τον αριθμό.
    const optionText2 = `${selectedPostalCode}`;  // Εδώ απλά αναζητούμε τον αριθμό, αν δεν θέλεις άλλο κείμενο.
  
    // Επιλογή του στοιχείου από τη λίστα του σωστού multiselect που περιλαμβάνει το 10544 στο κείμενο
    await postalCodeDiv.locator(`li.multiselect__element span.multiselect__option >> text=${optionText2}`).click();
  

    
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
