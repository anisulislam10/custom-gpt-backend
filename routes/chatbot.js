// routes/chatbot.js
const express = require('express');
const router = express.Router();
const Flow = require('../models/Flow');
const Interaction = require('../models/Interaction');
const FormResponse = require('../models/FormResponse');

// GET /:flowId/:userId - Serve the chatbot HTML
router.get('/:flowId/:userId', async (req, res) => {
  
  try {
    const { flowId, userId } = req.params;
    const { domain, preview } = req.query;
    const origin = req.get('Origin') || '';
    const isPreview = preview === 'true'; // Check if preview mode is enabled

    // Validate input parameters
    if (!flowId || !userId || (!isPreview && !domain)) {
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
        <script src="/api/chatbot/config.js?flowId=${req.params.flowId}&userId=${req.params.userId}&primary=${encodeURIComponent(req.query.primary || '#6366f1')}&secondary=${encodeURIComponent(req.query.secondary || '#f59e0b')}&background=${encodeURIComponent(req.query.background || '#f8fafc')}&text=${encodeURIComponent(req.query.text || '#1f2937')}&name=${encodeURIComponent(req.query.name || 'Assistant')}&avatar=${encodeURIComponent('https://img.freepik.com/free-vector/chatbot-chat-message-vectorart_78370-4104.jpg?semt=ais_hybrid&w=200')}"></script>
    <script src="/chatbot-init.js"></script>


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
          avatar: "/api/chatbot/avatar.png}"
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

    const script = `
      // Safe condition evaluation function to replace eval
      const safeEvaluateCondition = (condition, userInput) => {
        try {
          // Simple condition parser (extend as needed)
          const cleanCondition = condition.replace(/user_input/g, JSON.stringify(userInput));
          // Basic comparison operators support
          const operators = {
            '==': (a, b) => a == b,
            '===': (a, b) => a === b,
            '!=': (a, b) => a != b,
            '!==': (a, b) => a !== b,
            '>': (a, b) => a > b,
            '<': (a, b) => a < b,
            '>=': (a, b) => a >= b,
            '<=': (a, b) => a <= b,
          };
          const match = cleanCondition.match(/(.+?)(==|===|!=|!==|>|<|>=|<=)(.+)/);
          if (match) {
            const [, left, op, right] = match;
            const leftValue = JSON.parse(left.trim());
            const rightValue = JSON.parse(right.trim());
            return operators[op](leftValue, rightValue);
          }
          return false; // Default to false if condition is invalid
        } catch (error) {
          return false;
        }
      };

      window.initChatbot = function () {
       if (window.chatbotInitialized) {
    return;
  }
  window.chatbotInitialized = true; 
        
        // Delay initialization to ensure DOM is ready
        setTimeout(() => {
          try {
           
            const config = window.ChatbotConfig || {};

            // Check for chatbot-container, create if not found
            let container = document.getElementById('chatbot-container');
            if (!container) {
              container = document.createElement('div');
              container.id = 'chatbot-container';
              container.style.width = '100%';
              container.style.height = '100%';
              container.style.position = 'relative';
              try {
                document.body.appendChild(container);
              } catch (e) {
                console.error('[Chatbot] Failed to append container:', e.message);
                return;
              }
            } else {
              console.log('[Chatbot] Container already exists');
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
                    <img src="https://img.freepik.com/free-vector/chatbot-chat-message-vectorart_78370-4104.jpg?semt=ais_hybrid&w=200" alt="Chatbot Avatar" style="width: 32px; height: 32px; border-radius: 50%;" />
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
              position: fixed !important;
              bottom: 20px !important;
              right: 20px !important;
              width: 56px !important;
              height: 56px !important;
              background: \${config.theme?.primary || '#6366f1'} !important;
              border: none !important;
              border-radius: 50% !important;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
              cursor: pointer !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              z-index: 10000 !important;
              transition: all 0.3s ease !important;
              pointer-events: auto !important;
              opacity: 1 !important;
              visibility: visible !important;
            \`;
            try {
              document.body.appendChild(toggleIcon);
            } catch (e) {
              console.error('[Chatbot] Failed to append toggle button:', e.message);
              return;
            }

            let isChatbotOpen = false;
            let isDarkMode = false;
            const chatbotWrapper = container.querySelector('#chatbot-wrapper');

            // Explicitly ensure chatbot is closed initially
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

            // Toggle chatbot visibility
            const toggleChatbot = () => {
              if (!isChatbotOpen) {
                chatbotWrapper.style.display = 'flex';
                chatbotWrapper.style.pointerEvents = 'auto';
                chatbotWrapper.style.opacity = '0';
                chatbotWrapper.style.visibility = 'visible';
                chatbotWrapper.style.zIndex = '9999';
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
                console.log('[Chatbot] Closing chatbot');
                setClosedState();
                isChatbotOpen = false;
              }
              
              updateResponsiveStyles();
            };

            // Remove existing event listeners to prevent duplicates
            const oldToggleIcon = toggleIcon.cloneNode(true);
            toggleIcon.replaceWith(oldToggleIcon);
            toggleIcon = oldToggleIcon;

            // Toggle event listeners
            toggleIcon.addEventListener('click', toggleChatbot);
            toggleIcon.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleChatbot();
              }
            });

            // Hover effects for toggle
            toggleIcon.addEventListener('mouseover', () => {
              if (!isChatbotOpen && document.body.contains(toggleIcon)) {
                toggleIcon.style.transform = 'scale(1.1)';
                toggleIcon.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
              }
            });
            toggleIcon.addEventListener('mouseout', () => {
              if (!isChatbotOpen && document.body.contains(toggleIcon)) {
                toggleIcon.style.transform = 'scale(1)';
                toggleIcon.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }
            });

            // Close button logic
            const closeChat = container.querySelector('#close-chat');
            closeChat.addEventListener('click', toggleChatbot);
            closeChat.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleChatbot();
              }
            });
            closeChat.addEventListener('mouseover', () => {
              closeChat.style.background = 'rgba(255, 255, 255, 0.1)';
            });
            closeChat.addEventListener('mouseout', () => {
              closeChat.style.background = 'transparent';
            });

            // Theme toggle logic
            const themeToggle = container.querySelector('#theme-toggle');
            themeToggle.addEventListener('click', () => {
              isDarkMode = !isDarkMode;
              chatbotWrapper.style.background = isDarkMode ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)';
              chatbotWrapper.style.color = isDarkMode ? '#e5e7eb' : config.theme?.text || '#1f2937';
              chatbotWrapper.querySelector('.chatbot-messages').style.background = isDarkMode ? 'rgba(55, 65, 81, 0.9)' : 'rgba(249, 250, 251, 0.9)';
              chatbotWrapper.querySelector('.chatbot-input').style.background = isDarkMode ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)';
              chatbotWrapper.querySelector('.chatbot-input input').style.background = isDarkMode ? 'rgba(75, 85, 99, 0.7)' : 'rgba(255, 255, 255, 0.7)';
              requestAnimationFrame(renderChat);
            });
            themeToggle.addEventListener('mouseover', () => {
              themeToggle.style.background = 'rgba(255, 255, 255, 0.1)';
            });
            themeToggle.addEventListener('mouseout', () => {
              themeToggle.style.background = 'transparent';
            });

            // Reset button hover
            const resetChat = container.querySelector('#reset-chat');
            resetChat.addEventListener('mouseover', () => {
              resetChat.style.background = 'rgba(255, 255, 255, 0.1)';
            });
            resetChat.addEventListener('mouseout', () => {
              resetChat.style.background = 'transparent';
            });

            // Submit button hover
            const submitButton = container.querySelector('.chatbot-submit-button');
            submitButton.addEventListener('mouseover', () => {
              submitButton.style.background = config.theme?.secondary || '#4f46e5';
            });
            submitButton.addEventListener('mouseout', () => {
              submitButton.style.background = config.theme?.primary || '#6366f1';
            });

            // Responsive styles
            const updateResponsiveStyles = () => {
              if (window.innerWidth <= 480) {
                if (isChatbotOpen) {
                  chatbotWrapper.style.width = '100vw';
                  chatbotWrapper.style.height = '100vh';
                  chatbotWrapper.style.borderRadius = '0';
                  chatbotWrapper.style.top = '0';
                  chatbotWrapper.style.right = '0';
                  chatbotWrapper.style.bottom = '0';
                  chatbotWrapper.style.left = '0';
                  chatbotWrapper.style.zIndex = '9999';
                  chatbotWrapper.style.display = 'flex';
                  chatbotWrapper.style.pointerEvents = 'auto';
                  chatbotWrapper.style.opacity = '1';
                  chatbotWrapper.style.visibility = 'visible';
                } else {
                  setClosedState();
                }
              } else {
                if (isChatbotOpen) {
                  chatbotWrapper.style.width = '400px';
                  chatbotWrapper.style.height = '600px';
                  chatbotWrapper.style.borderRadius = '16px';
                  chatbotWrapper.style.top = '';
                  chatbotWrapper.style.right = '20px';
                  chatbotWrapper.style.bottom = '90px';
                  chatbotWrapper.style.left = '';
                  chatbotWrapper.style.zIndex = '9999';
                  chatbotWrapper.style.display = 'flex';
                  chatbotWrapper.style.pointerEvents = 'auto';
                  chatbotWrapper.style.opacity = '1';
                  chatbotWrapper.style.visibility = 'visible';
                } else {
                  setClosedState();
                }
              }
              if (!isChatbotOpen && !document.body.contains(toggleIcon)) {
                document.body.appendChild(toggleIcon);
                toggleIcon.classList.remove('chatbot-toggle-hidden');
                toggleIcon.classList.add('chatbot-toggle-visible');
              } else if (isChatbotOpen && document.body.contains(toggleIcon)) {
                toggleIcon.remove();
                console.log('[Chatbot] Toggle removed from DOM by updateResponsiveStyles');
              }
             
            };

            // Debounce resize event
            let resizeTimeout;
            window.addEventListener('resize', () => {
              clearTimeout(resizeTimeout);
              resizeTimeout = setTimeout(updateResponsiveStyles, 100);
            });

            // Initial call to set responsive styles
            updateResponsiveStyles();

            // Debug DOM state
            setTimeout(() => {
            
            }, 1000);

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
                  position: fixed;
                  bottom: 90px;
                  right: 20px;
                  z-index: 9999;
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

            let currentNodeId = null;
            let chatHistory = [];
            let isTyping = false;
            let flowName = '';
            let nodes = [];
            let edges = [];

            const fetchUrl = \`https://back.techrecto.com/api/flow/\${config.userId}/\${config.flowId}\`;
          fetch(fetchUrl, { method: 'GET', headers: { 'Accept': 'application/json' } })
  .then((response) => {
    if (!response.ok) {
      throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
    }
    return response.json();
  })
  .then((flow) => {
    if (!flow || !Array.isArray(flow.nodes) || !Array.isArray(flow.edges)) {
      throw new Error('Invalid flow data: nodes or edges missing or not arrays');
    }
    if (flow.nodes.length === 0) {
      throw new Error('Invalid flow data: no nodes found');
    }
    flowName = flow.name || 'Contact Form';
    nodes = flow.nodes;
    edges = flow.edges;

    const incomingEdges = edges.reduce((acc, edge) => {
      acc[edge.target] = true;
      return acc;
    }, {});
    const startNode = nodes.find((node) => !incomingEdges[node.id]) || nodes[0];
    if (!startNode) {
      throw new Error('No starting node found');
    }
    currentNodeId = startNode.id;
    chatHistory = [{ node: startNode, userInput: null }];
    isTyping = true;
    autoAdvanceTextNodes();
  })
              .catch((error) => {
                console.error('[Chatbot] Error fetching flow:', error.message);
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
                    position: fixed;
                    bottom: 90px;
                    right: 20px;
                    z-index: 9999;
                  ">
                    <p style="font-size: 16px; font-weight: 600; margin: 0;">Error loading flow</p>
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
              });

            const renderChat = () => {
//              if (container.querySelector('.completion-summary')) {
  //  console.log('[Chatbot] Skipping renderChat: Completion summary already present');
    // return;
  // }
            const messages = container.querySelector('.chatbot-messages');
  const inputWrapper = container.querySelector('.chatbot-input');
  const currentNode = nodes.find((n) => n.id === currentNodeId);
const existingMessageIds = new Set(
    Array.from(messages.querySelectorAll('.message')).map(el => el.dataset.messageId)
  );

  // Remove existing event listeners to prevent duplicates
  const existingButtons = container.querySelectorAll('button[data-option-index]');
  existingButtons.forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.replaceWith(newBtn);
  });

  const existingForms = container.querySelectorAll('form[id^="chatbot-form-"]');
  existingForms.forEach(form => {
    const newForm = form.cloneNode(true);
    form.replaceWith(newForm);
  });

  const existingBottomInput = container.querySelector('#chatbot-bottom-input');
  if (existingBottomInput) {
    const newBottomInput = existingBottomInput.cloneNode(true);
    existingBottomInput.replaceWith(newBottomInput);
  }
              inputWrapper.style.display = (currentNode?.type === 'singleInput' || currentNode?.type === 'aiinput') ? 'block' : 'none';
              if (currentNode?.type === 'singleInput' || currentNode?.type === 'aiinput') {
                const input = inputWrapper.querySelector('input');
                input.placeholder = currentNode?.type === 'aiinput' ? (currentNode.data.placeholder || 'Type your message...') : 'Enter your message';
              }

              messages.innerHTML = chatHistory
                .map((entry, index) => {
                  const { node, userInput } = entry;
                  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  let html = '';

                  if (node.type === 'text') {
                    html += \`
                      <div class="message bot-message" style="
                        background: \${isDarkMode ? 'rgba(55, 65, 81, 0.9)' : 'rgba(243, 244, 246, 0.9)'};
                        backdrop-filter: blur(5px);
                        color: \${isDarkMode ? '#e5e7eb' : '#1f2937'};
                        padding: 12px 16px;
                        border-radius: 12px 12px 12px 4px;
                        max-width: 75%;
                        align-self: flex-start;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                        animation: slide-in 0.3s ease;
                      ">
                        <p style="margin: 0; font-size: 15px; font-weight: 400;">\${node.data.label || 'No message'}</p>
                        <span style="
                          font-size: 12px;
                          color: \${isDarkMode ? '#9ca3af' : '#6b7280'};
                          opacity: 0.6;
                          margin-top: 4px;
                          display: block;
                        ">\${timestamp}</span>
                      </div>
                    \`;
                  // In the renderChat function, update the custom node section to show all options:
} else if (node.type === 'custom' && (!chatHistory[index + 1] || chatHistory[index + 1].node.id !== node.id)) {
    html += \`
      <div class="message bot-message" style="
        background: \${isDarkMode ? 'rgba(55, 65, 81, 0.9)' : 'rgba(243, 244, 246, 0.9)'};
        backdrop-filter: blur(5px);
        color: \${isDarkMode ? '#e5e7eb' : '#1f2937'};
        padding: 12px 16px;
        border-radius: 12px 12px 12px 4px;
        max-width: 75%;
        align-self: flex-start;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        animation: slide-in 0.3s ease;
      ">
        <p style="margin: 0; font-size: 15px; font-weight: 400;">\${node.data.label || 'Please select an option'}</p>
        \${userInput ? \`
          <div style="margin-top: 8px; padding: 8px; background: \${isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(229, 231, 235, 0.5)'}; border-radius: 8px;">
            <strong>You selected:</strong> \${userInput}
          </div>
        \` : \`
          <div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 10px;">
          \${node.data.options
              .map(
                (opt, i) => \`
                  <button
                    data-option-index="\${i}"
                    style="
                      background: \${isDarkMode ? 'rgba(75, 85, 99, 0.9)' : 'rgba(229, 231, 235, 0.9)'};
                      backdrop-filter: blur(5px);
                      color: \${isDarkMode ? '#e5e7eb' : '#1f2937'};
                      padding: 10px 20px;
                      border-radius: 8px;
                      border: none;
                      cursor: pointer;
                      font-size: 14px;
                      font-weight: 500;
                      transition: background 0.2s;
                    "
                    onmouseover="this.style.background='\${isDarkMode ? 'rgba(107, 114, 128, 0.9)' : 'rgba(209, 213, 219, 0.9)'}'"
                    onmouseout="this.style.background='\${isDarkMode ? 'rgba(75, 85, 99, 0.9)' : 'rgba(229, 231, 235, 0.9)'}'"
                  >
                    \${opt}
                  </button>
                \`
              )
              .join('')}
          </div>
      \`}
        <span style="
          font-size: 12px;
          color: \${isDarkMode ? '#9ca3af' : '#6b7280'};
          opacity: 0.6;
          margin-top: 8px;
          display: block;
        ">\${timestamp}</span>
      </div>
    \`;
}
 else if (node.type === 'condition' && (!chatHistory[index + 1] || chatHistory[index + 1].node.id !== node.id)) {
                    html += \`
                      <div class="message bot-message" style="
                        background: \${isDarkMode ? 'rgba(55, 65, 81, 0.9)' : 'rgba(243, 244, 246, 0.9)'};
                        backdrop-filter: blur(5px);
                        color: \${isDarkMode ? '#e5e7eb' : '#1f2937'};
                        padding: 12px 16px;
                        border-radius: 12px 12px 12px 4px;
                        max-width: 75%;
                        align-self: flex-start;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                        animation: slide-in 0.3s ease;
                      ">
                        <p style="margin: 0; font-size: 15px; font-weight: 400;">\${node.data.label || 'Evaluating condition...'}</p>
                        <span style="
                          font-size: 12px;
                          color: \${isDarkMode ? '#9ca3af' : '#6b7280'};
                          opacity: 0.6;
                          margin-top: 4px;
                          display: block;
                        ">\${timestamp}</span>
                      </div>
                    \`;
                  } else if (node.type === 'form' && (!chatHistory[index + 1] || chatHistory[index + 1].node.id !== node.id)) {
                    html += \`
                      <div class="message bot-message" style="
                        background: \${isDarkMode ? 'rgba(55, 65, 81, 0.9)' : 'rgba(243, 244, 246, 0.9)'};
                        backdrop-filter: blur(5px);
                        color: \${isDarkMode ? '#e5e7eb' : '#1f2937'};
                        padding: 12px 16px;
                        border-radius: 12px 12px 12px 4px;
                        max-width: 75%;
                        align-self: flex-start;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                        animation: slide-in 0.3s ease;
                      ">
                        <p style="margin: 0; font-size: 15px; font-weight: 400;">\${node.data.label || 'Please fill out the form'}</p>
                        \${userInput ? \`
                          <div style="
                            margin-top: 12px;
                            padding: 12px;
                            background: \${isDarkMode ? 'rgba(75, 85, 99, 0.7)' : 'rgba(229, 231, 235, 0.7)'};
                            border-radius: 8px;
                            border: 1px solid \${isDarkMode ? 'rgba(107, 114, 128, 0.5)' : 'rgba(209, 213, 219, 0.5)'};
                          ">
                            <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">Form Submission</h4>
                            <ul style="list-style-type: none; padding: 0; font-size: 14px;">
                              \${Object.entries(userInput)
                                .map(([key, value]) => \`<li style="margin-bottom: 6px;"><strong>\${key}:</strong> \${value}</li>\`)
                                .join('')}
                            </ul>
                          </div>
                        \` : \`
                          <form id="chatbot-form-\${node.id}" style="margin-top: 12px;">
                            \${node.data.fields
                              .map(
                                (field) => \`
                                  <div style="margin-bottom: 10px;">
                                    <input
                                      name="\${field.key || field.label}"
                                      type="\${field.type}"
                                      placeholder="\${field.label}"
                                      style="
                                        width: 100%;
                                        padding: 10px 12px;
                                        border: 1px solid \${isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)'};
                                        border-radius: 8px;
                                        background: \${isDarkMode ? 'rgba(75, 85, 99, 0.7)' : 'rgba(255, 255, 255, 0.7)'};
                                        backdrop-filter: blur(5px);
                                        color: \${isDarkMode ? '#e5e7eb' : '#1f2937'};
                                        font-size: 14px;
                                        transition: border-color 0.2s, box-shadow: 0.2s;
                                      "
                                      onfocus="this.style.borderColor='\${config.theme?.primary || '#6366f1'}'; this.style.boxShadow='0 0 0 3px rgba(99, 102, 241, 0.1)'"
                                      onblur="this.style.borderColor='\${isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)'}'; this.style.boxShadow='none'"
                                      \${field.required ? 'required' : ''}
                                      aria-label="\${field.label}"
\${field.key === 'email' }

                                    />
                                  </div>
                                \`
                              )
                              .join('')}
                            <button
                              type="submit"
                              style="
                                background: \${config.theme?.primary || '#6366f1'};
                                color: #ffffff;
                                padding: 10px 20px;
                                border-radius: 8px;
                                border: none;
                                cursor: pointer;
                                font-size: 14px;
                                font-weight: 500;
                                width: 100%;
                                transition: background 0.2s;
                              "
                              onmouseover="this.style.background='\${config.theme?.secondary || '#4f46e5'}'"
                              onmouseout="this.style.background='\${config.theme?.primary || '#6366f1'}'"
                            >
                              Submit
                            </button>
                          </form>
                        \`}
                        <span style="
                          font-size: 12px;
                          color: \${isDarkMode ? '#9ca3af' : '#6b7280'};
                          opacity: 0.6;
                          margin-top: 8px;
                          display: block;
                        ">\${timestamp}</span>
                      </div>
                    \`;
                  } else if ((node.type === 'singleInput' || node.type === 'aiinput') && (!chatHistory[index + 1] || chatHistory[index + 1].node.id !== node.id)) {
  // Only show bot message if there is no user input for this node yet
  if (!userInput) {
    html += \`
      <div class="message bot-message" style="
        background:\${isDarkMode ? 'rgba(55, 65, 81, 0.9)' : 'rgba(243, 244, 246, 0.9)'};
        backdrop-filter: blur(5px);
        color: \${isDarkMode ? '#e5e7eb' : '#1f2937'};
        padding: 12px 16px;
        border-radius: 12px 12px 12px 4px;
        max-width: 75%;
        align-self: flex-start;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        animation: slide-in 0.3s ease;
      ">
        
      </div>
    \`;
  }
}

                  if (userInput) {
                    html += \`
                      <div class="message user-message" style="
                        background: \${config.theme?.primary || '#6366f1'};
                        color: #ffffff;
                        padding: 12px 16px;
                        border-radius: 12px 12px 4px 12px;
                        max-width: 75%;
                        align-self: flex-end;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                        animation: slide-in 0.3s ease;
                      ">
                        \${typeof userInput === 'object'
                          ? \`<div style="
                              padding: 12px;
                              background: \${isDarkMode ? 'rgba(75, 85, 99, 0.7)' : 'rgba(229, 231, 235, 0.7)'};
                              border-radius: 8px;
                              border: 1px solid \${isDarkMode ? 'rgba(107, 114, 128, 0.5)' : 'rgba(209, 213, 219, 0.5)'};
                            ">
                              <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">Your Submission</h4>
                              <ul style="list-style-type: none; padding: 0; font-size: 14px;">
                                \${Object.entries(userInput)
                                  .map(([key, value]) => \`<li style="margin-bottom: 6px;"><strong>\${key}:</strong> \${value}</li>\`)
                                  .join('')}
                              </ul>
                            </div>\`
                          : \`<p style="margin: 0; font-size: 15px; font-weight: 400;">\${userInput}</p>\`
                        }
                        <span style="
                          font-size: 12px;
                          color: #ffffff;
                          opacity: 0.6;
                          margin-top: 4px;
                          display: block;
                        ">\${timestamp}</span>
                      </div>
                    \`;
                  }

                  return html;
                })
                .join('');

              if (currentNodeId && currentNode?.type !== 'singleInput' && currentNode?.type !== 'aiinput' && isTyping) {
                messages.innerHTML += \`
                  <div class="typing-indicator" style="
                    display: flex;
                    gap: 8px;
                    padding: 12px;
                    align-self: flex-start;
                    opacity: 0;
                    animation: fade-in 0.3s ease forwards;
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
                \`;
              }

              messages.scrollTop = messages.scrollHeight;
const removeEventListeners = (element, eventType) => {
  const clone = element.cloneNode(true);
  element.replaceWith(clone);
  return clone;
};
              // Event listeners for buttons and forms
   container.querySelectorAll('button[data-option-index]').forEach((btn) => {
  btn = removeEventListeners(btn, 'click');
  btn.addEventListener('click', () => {
    const optionIndex = btn.getAttribute('data-option-index');
    const option = btn.textContent;
    isTyping = true;
    handleInteraction(currentNodeId, option, parseInt(optionIndex));
  });
});

            container.querySelectorAll('form[id^="chatbot-form-"]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = Object.fromEntries(formData);
      const email = data.email || config.userEmail;
      if (email && !/^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$/i.test(email)) {
        messages.innerHTML += \`
          <div style="
            padding: 12px 16px;
            background: rgba(255, 0, 0, 0.1);
            color: #d32f2f;
            border-radius: 12px;
            max-width: 75%;
            align-self: flex-start;
            margin-top: 16px;
            font-size: 14px;
          ">
            Please enter a valid email address.
          </div>
        \`;
        messages.scrollTop = messages.scrollHeight;
        isTyping = false;
        return;
      }
      isTyping = true;
      handleInteraction(currentNodeId, data);
    });
  });

  const bottomInputForm = container.querySelector('#chatbot-bottom-input');
  if (bottomInputForm) {
    bottomInputForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(bottomInputForm);
      const data = Object.fromEntries(formData);
      isTyping = true;
      handleInteraction(currentNodeId, data.message);
      bottomInputForm.reset();
    });
  }

  container.querySelector('#reset-chat')?.addEventListener('click', () => {
    window.hasSentCompletionEmail = false;
    const incomingEdges = edges.reduce((acc, edge) => {
      acc[edge.target] = true;
      return acc;
    }, {});
    const startNode = nodes.find((node) => !incomingEdges[node.id]) || nodes[0];
    if (startNode) {
      currentNodeId = startNode.id;
      chatHistory = [{ node: startNode, userInput: null }];
      isTyping = true;
      autoAdvanceTextNodes();
      requestAnimationFrame(renderChat);
    }
  });
};
const autoAdvanceTextNodes = () => {
  let current = nodes.find((n) => n.id === currentNodeId);
  const visitedNodes = new Set();
  while (current && (current.type === 'text' || current.type === 'condition') && !chatHistory.find((h) => h.node.id === current.id && h.userInput)) {
    
  visitedNodes.add(current.id);
    if (current.type === 'condition') {
      const lastInputEntry = chatHistory
        .slice()
        .reverse()
        .find((entry) => entry.userInput && (entry.node.type === 'singleInput' || entry.node.type === 'aiinput'));
      const userInput = lastInputEntry ? lastInputEntry.userInput : null;
      const conditionResult = safeEvaluateCondition(current.data.label || 'false', userInput);
      const sourceHandle = conditionResult ? 'yes' : 'no';
      const nextEdge = edges.find((edge) => edge.source === current.id && edge.sourceHandle === sourceHandle);
      if (!nextEdge) {
        handleInteraction(current.id, null);
        break;
      }
      const nextNode = nodes.find((n) => n.id === nextEdge.target);
      if (!nextNode) {
        handleInteraction(current.id, null);
        break;
      }
      currentNodeId = nextNode.id;
      chatHistory.push({ node: nextNode, userInput: null });
      current = nextNode;
    } else {
      const nextEdge = edges.find((edge) => edge.source === current.id);
      if (!nextEdge) {
        handleInteraction(current.id, null); // Trigger end node check
        break;
      }
      const nextNode = nodes.find((n) => n.id === nextEdge.target);
      if (!nextNode) {
        handleInteraction(current.id, null); // Trigger end node check
        break;
      }
      currentNodeId = nextNode.id;
      chatHistory.push({ node: nextNode, userInput: null });
      current = nextNode;
    }
  }
  isTyping = false;
  requestAnimationFrame(renderChat);
};

const handleInteraction = async (nodeId, userInput, optionIndex = null) => {
  
  try {
    const currentNode = nodes.find(n => n.id === nodeId);
    if (!currentNode) throw new Error('Current node not found');
    
    const historyEntry = chatHistory.find(h => h.node.id === nodeId && !h.userInput);
    if (historyEntry) {
  historyEntry.userInput = userInput;
} else if (!chatHistory.some(h => h.node.id === nodeId && h.userInput === userInput)) {
  chatHistory.push({ node: currentNode, userInput });
}

    if (currentNode.type === 'form') {
      await handleFormSubmission(currentNode, userInput);
    }

    const isEndNode = currentNode.data?.isEndNode || 
                     edges.filter(e => e.source === nodeId).length === 0;
    
   

    if (isEndNode) {
      console.log('[Chatbot] End node detected:', currentNode.id);
      await handleFlowCompletion(currentNode);
      return;
    }

    const nextEdge = findNextEdge(currentNode, nodeId, userInput, optionIndex);
    if (nextEdge) {
      await handleNextNode(nextEdge, userInput);
    } else {
      await handleFlowCompletion(currentNode);
    }

  } catch (error) {
    showErrorMessage(error.message);
    isTyping = false;
  }

  requestAnimationFrame(renderChat);
};
// Helper Functions

async function handleFormSubmission(node, formData) {
  const email = formData.email || config.userEmail;

  try {
    const response = await fetch('https://back.techrecto.com/api/chatbot/form-responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: email,
        formId: node.id,
        formName: flowName || 'Contact Form',
        flowId: config.flowId,
        userId: config.userId,
        date: new Date().toISOString().split('T')[0],
        submitDate: new Date().toISOString(),
        response: formData,
      }),
    });

    if (!response.ok) {
      throw new Error(\`Form submission failed: \${response.statusText}\`);
    }

  } catch (error) {
    throw new Error('Failed to save form data');
  }
}

function findNextEdge(currentNode, nodeId, userInput, optionIndex) {
  const outgoingEdges = edges.filter(e => e.source === nodeId);


  if (currentNode.type === 'custom' && optionIndex !== null) {
    const sourceHandle = \`option-\${optionIndex}\`;
    const edge = edges.find(e => e.source === nodeId && e.sourceHandle === sourceHandle);
    if (!edge) {
      return null;
    }
    return edge;
  }

  if (currentNode.type === 'condition') {
    const lastInput = chatHistory
      .slice()
      .reverse()
      .find(e => e.userInput && (e.node.type === 'singleInput' || e.node.type === 'aiinput'));
    const conditionResult = safeEvaluateCondition(
      currentNode.data.label || 'false',
      lastInput?.userInput || null
    );
    const sourceHandle = conditionResult ? 'yes' : 'no';
    const edge = edges.find(e => e.source === nodeId && e.sourceHandle === sourceHandle);
    if (!edge) {
      return null;
    }
    
    return edge;
  }

  if (outgoingEdges.length > 0) {
    const edge = outgoingEdges[0];
    const targetNode = nodes.find(n => n.id === edge.target);
    if (!targetNode) {
      return null;
    }
    return edge;
  }

  return null;
}
async function handleNextNode(nextEdge, userInput) {
  const nextNode = nodes.find(n => n.id === nextEdge.target);
  if (!nextNode) throw new Error('Next node not found');

  currentNodeId = nextNode.id;
  chatHistory.push({ node: nextNode, userInput: null });

  try {
    
    // Auto-advance for text/condition nodes
    if (nextNode.type === 'text' || nextNode.type === 'condition') {
      autoAdvanceTextNodes();
    }
  } catch (error) {
    throw error;
  }
}
async function handleFlowCompletion(currentNode) {
 

  isTyping = false;

  const formEntries = chatHistory.filter(e => e.node.type === 'form' && e.userInput);
  const shouldSendEmail = (formEntries.length > 0 || currentNode.data?.sendEmailOnCompletion) &&
                         !window.hasSentCompletionEmail;

  

  if (shouldSendEmail) {
   try {
    await saveInteraction(currentNode, null, chatHistory); // Pass chatHistory
  } catch (error) {
    console.error('[Chatbot] Error saving final interaction:', error);
  }
   try {
    setTimeout(() => {
      renderCompletionMessage();
      // Force UI update
      const chatbotWrapper = container.querySelector('#chatbot-wrapper');
      if (chatbotWrapper) {
        chatbotWrapper.style.display = 'flex';
        chatbotWrapper.style.pointerEvents = 'auto';
        chatbotWrapper.style.opacity = '1';
        chatbotWrapper.style.visibility = 'visible';
        chatbotWrapper.style.zIndex = '9999';
        isChatbotOpen = true;
      }
      updateResponsiveStyles();
    }, 100); // Small delay to ensure DOM is ready
  } catch (error) {
    showErrorMessage(\`Failed to render summary: \${error.message}\`);
  }
    try {
      const userEmail = formEntries.length > 0 
        ? formEntries[formEntries.length - 1].userInput.email || config.userEmail
        : config.userEmail;


      // Fetch SMTP configuration
      const smtpResponse = await fetch(\`https://back.techrecto.com/api/smtp/get/\${config.userId}\`);
      if (!smtpResponse.ok) throw new Error(\`Failed to get SMTP config: \${smtpResponse.statusText}\`);
      const smtpConfig = await smtpResponse.json();

      // Email 1: Form submission details to userEmail
      if (formEntries.length > 0 && userEmail) {
        const formEmailContent = {
          subject: \`Form Submission Confirmation\`,
          html: buildFormEmailHtml()
        };
        const formEmailResponse = await fetch('https://back.techrecto.com/api/smtp/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: config.userId,
            to: userEmail,
            subject: formEmailContent.subject,
            html: formEmailContent.html,
            type: 'form'
          })
        });
        if (!formEmailResponse.ok) {
          const errorText = await formEmailResponse.text();
          throw new Error(\`Form email send failed: \${formEmailResponse.statusText} - \${errorText}\`);
        }
      }

      // Email 2: Full conversation summary to SMTP username
      const fullEmailContent = {
        subject: \`Conversation Summary: \${flowName || 'Chat'}\`,
        html: buildFullEmailHtml()
      };
      const fullEmailResponse = await fetch('https://back.techrecto.com/api/smtp/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: config.userId,
          to: smtpConfig.username,
          subject: fullEmailContent.subject,
          html: fullEmailContent.html,
          type: 'form'
        })
      });
      if (!fullEmailResponse.ok) {
        const errorText = await fullEmailResponse.text();
        throw new Error(\`Full conversation email send failed: \${fullEmailResponse.statusText} - \${errorText}\`);
      }

      window.hasSentCompletionEmail = true;
    } catch (emailError) {
      showErrorMessage(\`Failed to send emails: \${emailError.message}\`);
    }
  }

 
}
// Generate HTML for the full conversation summary (sent to SMTP username)
function buildFullEmailHtml() {
  const formEntries = chatHistory.filter(e => e.node.type === 'form' && e.userInput);
  return \`
    <div style="font-family: Arial; max-width: 600px; margin: auto; padding: 20px;">
      <h2>Conversation Summary</h2>
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 15px;">
      \${chatHistory.map(entry => {
          // Bot responses: text, custom, condition; User inputs: form, singleInput, aiinput
          const isBot = ['text', 'custom', 'condition'].includes(entry.node.type) && !entry.userInput;
          return \`
            <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px;">
              <strong>\${isBot ? 'Assistant' : 'You'}:</strong>
              \${entry.userInput ? 
                (typeof entry.userInput === 'object' ? 
                  Object.entries(entry.userInput).map(([k, v]) => \`\${k}: \${v}\`).join('<br>') : 
                  entry.userInput) : 
                (entry.node.data?.label || 'No message')}
            </div>
          \`;
        }).join('')}
      </div>
      \${formEntries.length > 0 ? \`
        <div style="margin-top: 20px;">
          <h3>Form Submission Details</h3>
          \${formEntries.map(entry => \`
            <div style="background: #e9ecef; padding: 10px; border-radius: 4px; margin-top: 10px;">
              \${Object.entries(entry.userInput).map(([k, v]) => \`
                <div><strong>\${k}:</strong> \${v}</div>
              \`).join('')}
            </div>
          \`).join('')}
        </div>
      \` : ''}
    </div>
  \`;
}

// Generate HTML for only form submission details (sent to user)
function buildFormEmailHtml() {
  const formEntries = chatHistory.filter(e => e.node.type === 'form' && e.userInput);
  return \`
    <div style="font-family: Arial; max-width: 600px; margin: auto; padding: 20px;">
      <h2>Conversation Summary</h2>
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 15px;">
      \${chatHistory.map(entry => {
          // Bot responses: text, custom, condition; User inputs: form, singleInput, aiinput
          const isBot = ['text', 'custom', 'condition'].includes(entry.node.type) && !entry.userInput;
          return \`
            <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px;">
              <strong>\${isBot ? 'Assistant' : 'You'}:</strong>
              \${entry.userInput ? 
                (typeof entry.userInput === 'object' ? 
                  Object.entries(entry.userInput).map(([k, v]) => \`\${k}: \${v}\`).join('<br>') : 
                  entry.userInput) : 
                (entry.node.data?.label || 'No message')}
            </div>
          \`;
        }).join('')}
      </div>
      \${formEntries.length > 0 ? \`
        <div style="margin-top: 20px;">
          <h3>Form Submission Details</h3>
          \${formEntries.map(entry => \`
            <div style="background: #e9ecef; padding: 10px; border-radius: 4px; margin-top: 10px;">
              \${Object.entries(entry.userInput).map(([k, v]) => \`
                <div><strong>\${k}:</strong> \${v}</div>
              \`).join('')}
            </div>
          \`).join('')}
        </div>
      \` : ''}
    </div>
  \`;
}
async function saveInteraction(node, userInput, chatHistory = null) {
  const payload = {
    userId: config.userId,
    flowId: config.flowId,
    date: new Date().toISOString().split('T')[0],
  };

  // Include chatHistory if provided (e.g., at flow completion)
  if (chatHistory) {
    payload.chatHistory = chatHistory;
  }

  const response = await fetch('https://back.techrecto.com/api/chatbot/interactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(\`Failed to save interaction: \${response.statusText}\`);
  }

  const result = await response.json();
  console.log('[Chatbot] Interaction saved:', {
    nodeId: node.id,
    userInput,
    botResponse: node.data.label,
    uniqueId: result.uniqueId,
    chatHistoryIncluded: !!chatHistory,
  });
}

function checkEmailConditions(currentNode) {
  const formEntries = chatHistory.filter(e => e.node.type === 'form' && e.userInput);
  const hasEmailFlag = currentNode.data?.sendEmailOnCompletion;
  const emailNotSent = !window.hasSentCompletionEmail;

 

  return (formEntries.length > 0 || hasEmailFlag) && emailNotSent;
}

async function sendCompletionEmail(currentNode) {
  try {
    const formEntries = chatHistory.filter(e => e.node.type === 'form' && e.userInput);
    const email = formEntries.length > 0 
      ? formEntries[formEntries.length - 1].userInput.email || config.userEmail
      : config.userEmail;


    // Get SMTP config
    const smtpConfig = await getSmtpConfig();
    validateSmtpConfig(smtpConfig);

    // Prepare and send email
    const emailContent = buildEmailContent();
    await sendEmail(email, emailContent);

    window.hasSentCompletionEmail = true;
    showSuccessMessage(\`Summary sent to \${email}\`);
    
  } catch (error) {
    showErrorMessage(\`Email failed: \${error.message}\`);
  }
}

async function getSmtpConfig() {
  const response = await fetch(\`https://back.techrecto.com/api/smtp/get/\${config.userId}\`);
  if (!response.ok) {
    throw new Error(\`SMTP config failed: \${response.statusText}\`);
  }
  return await response.json();
}

function validateSmtpConfig(config) {
  if (!config?.host || !config?.port || !config?.username || !config?.password) {
    throw new Error('Invalid SMTP configuration');
  }
}

function buildEmailContent() {
  const formEntries = chatHistory.filter(e => e.node.type === 'form' && e.userInput);
  
  return {
    subject: \`Conversation Summary: \${flowName || 'Chat'}\`,
    html: \`
      <div style="font-family: Arial; max-width: 600px; margin: auto; padding: 20px;">
        <h2>Chat Summary: \${flowName || 'Conversation'}</h2>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
          \${chatHistory.map(entry => \`
            <div style="margin-bottom: 10px;">
              <strong>\${entry.node.type === 'bot' ? 'Bot' : 'You'}:</strong>
              \${entry.userInput ? 
                (typeof entry.userInput === 'object' ? 
                  Object.entries(entry.userInput).map(([k,v]) => \`\${k}: \${v}\`).join(', ') : 
                  entry.userInput) : 
                entry.node.data.label}
            </div>
          \`).join('')}
        </div>
      </div>
    \`
  };
}

async function sendEmail(to, content) {
  const response = await fetch('https://back.techrecto.com/api/smtp/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: config.userId,
      to,
      subject: content.subject,
      html: content.html,
      type: 'completion'
    }),
  });

  if (!response.ok) {
    throw new Error(\`Email send failed: \${response.statusText}\`);
  }
}


function renderCompletionMessage() {

  const messages = container.querySelector('.chatbot-messages');
  if (!messages) {
    showErrorMessage('Failed to render summary: Message container not found');
    return;
  }

  const formEntries = chatHistory.filter(e => e.node.type === 'form' && e.userInput);

  // Clear any existing typing indicators and previous summaries
  const typingIndicators = messages.querySelectorAll('.typing-indicator');
  typingIndicators.forEach(indicator => indicator.remove());
  const existingSummaries = messages.querySelectorAll('.completion-summary');
  existingSummaries.forEach(summary => summary.remove());

  // Ensure chatbot is open
  const chatbotWrapper = container.querySelector('#chatbot-wrapper');
  if (chatbotWrapper && (chatbotWrapper.style.display === 'none' || chatbotWrapper.style.opacity === '0')) {
    chatbotWrapper.style.display = 'flex';
    chatbotWrapper.style.pointerEvents = 'auto';
    chatbotWrapper.style.opacity = '1';
    chatbotWrapper.style.visibility = 'visible';
    chatbotWrapper.style.zIndex = '9999';
    isChatbotOpen = true;
    toggleIcon.classList.add('chatbot-toggle-hidden');
    toggleIcon.classList.remove('chatbot-toggle-visible');
    if (document.body.contains(toggleIcon)) {
      toggleIcon.remove();
    }
    updateResponsiveStyles();
  }

  try {
    // Append the summary
    messages.innerHTML += \`
      <div class="message bot-message completion-summary" style="
        background: \${isDarkMode ? 'rgba(55, 65, 81, 0.9)' : 'rgba(243, 244, 246, 0.9)'};
        backdrop-filter: blur(5px);
        color: \${isDarkMode ? '#e5e7eb' : '#1f2937'};
        padding: 16px;
        border-radius: 12px;
        max-width: 85%;
        align-self: flex-start;
        margin-top: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        z-index: 10000;
      ">
        <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 12px;">Conversation Summary</h3>
        <div style="
          background: \${isDarkMode ? 'rgba(75, 85, 99, 0.7)' : 'rgba(229, 231, 235, 0.7)'};
          padding: 12px;
          border-radius: 8px;
        ">
          \${chatHistory
            .map(entry => {
              const isBot = ['text', 'custom', 'condition'].includes(entry.node.type) && !entry.userInput;
              const isUser = !isBot && (entry.userInput || ['form', 'singleInput', 'aiinput'].includes(entry.node.type));
              
              if (!isBot && !isUser) return '';
              
              return \`
                <div style="
                  margin-bottom: 10px;
                  padding: 10px;
                  background: \${isDarkMode ? 'rgba(55, 65, 81, 0.9)' : 'rgba(255, 255, 255, 0.9)'};
                  border-radius: 4px;
                  font-size: 14px;
                ">
                  <strong style="color:\${isBot ? config.theme?.primary || '#6366f1' : config.theme?.secondary || '#4f46e5'}">
                    \${isBot ? 'Assistant' : 'You'}:
                  </strong>
                  \${
                    entry.userInput
                      ? (typeof entry.userInput === 'object'
                          ? \`<ul style="list-style: none; padding: 0; margin: 8px 0 0 0;">
                              \${Object.entries(entry.userInput).map(([k, v]) => \`<li><strong>\${k}:</strong> \${v}</li>\`).join('')}
                            </ul>\`
                          : entry.userInput)
                      : (entry.node.data?.label || 'No message')
                  }
                </div>
              \`;
            })
            .filter(Boolean)
            .join('')}
        </div>
        \${formEntries.length > 0 ? \`
          <div style="margin-top: 16px;">
            <h4 style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Form Submissions</h4>
            \${formEntries.map(entry => \`
              <div style="
                background: \${isDarkMode ? 'rgba(75, 85, 99, 0.7)' : 'rgba(229, 231, 235, 0.7)'};
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 8px;
                font-size: 14px;
              ">
                \${Object.entries(entry.userInput).map(([k, v]) => \`
                  <div style="margin-bottom: 6px;"><strong>\${k}:</strong> \${v}</div>
                \`).join('')}
              </div>
            \`).join('')}
          </div>
        \` : ''}
        <p style="margin: 16px 0 0; font-size: 15px; font-weight: 500;">
          Thank you for your interaction! The conversation is now complete.
        </p>
        <span style="
          font-size: 12px;
          color: \${isDarkMode ? '#9ca3af' : '#6b7280'};
          opacity: 0.6;
          display: block;
          margin-top: 8px;
        ">\${new Date().toLocaleTimeString()}</span>
      </div>
    \`;

    // Force DOM update and scroll to summary
    messages.scrollTop = messages.scrollHeight;
    const summaryElement = messages.querySelector('.completion-summary');
    if (summaryElement) {
      summaryElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } else {
      showErrorMessage('Failed to render summary: DOM element not found');
      // Retry appending after a delay
      setTimeout(() => {
        messages.innerHTML += messages.innerHTML; // Re-append to force update
        const retrySummary = messages.querySelector('.completion-summary');
        if (retrySummary) {
          retrySummary.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }, 200);
    }

    // Debug DOM state
  
  } catch (error) {
    showErrorMessage(\`Failed to render conversation summary: \${error.message}\`);
  }
}
function showSuccessMessage(message) {
  const messages = container.querySelector('.chatbot-messages');
  messages.innerHTML += \`
    <div style="
      padding: 12px 16px;
      background: rgba(0, 200, 0, 0.1);
      color: #2e7d32;
      border-radius: 12px;
      max-width: 75%;
      align-self: flex-start;
      margin-top: 16px;
    ">
      \${message}
    </div>
  \`;
}

function showErrorMessage(message) {
  const messages = container.querySelector('.chatbot-messages');
  messages.innerHTML += \`
    <div style="
      padding: 12px 16px;
      background: rgba(255, 0, 0, 0.1);
      color: #d32f2f;
      border-radius: 12px;
      max-width: 75%;
      align-self: flex-start;
      margin-top: 16px;
    ">
      \${message}
    </div>
  \`;
}
            const styleSheet = document.createElement('style');
            styleSheet.innerText = \`
              @keyframes slide-in {
                from { opacity: 0; transform: translateX(-10px); }
                to { opacity: 1; transform: translateX(0); }
              }
              @keyframes fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes typing {
                0%, 100% { transform: translateY(0); opacity: 0.7; }
                50% { transform: translateY(-4px); opacity: 1; }
              }
              .chatbot-messages::-webkit-scrollbar {
                width: 6px;
              }
              .chatbot-messages::-webkit-scrollbar-track {
                background: \${isDarkMode ? 'rgba(55, 65, 81, 0.9)' : 'rgba(243, 244, 246, 0.9)'};
                border-radius: 3px;
              }
              .chatbot-messages::-webkit-scrollbar-thumb {
                background: \${config.theme?.primary || '#6366f1'};
                border-radius: 3px;
              }
              #chatbot-wrapper[style*="display: none"] {
                display: none !important;
                pointer-events: none !important;
                opacity: 0 !important;
                visibility: hidden !important;
                z-index: -1000 !important;
              }
              .chatbot-toggle-hidden {
                display: none !important;
                pointer-events: none !important;
                opacity: 0 !important;
                z-index: -1000 !important;
                visibility: hidden !important;
                position: absolute !important;
                left: -9999px !important;
                top: -9999px !important;
              }
              .chatbot-toggle-visible {
                display: flex !important;
                pointer-events: auto !important;
                opacity: 1 !important;
                z-index: 10000 !important;
                visibility: visible !important;
                position: fixed !important;
                bottom: 20px !important;
                right: 20px !important;
              }
              @media (max-width: 480px) {
                .chatbot-messages {
                  padding: 16px !important;
                  font-size: 14px !important;
                }
                .chatbot-input {
                  padding: 12px 16px !important;
                }
                .chatbot-input input {
                  font-size: 14px !important;
                }
                .message {
                  max-width: 85% !important;
                }
              }
              @media (hover: none) {
                button:hover, input:focus {
                  transform: none !important;
                  box-shadow: none !important;
                }
              }
            \`;
            document.head.appendChild(styleSheet);
          } catch (e) {
          }
        }, 500); // Delay to ensure DOM readiness
      };
    `;
    res.set('Content-Type', 'application/javascript');
    res.send(script);
  } catch (error) {
    res.status(500).send('Error serving chatbot script');
  }
})







// POST /interactions - Save a complete interaction
// POST /interactions - Save a complete interaction
router.post('/interactions', async (req, res) => {
  try {
    const { userId, flowId, chatHistory } = req.body;

    // Validate required fields
    if (!userId || !flowId ) {
      return res.status(400).json({ message: 'Missing required interaction parameters' });
    }

    // Get current date in YYYY-MM-DD format
    const currentDate = new Date().toISOString().split('T')[0]; // e.g., "2025-07-10"

    // Get user's IP address
    const ipAddress = req.ip || 
                     req.headers['x-forwarded-for']?.split(',')[0].trim() || 
                     req.socket.remoteAddress || 
                     null;

    // Create and save the interaction
    const interaction = new Interaction({
      userId,
      flowId,
      
      date: currentDate,
      ipAddress,
      chatHistory: chatHistory || [], // Save chatHistory if provided
    });

    await interaction.save();
    res.status(201).json({ message: 'Interaction saved successfully', uniqueId: interaction.uniqueId });
  } catch (error) {
    console.error('[Interactions] Error saving interaction:', error.message);
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
      return res.status(400).json({ message: 'Missing flowId or userId' });
    }

    // Fetch interactions from MongoDB
    const interactions = await Interaction.find({ flowId, userId })
      .select('date timestamp uniqueId ipAddress chatHistory')
      .sort({ timestamp: -1 }); // Sort by timestamp descending (newest first)

    // Group interactions by date
    const groupedByDate = interactions.reduce((acc, interaction) => {
      const date = interaction.date; // YYYY-MM-DD
      if (!acc[date]) {
        acc[date] = { date, interactions: [] };
      }
      
      acc[date].interactions.push({
        _id: interaction._id,
        uniqueId: interaction.uniqueId,
        timestamp: interaction.timestamp,
        ipAddress: interaction.ipAddress,
        chatHistory: interaction.chatHistory,
      });
      return acc;
    }, {});

    // Convert to array and sort by date descending
    const result = Object.values(groupedByDate)
      .map(group => ({
        date: group.date,
        interactions: group.interactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json(result);
  } catch (error) {
    console.error('[Interactions] Error fetching interactions:', error.message);
    res.status(500).json({ message: 'Failed to fetch interactions', error: error.message });
  }
});

router.post('/form-responses', async (req, res) => {

  try {
    const { userEmail, userId, flowId, formId, formName, date, submitDate, response, ...customFields } = req.body;

    // Validate required fields
    if (!userEmail || !userId || !flowId || !formId || !formName || !date || !submitDate || !response) {
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
    res.status(201).json({ message: 'Form response saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save form response', details: error.message });
  }
});


module.exports = router;