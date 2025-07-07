const express = require('express');
const nodemailer = require('nodemailer');
const SmtpConfig = require('../models/SmtpConfig'); // Import your model

const router = express.Router();


router.use(express.json());


router.post('/send-email', async (req, res) => {
  const { userId, to, subject, html, type } = req.body;

  console.log('[Backend] Received send-email request:', { userId, to, subject, type, htmlLength: html?.length });

  // Validate required fields
  if (!userId || !subject || !html) {
    console.error('[Backend] Missing required fields:', { userId, subject, html });
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Fetch SMTP configuration
    const smtpConfig = await SmtpConfig.findOne({ userId });
    if (!smtpConfig || !smtpConfig.host || !smtpConfig.port || !smtpConfig.username || !smtpConfig.password) {
      console.error('[Backend] Invalid SMTP configuration for user:', userId, smtpConfig);
      return res.status(404).json({ error: 'SMTP configuration not found or incomplete' });
    }

    // Create transporter
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

    // Verify SMTP connection
    try {
      await transporter.verify();
      console.log('[Backend] SMTP connection verified for:', smtpConfig.username);
    } catch (verifyError) {
      console.error('[Backend] SMTP verification failed:', {
        message: verifyError.message,
        code: verifyError.code,
        response: verifyError.response,
        stack: verifyError.stack
      });
      return res.status(500).json({ error: 'SMTP verification failed', details: verifyError.message });
    }

    // Use the 'to' field directly, ensuring it's an array or single email
    const recipients = Array.isArray(to) ? to : [to].filter(email => email);
    const validRecipients = [...new Set(recipients.filter(email => email && /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)))];
    
    console.log('[Backend] Prepared email recipients:', validRecipients);
    if (validRecipients.length === 0) {
      console.error('[Backend] No valid recipients provided:', recipients);
      return res.status(400).json({ error: 'No valid recipients provided' });
    }

    // Construct mail options
    const mailOptions = {
      from: smtpConfig.username,
      to: validRecipients,
      subject,
      html
    };

    console.log('[Backend] Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      htmlLength: mailOptions.html?.length
    });

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('[Backend] Email sent successfully to:', mailOptions.to, 'Message ID:', info.messageId);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('[Backend] Failed to send email:', {
      message: error.message,
      code: error.code,
      response: error.response,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to send email', details: error.message });
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