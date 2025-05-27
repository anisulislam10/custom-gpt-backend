// routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // For generating verification token
const { sendVerificationEmail } = require('../utils/sendEmail'); // Import email utility



const router = express.Router();

const nodemailer = require('nodemailer');

const User = require('../models/User');
const {
  authMiddleware,
  adminMiddleware,
  validateSignup,
  validateLogin,
  validateUserId,
  validateUpdateUser,
} = require('../middleware/auth');



const transporter = nodemailer.createTransport({
  service: 'gmail', // Use your preferred email service
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASS, // Your email password or app-specific password
  },
  port: 587, // Correct port for Gmail with TLS
  secure: false, // Use TLS
  tls: {
    rejectUnauthorized: false, // Optional for testing; remove in production
  },
});


// Forgot Password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Email not found' });
    }

    // Generate reset token
    const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    user.resetToken = resetToken;
    user.resetTokenExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send reset email
    const resetUrl = `https://custom-gpt-builder-frontend.vercel.app/reset-password?token=${resetToken}`;
    await transporter.sendMail({
      to: email,
      subject: 'Password Reset Request',
      html: `Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.`,
    });

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});
// server/routes/auth.js
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetToken = null;
    user.resetTokenExpires = null;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(400).json({ message: 'Invalid or expired token' });
  }
});
// Resend Verification Email
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Email not found' });
    }
    if (user.isVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    // Generate verification token
    const verificationToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    user.verificationToken = verificationToken;
    await user.save();

    // Send verification email
    const verifyUrl = `https://custom-gpt-builder-frontend.vercel.app/verify-email?token=${verificationToken}`;
    await transporter.sendMail({
      to: email,
      subject: 'Verify Your Email',
      html: `Click <a href="${verifyUrl}">here</a> to verify your email. This link expires in 24 hours.`,
    });

    res.json({ message: 'Verification email resent' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});



// Signup (consolidated /register, /adduser, /signup)
router.post('/register', validateSignup, async (req, res) => {
  try {
    const { email, password, name, role, googleId, image, provider } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;
    const verificationToken = crypto.randomBytes(32).toString('hex'); // Generate token
    const tokenExpiration = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
const user = new User({
  email,
  password: hashedPassword,
  name,
  role: role || 'user',
  googleId,
  image,
  provider: provider || 'local',
  active: provider === 'google' ? true : false, // Google users are active
  isVerified: provider === 'google' ? true : false, // Google users are verified
  verificationToken: provider === 'google' ? undefined : verificationToken,
  verificationTokenExpires: provider === 'google' ? undefined : tokenExpiration,
});

if (provider !== 'google') {
  await sendVerificationEmail(email, name, verificationToken);
}

    await user.save();

    // Send verification email

    res.status(201).json({
      message: 'Signup successful! Please check your email to verify your account.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    user.isVerified = true;
    user.active = true;
    user.verificationToken = undefined; // Clear token
    user.verificationTokenExpires = undefined; // Clear expiration
    await user.save();

    // Redirect to login page or send a success response
    res.redirect('https://custom-gpt-builder-frontend.vercel.app/login?verified=true'); // Update with your frontend URL
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Login
// routes/auth.js (update the /login route)
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email before logging in' });
    }

    if (!user.active) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    if (user.provider === 'local' && password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid email or password' });
      }
    } else if (user.provider !== 'local') {
      return res.status(400).json({ message: 'Use social login for this account' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});
// routes/auth.js
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiration = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    user.verificationToken = verificationToken;
    user.verificationTokenExpires = tokenExpiration;
    await user.save();

    await sendVerificationEmail(user.email, user.name, verificationToken);
    res.json({ message: 'Verification email resent successfully' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});
// Get all users (admin only)
router.get(
  '/users',
 
  async (req, res) => {
    try {
      const users = await User.find().select('-password -__v');
      res.json(users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }
);

// Update a user by ID (admin or self)
router.put(
  '/users/:id',
  
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, role, active, password, image, provider } = req.body;

      // Check if user is admin or updating their own profile
      const requestingUser = await User.findById(req.user.userId);
      if (req.user.userId !== id && requestingUser.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized to update this user' });
      }

      const updatedData = { name, email, image, provider };
      if (password) {
        updatedData.password = await bcrypt.hash(password, 10);
      }
      if (requestingUser.role === 'admin') {
        updatedData.role = role || 'user';
        updatedData.active = active !== undefined ? active : true;
      }

      const updatedUser = await User.findByIdAndUpdate(
        id,
        { $set: updatedData },
        { new: true }
      ).select('-password -__v');

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error('Failed to update user:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }
);

// Delete a user by ID (admin only)
router.delete(
  '/users/:id',
 
  async (req, res) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Failed to delete user:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }
);
// routes/auth.js (ensure this exists)
router.post('/check-user', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        isVerified: user.isVerified,
      },
      token: jwt.sign({ userId: user._id }, process.env.JWT_SECRET),
    });
  } catch (error) {
    console.error('Check user error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});
// routes/auth.js
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  const user = await User.findOne({ refreshToken });
  if (!user) return res.status(401).json({ message: 'Invalid refresh token' });
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

module.exports = router;