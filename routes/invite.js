// routes/invite.js
const express = require('express');
const router = express.Router();
const Invite = require('../models/Invite');
const Collaborator = require('../models/Collaborator');
const Flow = require('../models/Flow');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

// Nodemailer configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  port: 587,
  secure: false,
  tls: { rejectUnauthorized: false },
});

// Authentication middleware
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId };
    const user = await User.findById(decoded.userId);
    if (!user || !user.isVerified || !user.active) {
      return res.status(403).json({ message: 'User is not verified or active' });
    }
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Generate invite link
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { flowId, role } = req.body;
    const userId = req.user.userId;

    if (!flowId) {
      return res.status(400).json({ message: 'Missing flowId' });
    }

    // Check if user is authorized (owner or admin)
    const flow = await Flow.findOne({ _id: flowId });
    if (!flow) {
      return res.status(404).json({ message: 'Flow not found' });
    }
    const isOwner = flow.userId === userId;
    const isAdmin = await Collaborator.exists({ flowId, userId, role: 'admin' });
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Unauthorized to create invites' });
    }

    const invite = new Invite({
      flowId,
      createdBy: userId,
      role: role || 'collaborator',
    });

    await invite.save();
    const inviteLink = `${process.env.APP_BASE_URL}/join/${invite.inviteCode}`;
    res.status(201).json({ message: 'Invite created', inviteLink, inviteCode: invite.inviteCode });
  } catch (error) {
    console.error('[Invites] Error creating invite:', error.message);
    res.status(500).json({ message: 'Failed to create invite', error: error.message });
  }
});

// Send email invitation
router.post('/email', authMiddleware, async (req, res) => {
  try {
    const { flowId, email, role } = req.body;
    const userId = req.user.userId;

    if (!flowId || !email) {
      return res.status(400).json({ message: 'Missing flowId or email' });
    }

    // Check if user is authorized
    const flow = await Flow.findOne({ _id: flowId });
    if (!flow) {
      return res.status(404).json({ message: 'Flow not found' });
    }
    const isOwner = flow.userId === userId;
    const isAdmin = await Collaborator.exists({ flowId, userId, role: 'admin' });
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Unauthorized to send invites' });
    }

    const invite = new Invite({
      flowId,
      createdBy: userId,
      role: role || 'collaborator',
    });

    await invite.save();
    const inviteLink = `${process.env.APP_BASE_URL}/join/${invite.inviteCode}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Invitation to Collaborate on Chatbot Flow`,
   html: `
   
   
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #eaeaea; border-radius: 10px; background-color: #ffffff;">
    <h2 style="color: #4f46e5;">🎉 You're Invited to Collaborate!</h2>
    
    <p style="font-size: 16px; color: #333333;">

      Hello,
    </p>
    
    <p style="font-size: 16px; color: #333333;">
      You've been invited to collaborate on a chatbot project (<strong>Flow ID: ${flowId}</strong>) as a <strong>${role || 'collaborator'}</strong>.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteLink}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 14px 24px; font-size: 16px; font-weight: bold; border-radius: 6px; text-decoration: none;">
        🚀 Join the Project
      </a>
    </div>

    <p style="font-size: 14px; color: #555;">
      If you don’t have an account yet, you can 
      <a href="${process.env.APP_BASE_URL}/register" style="color: #4f46e5; text-decoration: underline;">register here</a> 
      or 
      <a href="${process.env.APP_BASE_URL}/login" style="color: #4f46e5; text-decoration: underline;">log in</a> 
      to accept the invitation.
    </p>

    <p style="font-size: 12px; color: #999; margin-top: 20px;">
      ⏳ This invite link will expire in <strong>30 days</strong>.
    </p>

    <hr style="margin-top: 30px; border: none; border-top: 1px solid #eaeaea;" />

    <p style="font-size: 12px; color: #aaa; text-align: center;">
      This invitation was sent by <strong>${process.env.APP_NAME || 'FlowBuilder'}</strong>. If you weren't expecting this, you can safely ignore it.
    </p>
  </div>
`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Invitation sent successfully', inviteLink, inviteCode: invite.inviteCode });
  } catch (error) {
    console.error('[Invites] Error sending email invite:', error.message);
    res.status(500).json({ message: 'Failed to send email invite', error: error.message });
  }
});

// Accept invite
router.post('/accept/:inviteCode', authMiddleware, async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const { userId } = req.user;

    const invite = await Invite.findOne({ inviteCode, active: true });
    if (!invite) {
      return res.status(404).json({ message: 'Invalid or expired invite link' });
    }

    // Check if user is already a collaborator
    const existingCollaborator = await Collaborator.findOne({ flowId: invite.flowId, userId });
    if (existingCollaborator) {
      return res.status(400).json({ message: 'User is already a collaborator' });
    }

    // Add user as collaborator
    const collaborator = new Collaborator({
      flowId: invite.flowId,
      userId,
      role: invite.role,
    });

    await collaborator.save();

    // Deactivate invite
    invite.active = false;
    await invite.save();

    res.status(200).json({ message: 'Successfully joined flow', flowId: invite.flowId });
  } catch (error) {
    console.error('[Invites] Error accepting invite:', error.message);
    res.status(500).json({ message: 'Failed to accept invite', error: error.message });
  }
});

// Deactivate invite
router.post('/deactivate/:inviteCode', authMiddleware, async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const { userId } = req.user;

    const invite = await Invite.findOne({ inviteCode, createdBy: userId });
    if (!invite) {
      return res.status(404).json({ message: 'Invite not found or unauthorized' });
    }

    invite.active = false;
    await invite.save();
    res.status(200).json({ message: 'Invite deactivated' });
  } catch (error) {
    console.error('[Invites] Error deactivating invite:', error.message);
    res.status(500).json({ message: 'Failed to deactivate invite', error: error.message });
  }
});

// List invites for a flow
router.get('/:flowId', authMiddleware, async (req, res) => {
  try {
    const { flowId } = req.params;
    const { userId } = req.user;

    const flow = await Flow.findOne({ _id: flowId });
    if (!flow) {
      return res.status(404).json({ message: 'Flow not found' });
    }
    const isOwner = flow.userId === userId;
    const isAdmin = await Collaborator.exists({ flowId, userId, role: 'admin' });
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Unauthorized to view invites' });
    }

    const invites = await Invite.find({ flowId, active: true }).select('inviteCode createdAt role');
    const inviteLinks = invites.map((invite) => ({
      inviteCode: invite.inviteCode,
      inviteLink: `${process.env.APP_BASE_URL}/join/${invite.inviteCode}`,
      createdAt: invite.createdAt,
      role: invite.role,
    }));

    res.status(200).json({ invites: inviteLinks });
  } catch (error) {
    console.error('[Invites] Error fetching invites:', error.message);
    res.status(500).json({ message: 'Failed to fetch invites', error: error.message });
  }
});

// List collaborators for a flow
router.get('/collaborators/:flowId', authMiddleware, async (req, res) => {
  try {
    const { flowId } = req.params;
    const { userId } = req.user;

    const flow = await Flow.findOne({ _id: flowId });
    if (!flow) {
      return res.status(404).json({ message: 'Flow not found' });
    }
    const isOwner = flow.userId === userId;
    const isCollaborator = await Collaborator.exists({ flowId, userId });
    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ message: 'Unauthorized to view collaborators' });
    }

    const collaborators = await Collaborator.find({ flowId })
      .populate('userId', 'name email')
      .select('userId role addedAt');
    res.status(200).json({ collaborators });
  } catch (error) {
    console.error('[Collaborators] Error fetching collaborators:', error.message);
    res.status(500).json({ message: 'Failed to fetch collaborators', error: error.message });
  }
});

module.exports = router;