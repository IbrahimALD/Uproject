const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');
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
function loadUsedLicenseKeys() {
  if (!fs.existsSync(usedLicenseKeysPath)) {
    fs.writeFileSync(usedLicenseKeysPath, JSON.stringify([]));
  }
  const data = fs.readFileSync(usedLicenseKeysPath);
  return JSON.parse(data);
}

// Function to save used license keys to the JSON file
function saveUsedLicenseKeys(usedLicenseKeys) {
  fs.writeFileSync(usedLicenseKeysPath, JSON.stringify(usedLicenseKeys, null, 2));
}

// Load used license keys when the server starts
let usedLicenseKeys = loadUsedLicenseKeys();

app.post('/verify', async (req, res) => {
  const { licenseKey } = req.body;
  const currentDateTime = new Date();

  console.log('Current Date Time:', currentDateTime);

  // Check if the license key has been used before
  const existingKey = usedLicenseKeys.find(entry => entry.licenseKey === licenseKey);

  if (existingKey) {
    const activationDate = new Date(existingKey.activationDate);
    console.log('Activation Date:', activationDate);
    const expiryDate = new Date(activationDate);
    expiryDate.setDate(expiryDate.getDate() + licenseExpiryDays);
    expiryDate.setHours(expiryDate.getHours() + licenseExpiryHours);
    expiryDate.setMinutes(expiryDate.getMinutes() + licenseExpiryMinutes);

    console.log('Expiry Date:', expiryDate);

    // Check if the key is still within the valid period
    if (currentDateTime < expiryDate) {
      console.log('License key has already been used and is still valid.');
      return res.json({ success: false, message: 'License key has already been used and is still valid.' });
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
      saveUsedLicenseKeys(usedLicenseKeys);
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
