// routes/chatbot.js
const express = require('express');
const router = express.Router();
const Flow = require('../models/Flow');
const Interaction = require('../models/Interaction');
const FormResponse = require('../models/FormResponse');

// GET /:flowId/:userId - Serve the chatbot HTML
router.get('/:flowId/:userId', async (req, res) => {
  console.log(`[Chatbot] Serving chatbot for flowId: ${req.params.flowId}, userId: ${req.params.userId}, domain: ${req.query.domain || 'not provided'}`);
  
  try {
    const { flowId, userId } = req.params;
    const { domain, preview } = req.query;
    const origin = req.get('Origin') || '';
    const isPreview = preview === 'true'; // Check if preview mode is enabled

    // Validate input parameters
    if (!flowId || !userId || (!isPreview && !domain)) {
      console.error(`[Chatbot] Missing parameters - flowId: ${flowId}, userId: ${userId}, domain: ${domain}`);
      return res.status(400).json({ message: 'Missing flowId, userId, or domain' });
    }

    // Find the flow
    const flow = await Flow.findOne({
      _id: flowId,
      userId,
    });

    // Check if flow exists
    if (!flow) {
      console.error(`[Chatbot] Flow not found for flowId: ${flowId}, userId: ${userId}`);
      return res.status(404).json({ message: 'Flow not found' });
    }

    // Normalize and validate website domain (skip in preview mode)
// if (!isPreview) {
//   const normalizedDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
//   const normalizedStoredDomain = flow.websiteDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');

//   // Check if the provided domain matches the stored domain
//   if (normalizedDomain !== normalizedStoredDomain) {
//     console.error(`[Chatbot] Domain mismatch - expected: ${normalizedStoredDomain}, received: ${normalizedDomain}`);
//     return res.status(403).json({ message: 'Invalid or unauthorized domain' });
//   }

//   // Validate request Origin (optional, for additional security)
//   const origin = req.get('Origin') || '';
//   if (origin) {
//     const normalizedOrigin = origin.replace(/^https?:\/\//, '').replace(/\/$/, '');
//     if (normalizedOrigin !== normalizedStoredDomain) {
//       console.error(`[Chatbot] Origin mismatch - expected: ${normalizedStoredDomain}, received: ${normalizedOrigin}`);
//       return res.status(403).json({ message: 'Invalid request origin' });
//     }
//   }

//   // Validate browser base URL via Referer header (optional, for additional security)
//   const referer = req.get('Referer') || '';
//   if (referer) {
//     // Extract the hostname from the Referer URL
//     try {
//       const refererUrl = new URL(referer);
//       const normalizedReferer = refererUrl.hostname.replace(/\/$/, '');
//       if (normalizedReferer !== normalizedStoredDomain) {
//         console.error(`[Chatbot] Referer mismatch - expected: ${normalizedStoredDomain}, received: ${normalizedReferer}`);
//         return res.status(403).json({ message: 'Invalid request referer' });
//       }
//     } catch (error) {
//       console.error(`[Chatbot] Invalid Referer header: ${referer}, error: ${error.message}`);
//       return res.status(400).json({ message: 'Invalid Referer header' });
//     }
//   }
// }

    // Serve chatbot data
    res.set('Content-Security-Policy', "default-src 'self'; script-src 'self' https://back.techrecto.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://*; frame-ancestors *; connect-src 'self' https://back.techrecto.com");

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Chatbot</title>
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
        <script src="/api/chatbot/script.js"></script>
        <script src="/api/chatbot/config.js?flowId=${req.params.flowId}&userId=${req.params.userId}&primary=${encodeURIComponent(req.query.primary || '#6366f1')}&secondary=${encodeURIComponent(req.query.secondary || '#f59e0b')}&background=${encodeURIComponent(req.query.background || '#f8fafc')}&text=${encodeURIComponent(req.query.text || '#1f2937')}&name=${encodeURIComponent(req.query.name || 'Assistant')}&avatar=${encodeURIComponent(req.query.avatar || 'https://img.freepik.com/free-vector/chatbot-chat-message-vectorart_78370-4104.jpg?semt=ais_hybrid&w=200')}"></script>
        <script src="/chatbot-init.js"></script>
      </head>
      <body>
        <div id="chatbot-container" style="width: 100%; height: 100%;"></div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load chatbot', error: error.message });
  }
});

// GET /config.js - Serve configuration script
router.get('/config.js', (req, res) => {
  console.log('[Chatbot] Serving config script');
  const { flowId, userId, primary, secondary, background, text, name, avatar } = req.query;
  const script = `
    (function () {
      window.ChatbotConfig = {
        flowId: "${flowId || ''}",
        userId: "${userId || ''}",
        theme: {
          primary: "${primary || '#6366f1'}",
          secondary: "${secondary || '#f59e0b'}",
          background: "${background || '#f8fafc'}",
          text: "${text || '#1f2937'}",
          name: "${name || 'Assistant'}",
          avatar: "${avatar || '/api/chatbot/avatar.png'}"
        }
      };
    })();
  `;
  res.set('Content-Type', 'application/javascript');
  res.send(script);
});

// GET /script.js - Serve chatbot script
router.get('/script.js', async (req, res) => {
  try {
    console.log('[Chatbot] Serving chatbot script');
    
    const script = `
      window.initChatbot = function () {
        console.log('[Chatbot] Initializing chatbot');
        document.addEventListener('DOMContentLoaded', () => {
          const config = window.ChatbotConfig || {};
          console.log('[Chatbot] Config:', config);

          // Check for chatbot-container, create if not found
          let container = document.getElementById('chatbot-container');
          if (!container) {
            console.log('[Chatbot] Creating chatbot-container dynamically');
            container = document.createElement('div');
            container.id = 'chatbot-container';
            container.style.width = '100%';
            container.style.height = '100%';
            document.body.appendChild(container);
          }

          // Clean up any existing chatbot elements
          const existingWrappers = document.querySelectorAll('.chatbot-wrapper');
          existingWrappers.forEach(wrapper => wrapper.remove());
          const existingToggles = document.querySelectorAll('#chatbot-toggle');
          existingToggles.forEach(toggle => toggle.remove());

          // Initialize chatbot UI
          container.innerHTML = \`
            <div class="chatbot-wrapper" id="chatbot-wrapper" style="
              display: none !important;
              pointer-events: none !important;
              opacity: 0 !important;
              z-index: -1000 !important;
              background: rgba(255, 255, 255, 0.9);
              backdrop-filter: blur(10px);
              color: \${config.theme?.text || '#1f2937'};
              border-radius: 16px;
              box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.2);
              flex-direction: column;
              height: 100%;
              font-family: Manrope, sans-serif;
              overflow: hidden;
              position: fixed;
              width: 400px;
              height: 600px;
              bottom: 90px;
              right: 20px;
              transition: opacity 0.3s ease, transform 0.3s ease, visibility 0.3s ease;
            ">
              <!-- Rest of the chatbot-wrapper HTML remains the same -->
              <div class="chatbot-header" style="
                background: \${config.theme?.primary || '#6366f1'};
                color: #ffffff;
                padding: 16px 24px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-top-left-radius: 16px;
                border-top-right-radius: 16px;
              ">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <img src="\${config.theme?.avatar || '/api/chatbot/avatar.png'}" alt="Chatbot Avatar" style="width: 32px; height: 32px; border-radius: 50%;" />
                  <span style="font-size: 18px; font-weight: 600;">\${config.theme?.name || 'Assistant'}</span>
                </div>
                <div style="display: flex; gap: 8px;">
                  <button id="theme-toggle" aria-label="Toggle theme" style="
                    background: transparent;
                    color: #ffffff;
                    border: none;
                    border-radius: 8px;
                    padding: 8px;
                    cursor: pointer;
                    transition: background 0.2s;
                  ">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                    </svg>
                  </button>
                  <button id="reset-chat" aria-label="Reset chat" style="
                    background: transparent;
                    color: #ffffff;
                    border: none;
                    border-radius: 8px;
                    padding: 8px 16px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: background 0.2s;
                  ">
                    Reset
                  </button>
                  <button id="close-chat" aria-label="Close chat" style="
                    background: transparent;
                    color: #ffffff;
                    border: none;
                    border-radius: 8px;
                    padding: 8px;
                    cursor: pointer;
                    display: none;
                    transition: background 0.2s;
                  ">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div class="chatbot-messages" role="log" aria-live="polite" style="
                flex: 1;
                padding: 20px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 16px;
                background: \${config.theme?.background || 'rgba(249, 250, 251, 0.9)'};
                backdrop-filter: blur(5px);
              ">
                <div style="
                  text-align: center;
                  color: \${config.theme?.text || '#1f2937'};
                  opacity: 0.6;
                  font-size: 14px;
                ">
                  <div class="loading-spinner" style="
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 8px;
                    padding: 12px;
                  ">
                    <span style="
                      width: 10px;
                      height: 10px;
                      background: \${config.theme?.primary || '#6366f1'};
                      border-radius: 50%;
                      animation: typing 0.8s infinite;
                    "></span>
                    <span style="
                      width: 10px;
                      height: 10px;
                      background: \${config.theme?.primary || '#6366f1'};
                      border-radius: 50%;
                      animation: typing 0.8s infinite 0.2s;
                    "></span>
                    <span style="
                      width: 10px;
                      height: 10px;
                      background: \${config.theme?.primary || '#6366f1'};
                      border-radius: 50%;
                      animation: typing 0.8s infinite 0.4s;
                    "></span>
                  </div>
                  <p>Loading assistant...</p>
                </div>
              </div>
              <div class="chatbot-input" style="
                padding: 16px 20px;
                border-top: 1px solid rgba(229, 231, 235, 0.5);
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(5px);
                display: none;
              ">
                <form id="chatbot-bottom-input" style="display: flex; gap: 12px;">
                  <input
                    name="message"
                    type="text"
                    placeholder="Type your message..."
                    style="
                      flex: 1;
                      padding: 12px 16px;
                      border: 1px solid rgba(209, 213, 219, 0.5);
                      border-radius: 10px;
                      background: rgba(255, 255, 255, 0.7);
                      color: \${config.theme?.text || '#1f2937'};
                      font-size: 15px;
                      transition: border-color 0.2s, box-shadow 0.2s;
                    "
                    onfocus="this.style.borderColor='\${config.theme?.primary || '#6366f1'}'; this.style.boxShadow='0 0 0 3px rgba(99, 102, 241, 0.1)'"
                    onblur="this.style.borderColor='rgba(209, 213, 219, 0.5)'; this.style.boxShadow='none'"
                    required
                    aria-label="Type your message"
                  />
                  <button
                    type="submit"
                    class="chatbot-submit-button"
                    style="
                      background: \${config.theme?.primary || '#6366f1'};
                      color: #ffffff;
                      padding: 12px;
                      border-radius: 10px;
                      border: none;
                      cursor: pointer;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      transition: background 0.2s, transform 0.2s;
                      z-index: 1001;
                    "
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M5 12h14M5 12l6-6m-6 6l6 6"/>
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          \`;

          // Add floating toggle button
          let toggleIcon = document.createElement('button');
          toggleIcon.id = 'chatbot-toggle';
          toggleIcon.className = 'chatbot-toggle-visible';
          toggleIcon.setAttribute('aria-label', 'Toggle assistant');
          toggleIcon.setAttribute('tabindex', '0');
          toggleIcon.innerHTML = \`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          \`;
          toggleIcon.style.cssText = \`
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 56px;
            height: 56px;
            background: \${config.theme?.primary || '#6366f1'};
            border: none;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            transition: all 0.3s ease;
            pointer-events: auto;
            opacity: 1;
            visibility: visible;
          \`;
          document.body.appendChild(toggleIcon);
          console.log('[Chatbot] Toggle button added to DOM');

          // ... (rest of the script remains unchanged, including toggle logic, event listeners, etc.)
          let isChatbotOpen = false;
          const chatbotWrapper = container.querySelector('#chatbot-wrapper');

          const setClosedState = () => {
            chatbotWrapper.style.display = 'none';
            chatbotWrapper.style.pointerEvents = 'none';
            chatbotWrapper.style.opacity = '0';
            chatbotWrapper.style.visibility = 'hidden';
            chatbotWrapper.style.zIndex = '-1000';
            if (!document.body.contains(toggleIcon)) {
              document.body.appendChild(toggleIcon);
              toggleIcon.classList.remove('chatbot-toggle-hidden');
              toggleIcon.classList.add('chatbot-toggle-visible');
            }
            try {
              window.parent.postMessage({ type: 'chatbotState', isChatbotOpen: false }, '*');
            } catch (e) {
              console.error('[Chatbot] Error sending postMessage:', e.message);
            }
          };
          setClosedState();

          const toggleChatbot = () => {
            if (!isChatbotOpen) {
              chatbotWrapper.style.display = 'flex';
              chatbotWrapper.style.pointerEvents = 'auto';
              chatbotWrapper.style.opacity = '0';
              chatbotWrapper.style.visibility = 'visible';
              chatbotWrapper.style.zIndex = '999';
              setTimeout(() => {
                chatbotWrapper.style.opacity = '1';
                chatbotWrapper.style.transform = 'translateY(0)';
                if (window.innerWidth <= 480) {
                  container.querySelector('.chatbot-input input')?.focus();
                }
              }, 10);
              toggleIcon.classList.add('chatbot-toggle-hidden');
              toggleIcon.classList.remove('chatbot-toggle-visible');
              if (document.body.contains(toggleIcon)) {
                toggleIcon.remove();
              }
              isChatbotOpen = true;
              try {
                window.parent.postMessage({ type: 'chatbotState', isChatbotOpen: true }, '*');
              } catch (e) {
                console.error('[Chatbot] Error sending postMessage:', e.message);
              }
            } else {
              setClosedState();
              isChatbotOpen = false;
            }
          };

          toggleIcon.addEventListener('click', toggleChatbot);
          toggleIcon.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleChatbot();
            }
          });

          // ... (rest of the event listeners, theme toggle, responsive styles, etc., remain unchanged)
          // Add error handling for missing config
          if (!config.userId || !config.flowId) {
            console.error('[Chatbot] Error: userId or flowId missing in ChatbotConfig');
            container.innerHTML = \`
              <div style="
                padding: 24px;
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(10px);
                color: #d32f2f;
                border-radius: 12px;
                text-align: center;
                font-family: Manrope, sans-serif;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
              ">
                <p style="font-size: 16px; font-weight: 600; margin: 0;">Error: Invalid configuration</p>
                <button onclick="window.initChatbot()" style="
                  background: \${config.theme?.primary || '#6366f1'};
                  color: #ffffff;
                  padding: 10px 20px;
                  border-radius: 10px;
                  border: none;
                  cursor: pointer;
                  margin-top: 12px;
                  font-size: 14px;
                  font-weight: 500;
                  transition: background 0.2s;
                "
                onmouseover="this.style.background='\${config.theme?.secondary || '#4f46e5'}'"
                onmouseout="this.style.background='\${config.theme?.primary || '#6366f1'}'">
                  Retry
                </button>
              </div>
            \`;
            return;
          }

          // ... (rest of the script for fetching flow, rendering chat, etc., remains unchanged)
        });
      };
    `;
    res.set('Content-Type', 'application/javascript');
    res.send(script);
  } catch (error) {
    console.error('[Chatbot] Error serving chatbot script:', error);
    res.status(500).send('Error serving chatbot script');
  }
});

// POST /interactions - Save a complete interaction
// POST /interactions - Save a complete interaction
router.post('/interactions', async (req, res) => {
  try {
    const { userId, flowId, nodeId, userInput, botResponse } = req.body;

    // Validate required fields
    if (!userId || !flowId || !botResponse) {
      console.error(`[Chatbot] Missing interaction parameters - userId: ${userId}, flowId: ${flowId}, botResponse: ${botResponse}`);
      return res.status(400).json({ message: 'Missing required interaction parameters' });
    }

    // Get current date in YYYY-MM-DD format
    const currentDate = new Date().toISOString().split('T')[0]; // e.g., "2025-06-30"

    // Create and save the interaction
    const interaction = new Interaction({
      userId,
      flowId,
      nodeId: nodeId || null,
      userInput: userInput || null,
      botResponse,
      date: currentDate, // Add date field
    });

    await interaction.save();
    console.log(`[Chatbot] Interaction saved: userId=${userId}, flowId=${flowId}, nodeId=${nodeId}, date=${currentDate}`);
    res.status(201).json({ message: 'Interaction saved successfully' });
  } catch (error) {
    console.error('[Chatbot] Error saving interaction:', error.message);
    res.status(500).json({ message: 'Failed to save interaction', error: error.message });
  }
});

// GET /interactions/:flowId/:userId - Fetch all interactions
// GET /interactions/:flowId/:userId - Fetch all interactions grouped by date
router.get('/interactions/:flowId/:userId', async (req, res) => {
  try {
    const { flowId, userId } = req.params;

    // Validate parameters
    if (!flowId || !userId) {
      console.error(`[Chatbot] Missing parameters - flowId: ${flowId}, userId: ${userId}`);
      return res.status(400).json({ message: 'Missing flowId or userId' });
    }

    // Aggregate interactions grouped by date
    const interactions = await Interaction.aggregate([
      {
        $match: { flowId, userId },
      },
      {
        $sort: { timestamp: 1 }, // Sort by timestamp within each date
      },
      {
        $group: {
          _id: '$date', // Group by date field
          interactions: {
            $push: {
              _id: '$_id',
              nodeId: '$nodeId',
              userInput: '$userInput',
              botResponse: '$botResponse',
              timestamp: '$timestamp',
            },
          },
        },
      },
      {
        $sort: { _id: 1 }, // Sort by date
      },
      {
        $project: {
          date: '$_id',
          interactions: 1,
          _id: 0,
        },
      },
    ]);

    console.log(`[Chatbot] Retrieved ${interactions.length} date groups for flowId: ${flowId}, userId: ${userId}`);
    res.status(200).json(interactions);
  } catch (error) {
    console.error('[Chatbot] Error fetching interactions:', error.message);
    res.status(500).json({ message: 'Failed to fetch interactions', error: error.message });
  }
});
router.post('/form-responses', async (req, res) => {
  console.log('[Backend] Received form response:', req.body);

  try {
    const { userEmail, userId, flowId, formId, formName, date, submitDate, response, ...customFields } = req.body;

    // Validate required fields
    if (!userEmail || !userId || !flowId || !formId || !formName || !date || !submitDate || !response) {
      console.error('[Backend] Missing required fields:', { userEmail, userId, flowId, formId, formName, date, submitDate, response });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create the form response with all fields, including custom ones
    const formResponse = new FormResponse({
      userEmail,
      userId,
      flowId,
      formId,
      formName,
      date,
      submitDate,
      response,
      ...customFields, // Spread any additional custom fields
    });

    await formResponse.save();
    console.log(`[Backend] Form response saved: userId=${userId}, flowId=${flowId}, formId=${formId}, date=${date}`);
    res.status(201).json({ message: 'Form response saved successfully' });
  } catch (error) {
    console.error('[Backend] Error saving form response:', error.message);
    res.status(500).json({ error: 'Failed to save form response', details: error.message });
  }
});


module.exports = router;