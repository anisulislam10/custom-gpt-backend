const express = require('express');
const nodemailer = require('nodemailer');
const SmtpConfig = require('../models/smtpConfig'); // Import your model

const router = express.Router();

router.use(express.json());

router.post('/send-email', async (req, res) => {
  const { userId, to, subject, html } = req.body;

  // Basic input validation
  if (!userId || !to || !subject || !html) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Fetch SMTP config from database
    const smtpConfig = await SmtpConfig.findOne({ userId });
    if (!smtpConfig || !smtpConfig.host || !smtpConfig.port || !smtpConfig.username) {
      return res.status(404).json({ error: 'SMTP configuration not found for user' });
    }

    // Create a Nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: parseInt(smtpConfig.port),
      secure: smtpConfig.secure === true || smtpConfig.secure === 'true',
      auth: {
        user: smtpConfig.username,
        pass: smtpConfig.password,
      },
      connectionTimeout: 10000,
    });

    // Send email
    const mailOptions = {
      from: smtpConfig.username,
      to:smtpConfig.username,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log('[Backend] Email sent successfully to:', to); // Replace with proper logging
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('[Backend] Failed to send email:', error); // Replace with proper logging
    res.status(500).json({ error: 'Failed to send email. Please check your SMTP configuration.' });
  }
});

// 

router.post('/send-test-email', async (req, res) => {
  const { host, port, username, password, secure } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: secure === true || secure === 'true', // handle string "true" from JSON
      auth: {
        user: username,
        pass: password,
      },
      connectionTimeout: 10000, // 10 seconds
    });

    // Optional: verify SMTP credentials before sending
    await transporter.verify();

    await transporter.sendMail({
      from: `"SMTP Test" <${username}>`,
      to: username,
      subject: 'SMTP Test Email',
      text: '✅ This is a test email sent using your SMTP configuration.',
    });

    res.status(200).json({ message: '✅ Test email sent successfully.' });
  } catch (error) {
    console.error('❌ SMTP Error:', error);
    res.status(500).json({ error: `❌ Failed to send email: ${error.message}` });
  }
});
router.post('/save', async (req, res) => {
  const { userId, host, port, username, password, secure } = req.body;

  if (!userId || !host || !port || !username || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const existing = await SmtpConfig.findOne({ userId });

    if (existing) {
      await SmtpConfig.updateOne({ userId }, { host, port, username, password, secure });
    } else {
      await SmtpConfig.create({ userId, host, port, username, password, secure });
    }

    res.json({ message: 'SMTP configuration saved successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save configuration.' });
  }
});
router.get('/get/:userId', async (req, res) => {
  try {
    const config = await SmtpConfig.findOne({ userId: req.params.userId });
    if (!config) return res.status(404).json({ error: 'SMTP config not found.' });
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch SMTP config.' });
  }
});
module.exports = router;