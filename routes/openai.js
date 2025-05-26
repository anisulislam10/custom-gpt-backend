const express = require("express");
const { Configuration, OpenAIApi } = require("openai");

const router = express.Router();

// const config = new Configuration({
//   apiKey: process.env.OPENAI_API_KEY,
// });
// const openai = new OpenAIApi();

const ApiConfig = require('../models/ApiConfig'); // Adjust the path as necessary

// Save or Update API Config
router.post('/save', async (req, res) => {
  const { userId, provider, ...config } = req.body;
  try {
    const existing = await ApiConfig.findOne({ userId });
    if (existing) {
      existing.config = config;
      existing.provider = provider;
      await existing.save();
    } else {
      await ApiConfig.create({ userId, config, provider });
    }
    res.status(200).json({ message: 'Saved successfully' });
  } catch (err) {
    console.error('Save Error:', err);
    res.status(500).json({ error: 'Error saving configuration' });
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const config = await ApiConfig.findOne({ userId: req.params.userId });
    if (!config) return res.status(404).json({ error: 'Not found' });
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

router.post('/flows', async (req, res) => {
    const flow = new FlowModel(req.body);
    await flow.save();
    res.status(201).json(flow);
  });
  
  router.get('/flows/:id', async (req, res) => {
    const flow = await FlowModel.findById(req.params.id);
    res.json(flow);
  });
router.post("/chat", async (req, res) => {
  const { prompt } = req.body;
//   try {
//     const completion = await openai.createChatCompletion({
//       model: "gpt-4",
//       messages: [{ role: "user", content: prompt }],
//     });
//     res.json({ reply: completion.data.choices[0].message.content });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
});
router.post("/ai", async (req, res) => {
  const { nodeId, message, userId, flowId } = req.body;

  try {
    const flow = await Flow.findOne({ userId, _id: flowId });
    if (!flow) {
      return res.status(404).json({ message: "Flow not found" });
    }

    const node = flow.nodes.find((n) => n.id === nodeId);
    if (!node || node.type !== "aiinput") {
      return res.status(404).json({ message: "AI node not found" });
    }

    const { provider, openai, deepseek, gemini } = node.data.apiConfig;

    let apiUrl, headers, body;
    if (provider === "openai") {
      apiUrl = "https://api.openai.com/v1/chat/completions";
      headers = { Authorization: `Bearer ${openai.apiKey}` };
      body = {
        model: openai.model,
        messages: [{ role: "user", content: message }],
      };
    } else if (provider === "deepseek") {
      apiUrl = "https://api.deepseek.com/v1/chat/completions"; // Adjust as needed
      headers = { Authorization: `Bearer ${deepseek.apiKey}` };
      body = {
        model: deepseek.model,
        messages: [{ role: "user", content: message }],
      };
    } else if (provider === "gemini") {
      apiUrl = "https://api.gemini.com/v1/completions"; // Adjust as needed
      headers = { Authorization: `Bearer ${gemini.apiKey}` };
      body = {
        model: gemini.model,
        prompt: message,
      };
    } else {
      return res.status(400).json({ message: "Invalid AI provider" });
    }

    const response = await axios.post(apiUrl, body, { headers });
    const aiResponse = response.data.choices[0].message?.content || response.data.choices[0].text;
    res.json({ response: aiResponse });
  } catch (error) {
    res.status(500).json({ message: "AI request failed", error: error.message });
  }
});

module.exports = router;