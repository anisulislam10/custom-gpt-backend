const express = require("express");
// const authMiddleware = require("../middleware/auth");
const router = express.Router();
const checkSubscription = require('../middleware/checkSubscription');

router.get("/profile",  async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});
router.get('/protected-content', checkSubscription, (req, res) => {
  res.json({ message: 'This is protected content' });
});

module.exports = router;