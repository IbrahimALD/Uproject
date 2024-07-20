const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

const productId = 'kq_phCDPWlqUL6esdzmX2Q=='; // Your actual product ID
const usedLicenseKeysPath = path.join(__dirname, 'usedLicenseKeys.json');
const licenseExpiryDays = 0; // License validity in days
const licenseExpiryHours = 0; // License validity in hours
const licenseExpiryMinutes = 5; // License validity in minutes

// Function to load used license keys from the JSON file
async function loadUsedLicenseKeys() {
  try {
    await fs.access(usedLicenseKeysPath);
  } catch (error) {
    await fs.writeFile(usedLicenseKeysPath, JSON.stringify([]));
  }
  const data = await fs.readFile(usedLicenseKeysPath, 'utf8');
  return JSON.parse(data);
}

// Function to save used license keys to the JSON file
async function saveUsedLicenseKeys(usedLicenseKeys) {
  try {
    await fs.writeFile(usedLicenseKeysPath, JSON.stringify(usedLicenseKeys, null, 2));
    console.log('Used license keys successfully saved.');
  } catch (error) {
    console.error('Failed to save used license keys:', error);
  }
}

// Load used license keys when the server starts
let usedLicenseKeys = [];

async function initializeUsedLicenseKeys() {
  usedLicenseKeys = await loadUsedLicenseKeys();
}

initializeUsedLicenseKeys();

app.post('/verify', async (req, res) => {
  const { licenseKey } = req.body;
  const currentDateTime = new Date();

  console.log('Current Date Time:', currentDateTime);

  // Check if the license key has been used before
  const existingKey = usedLicenseKeys.find(entry => entry.licenseKey === licenseKey);

  if (existingKey) {
    const activationDate = new Date(existingKey.activationDate);
    const expiryDate = new Date(activationDate);
    expiryDate.setDate(expiryDate.getDate() + licenseExpiryDays);
    expiryDate.setHours(expiryDate.getHours() + licenseExpiryHours);
    expiryDate.setMinutes(expiryDate.getMinutes() + licenseExpiryMinutes);

    console.log('Activation Date:', activationDate);
    console.log('Expiry Date:', expiryDate);

    // Check if the key is still within the valid period
    if (currentDateTime < expiryDate) {
      console.log('License key is still valid.');
      return res.json({ success: false, message: 'License key has already been used and is still valid.' });
    } else {
      console.log('License key has expired.');
    }
  }

  try {
    const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product_id: productId,
        license_key: licenseKey,
        increment_uses_count: false // Avoid incrementing usage count on every check
      })
    });

    const data = await response.json();
    console.log('Gumroad API Response:', data);

    if (data.success && !data.refunded && !data.disputed) {
      // Remove the old entry if it exists
      usedLicenseKeys = usedLicenseKeys.filter(entry => entry.licenseKey !== licenseKey);
      // Add the new entry with the current date and time
      usedLicenseKeys.push({ licenseKey, activationDate: currentDateTime.toISOString() });
      // Save the updated list to the file
      await saveUsedLicenseKeys(usedLicenseKeys);
      console.log('Saved used license keys:', usedLicenseKeys);
      res.json({ success: true });
    } else {
      res.json({ success: false, message: 'Invalid or refunded/disputed license key.' });
    }
  } catch (error) {
    console.error('License verification failed:', error);
    res.json({ success: false, message: 'License verification failed.' });
  }
});

app.listen(port, () => {
  console.log(`License server running on port ${port}`);
});
