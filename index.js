const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import the cors middleware
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors()); // Use the cors middleware

let usedLicenseKeys = {};

app.post('/verify', (req, res) => {
  const { licenseKey, productId } = req.body;

  if (licenseKey.startsWith('VALID-')) {
    if (usedLicenseKeys[licenseKey]) {
      res.json({ success: false, message: 'License key already used' });
    } else {
      usedLicenseKeys[licenseKey] = { productId, activationDate: new Date() };
      res.json({ success: true });
    }
  } else {
    res.json({ success: false, message: 'Invalid license key' });
  }
});

app.post('/checkExpiration', (req, res) => {
  const { licenseKey } = req.body;
  const entry = usedLicenseKeys[licenseKey];

  if (entry) {
    const activationDate = new Date(entry.activationDate);
    const currentDate = new Date();
    const diffTime = Math.abs(currentDate - activationDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 30) {
      res.json({ expired: true });
    } else {
      res.json({ expired: false });
    }
  } else {
    res.json({ expired: true });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
