const express = require("express");
// const axios =
//  require("axios");
const router = express.Router();

router.post("/send-message", async (req, res) => {
  const { recipientId, message } = req.body;
//   try {
//     const response = await axios.post(
//       `https://graph.facebook.com/v17.0/${recipientId}/messages`,
//       {
//         messaging_type: "RESPONSE",
//         message: { text: message },
//         access_token: process.env.META_ACCESS_TOKEN,
//       }
//     );
//     res.json(response.data);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
});

module.exports = router;