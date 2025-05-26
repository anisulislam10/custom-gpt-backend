// routes/embed.js
const express = require('express');
const router = express.Router();
const Flow = require('../models/Flow');

// Serve the chatbot flow for embedding
router.get('/embed/:userId/:flowId', async (req, res) => {
    try {
      const flow = await Flow.findOne({
        userId: req.params.userId,
        _id: req.params.flowId,
      });
      if (!flow) {
        return res.status(404).send('Flow not found');
      }
      // Render HTML with chatbot UI
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { margin: 0; font-family: ${themeConfig.fontFamily || 'Inter, sans-serif'}; }
              #chatbot { background: ${themeConfig.backgroundColor || '#ffffff'}; color: ${themeConfig.textColor || '#111827'}; }
            </style>
          </head>
          <body>
            <div id="chatbot">
              <!-- Render chatbot UI here using flow.nodes and flow.edges -->
            </div>
            <script src="/path-to-your-chatbot-script.js"></script>
          </body>
        </html>
      `);
    } catch (error) {
      res.status(500).send('Error loading chatbot');
    }
  });
router.get('/:userId/:flowId', async (req, res) => {
  try {
    const flow = await Flow.findOne({
      userId: req.params.userId,
      _id: req.params.flowId,
    });

    if (!flow) {
      return res.status(404).json({ message: 'Flow not found' });
    }

    // Optionally verify API key
    // const apiKey = req.headers['x-api-key'];
    // if (!apiKey || apiKey !== process.env.WIDGET_API_KEY) {
    //   return res.status(401).json({ message: 'Unauthorized' });
    // }

    res.json({
      nodes: flow.nodes,
      edges: flow.edges,
      theme: req.query.theme || 'light',
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to get flow',
      error: error.message,
    });
  }
});

// Serve the chatbot.js file
router.get('/chatbot.js', (req, res) => {
  const jsContent = `
    (function() {
      window.XAIChatbot = {
        init: function(config) {
          const { flowId, userId, theme, apiUrl } = config;
          const chatbotDiv = document.getElementById('xai-chatbot');
          if (!chatbotDiv) return;

          // Fetch flow data
          fetch(\`\${apiUrl}/embed/\${userId}/\${flowId}?theme=\${theme}\`)
            .then(response => response.json())
            .then(data => {
              // Dynamically load React and dependencies
              const reactScript = document.createElement('script');
              reactScript.src = 'https://unpkg.com/react@18/umd/react.production.min.js';
              reactScript.async = true;
              document.head.appendChild(reactScript);

              const reactDomScript = document.createElement('script');
              reactDomScript.src = 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js';
              reactDomScript.async = true;
              document.head.appendChild(reactDomScript);

              reactDomScript.onload = () => {
                // Dynamically create ChatbotPreview component
                const ChatbotPreview = function() {
                  // Simplified ChatbotPreview logic (you'll need to adapt the full logic)
                  const div = document.createElement('div');
                  div.innerHTML = 'Chatbot loading...';
                  div.style.backgroundColor = data.theme === 'dark' ? '#1f2937' : '#f9fafb';
                  div.style.padding = '20px';
                  div.style.borderRadius = '8px';
                  chatbotDiv.appendChild(div);

                  // Add your ChatbotPreview logic here, adapted for vanilla JS
                  // For simplicity, you might bundle ChatbotPreview as a separate UMD module
                };

                ReactDOM.render(
                  React.createElement(ChatbotPreview, {
                    nodes: data.nodes,
                    edges: data.edges,
                    theme: data.theme === 'dark' ? {
                      colors: {
                        primary: '#60a5fa',
                        secondary: '#fbbf24',
                        success: '#34d399',
                        danger: '#f87171',
                        background: '#1f2937',
                        sidebar: '#111827',
                        text: '#f3f4f6',
                        border: '#374151',
                      }
                    } : {
                      colors: {
                        primary: '#3b82f6',
                        secondary: '#f59e0b',
                        success: '#10b981',
                        danger: '#ef4444',
                        background: '#f9fafb',
                        sidebar: '#ffffff',
                        text: '#111827',
                        border: '#e5e7eb',
                      }
                    }
                  }),
                  chatbotDiv
                );
              };
            })
            .catch(error => {
              console.error('Failed to load chatbot:', error);
              chatbotDiv.innerHTML = 'Error loading chatbot';
            });
        }
      };
    })();
  `;

  res.set('Content-Type', 'application/javascript');
  res.send(jsContent);
});

module.exports = router;