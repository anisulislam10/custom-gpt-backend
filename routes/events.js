const express = require("express");
const router = express.Router();
// const pusher = require("../utils/pusher");

router.post("/broadcast", async (req, res) => {
  const { channel, event, data } = req.body;
//   await pusher.trigger(channel, event, data);
  res.send({ success: true });
});

module.exports = router;
