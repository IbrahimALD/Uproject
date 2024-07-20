const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch'); // Ensure this line is present
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

const usedLicenseKeys = new Set();
const productId = 'kq_phCDPWlqUL6esdzmX2Q=='; // Your actual product ID

app.post('/verify', async (req, res) => {
  const { licenseKey } = req.body;

  if (usedLicenseKeys.has(licenseKey)) {
    return res.json({ success: false, message: 'License key has already been used.' });
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
    if (data.success && !data.refunded && !data.disputed) {
      usedLicenseKeys.add(licenseKey);
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
