// routes/chatbot.js
const express = require('express');
const router = express.Router();
const Flow = require('../models/Flow');

// router.get('/:flowId/:userId', async (req, res) => {
//   console.log(`[Chatbot] Serving chatbot for flowId: ${req.params.flowId}, userId: ${req.params.userId}, domain: ${req.query.domain || 'not provided'}`);
  
//   try {
//     const { flowId, userId } = req.params;
//     const { domain } = req.query;
//     const origin = req.get('Origin') || '';

//     // Validate input parameters
//     if (!flowId || !userId || !domain) {
//       console.error(`[Chatbot] Missing parameters - flowId: ${flowId}, userId: ${userId}, domain: ${domain}`);
//       return res.status(400).json({ message: 'Missing flowId, userId, or domain' });
//     }

//     // Find the flow
//     const flow = await Flow.findOne({
//       _id: flowId,
//       userId,
//     });

//     // Check if flow exists
//     if (!flow) {
//       console.error(`[Chatbot] Flow not found for flowId: ${flowId}, userId: ${userId}`);
//       return res.status(404).json({ message: 'Flow not found' });
//     }

//     // Normalize and validate website domain
//     const normalizedDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
//     if (flow.websiteDomain !== normalizedDomain) {
//       console.error(`[Chatbot] Domain mismatch - expected: ${flow.websiteDomain}, received: ${normalizedDomain}`);
//       return res.status(403).json({ message: 'Invalid or unauthorized domain' });
//     }

//     // Validate request origin (optional, for additional security)
//     const normalizedOrigin = origin.replace(/^https?:\/\//, '').replace(/\/$/, '');
//     if (origin && normalizedOrigin !== flow.websiteDomain) {
//       console.error(`[Chatbot] Origin mismatch - expected: ${flow.websiteDomain}, received: ${normalizedOrigin}`);
//       return res.status(403).json({ message: 'Invalid request origin' });
//     }

//     // Serve chatbot data
  
//     res.set('Content-Security-Policy', "default-src 'self'; script-src 'self' https://custom-gpt-backend-sigma.vercel.app; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://*; frame-ancestors *; connect-src 'self' https://custom-gpt-backend-sigma.vercel.app");

//     res.send(`
//       <!DOCTYPE html>
//       <html>
//       <head>
//         <title>Chatbot</title>
//         <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
//         <script src="/api/chatbot/script.js"></script>
//         <script src="/api/chatbot/config.js?flowId=${req.params.flowId}&userId=${req.params.userId}&primary=${encodeURIComponent(req.query.primary || '#6366f1')}&secondary=${encodeURIComponent(req.query.secondary || '#f59e0b')}&background=${encodeURIComponent(req.query.background || '#f8fafc')}&text=${encodeURIComponent(req.query.text || '#1f2937')}&name=${encodeURIComponent(req.query.name || 'Assistant')}&avatar=${encodeURIComponent(req.query.avatar || 'https://img.freepik.com/free-vector/chatbot-chat-message-vectorart_78370-4104.jpg?semt=ais_hybrid&w=200')}"></script>
//         <script src="/chatbot-init.js"></script>
//       </head>
//       <body>
//         <div id="chatbot-container" style="width: 100%; height: 100%;"></div>
//       </body>
//       </html>
//     `);
//   } catch (error) {
//     console.error('[Chatbot] Error in chatbot route:', error);
//     res.status(500).json({ message: 'Failed to load chatbot', error: error.message });
//   }
// });

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
if (!isPreview) {
  const normalizedDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const normalizedStoredDomain = flow.websiteDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');

  // Check if the provided domain matches the stored domain
  if (normalizedDomain !== normalizedStoredDomain) {
    console.error(`[Chatbot] Domain mismatch - expected: ${normalizedStoredDomain}, received: ${normalizedDomain}`);
    return res.status(403).json({ message: 'Invalid or unauthorized domain' });
  }

  // Validate request Origin (optional, for additional security)
  const origin = req.get('Origin') || '';
  if (origin) {
    const normalizedOrigin = origin.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (normalizedOrigin !== normalizedStoredDomain) {
      console.error(`[Chatbot] Origin mismatch - expected: ${normalizedStoredDomain}, received: ${normalizedOrigin}`);
      return res.status(403).json({ message: 'Invalid request origin' });
    }
  }

  // Validate browser base URL via Referer header (optional, for additional security)
  const referer = req.get('Referer') || '';
  if (referer) {
    // Extract the hostname from the Referer URL
    try {
      const refererUrl = new URL(referer);
      const normalizedReferer = refererUrl.hostname.replace(/\/$/, '');
      if (normalizedReferer !== normalizedStoredDomain) {
        console.error(`[Chatbot] Referer mismatch - expected: ${normalizedStoredDomain}, received: ${normalizedReferer}`);
        return res.status(403).json({ message: 'Invalid request referer' });
      }
    } catch (error) {
      console.error(`[Chatbot] Invalid Referer header: ${referer}, error: ${error.message}`);
      return res.status(400).json({ message: 'Invalid Referer header' });
    }
  }
}

    // Serve chatbot data
    res.set('Content-Security-Policy', "default-src 'self'; script-src 'self' https://custom-gpt-backend-sigma.vercel.app; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://*; frame-ancestors *; connect-src 'self' https://custom-gpt-backend-sigma.vercel.app");

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
router.get('/script.js', async (req, res) => {
  try {
    console.log('[Chatbot] Serving chatbot script');
    const script = `
      window.initChatbot = function () {
        console.log('[Chatbot] Initializing chatbot');
        document.addEventListener('DOMContentLoaded', () => {
          const config = window.ChatbotConfig || {};
          console.log('[Chatbot] Config:', config);

          const container = document.getElementById('chatbot-container');
          if (!container) {
            console.error('[Chatbot] Error: <div id="chatbot-container"> not found');
            document.body.innerHTML = \`
              <div style="
                padding: 24px;
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(10px);
                color: #d32f2f;
                border-radius: 12px;
                text-align: center;
                font-family: Manrope, sans-serif;
                max-width: 400px;
                margin: 20px auto;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
              ">
                <p style="font-size: 16px; font-weight: 600; margin: 0;">Error: Chatbot container not found</p>
              </div>
            \`;
            return;
          }

          // Initialize chatbot UI with glassmorphism
          container.innerHTML = \`
            <div class="chatbot-wrapper" style="
              background: rgba(255, 255, 255, 0.9);
              backdrop-filter: blur(10px);
              color: \${config.theme?.text || '#1f2937'};
              border-radius: 16px;
              box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.2);
              display: flex;
              flex-direction: column;
              height: 100%;
              font-family: Manrope, sans-serif;
              overflow: hidden;
              display: none;
              transition: opacity 0.3s ease, transform 0.3s ease;
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
                  "
                  onmouseover="this.style.background='rgba(255, 255, 255, 0.1)'"
                  onmouseout="this.style.background='transparent'">
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
                  "
                  onmouseover="this.style.background='rgba(255, 255, 255, 0.1)'"
                  onmouseout="this.style.background='transparent'">
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
                    transition: background 0.2s;"
                  onmouseover="this.style.background='rgba(255, 255, 255, 0.1)'"
                  onmouseout="this.style.background='transparent'">
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
                    display: pxpx;
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
                      z-index: 1001; /* Ensure send button is above other elements */
                    "
                    onmouseover="this.style.background='\${config.theme?.secondary || '#4f46e5'}'"
                    onmouseout="this.style.background='\${config.theme?.primary || '#6366f1'}'"
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
          const toggleIcon = document.createElement('button');
          toggleIcon.innerHTML = \`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          \`;
          toggleIcon.setAttribute('aria-label', 'Toggle assistant');
          toggleIcon.setAttribute('tabindex', '0');
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
            transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
          \`;
          toggleIcon.addEventListener('mouseover', () => {
            toggleIcon.style.transform = 'scale(1.1)';
            toggleIcon.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
          });
          toggleIcon.addEventListener('mouseout', () => {
            toggleIcon.style.transform = 'scale(1)';
            toggleIcon.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          });
          toggleIcon.addEventListener('click', () => {
            const isHidden = chatbotWrapper.style.display === 'none' || !chatbotWrapper.style.display;
            chatbotWrapper.style.display = isHidden ? 'flex' : 'none';
            toggleIcon.style.display = isHidden ? 'none' : 'flex';
            if (isHidden) {
              chatbotWrapper.style.opacity = '0';
              chatbotWrapper.style.transform = 'translateY(20px)';
              setTimeout(() => {
                chatbotWrapper.style.opacity = '1';
                chatbotWrapper.style.transform = 'translateY(0)';
                if (window.innerWidth <= 480) {
                  container.querySelector('.chatbot-input input')?.focus();
                }
              }, 10);
            }
          });
          toggleIcon.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleIcon.click();
            }
          });
          document.body.appendChild(toggleIcon);

          const chatbotWrapper = container.querySelector('.chatbot-wrapper');
          chatbotWrapper.style.position = 'fixed';
          chatbotWrapper.style.width = '400px';
          chatbotWrapper.style.height = '600px';
          chatbotWrapper.style.bottom = '90px';
          chatbotWrapper.style.right = '20px';
          chatbotWrapper.style.zIndex = '999';

          // Theme toggle logic
          let isDarkMode = false;
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

          // Close button logic for mobile
          const closeChat = container.querySelector('#close-chat');
          closeChat.addEventListener('click', () => {
            chatbotWrapper.style.display = 'none';
            toggleIcon.style.display = 'flex';
          });
          closeChat.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              closeChat.click();
            }
          });

          if (!config.userId || !config.flowId) {
            console.error('[Chatbot] Error: userId or flowId missing in ChatbotConfig');
            container.querySelector('.chatbot-messages').innerHTML = \`
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

          let currentNodeId = null;
          let chatHistory = [];
          let isTyping = false;

          const fetchUrl = \`https://custom-gpt-backend-sigma.vercel.app/api/flow/\${config.userId}/\${config.flowId}\`;
          console.log('[Chatbot] Fetching flow from:', fetchUrl);
          fetch(fetchUrl, { method: 'GET', headers: { 'Accept': 'application/json' } })
            .then((response) => {
              console.log('[Chatbot] Fetch response status:', response.status, response.statusText);
              if (!response.ok) {
                throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
              }
              return response.json();
            })
            .then((flow) => {
              console.log('[Chatbot] Flow data received:', flow);
              if (!flow.nodes || !flow.edges) {
                throw new Error('Invalid flow data: nodes or edges missing');
              }

              const { nodes, edges } = flow;

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

              const autoAdvanceTextNodes = () => {
                let current = nodes.find((n) => n.id === currentNodeId);
                while (current && current.type === 'text' && !chatHistory.find((h) => h.node.id === current.id && h.userInput)) {
                  const nextEdge = edges.find((edge) => edge.source === current.id);
                  if (!nextEdge) break;
                  const nextNode = nodes.find((n) => n.id === nextEdge.target);
                  if (!nextNode) break;
                  currentNodeId = nextNode.id;
                  chatHistory.push({ node: nextNode, userInput: null });
                  current = nextNode;
                }
                requestAnimationFrame(renderChat);
              };

              const renderChat = () => {
                const messages = container.querySelector('.chatbot-messages');
                const inputWrapper = container.querySelector('.chatbot-input');
                const currentNode = nodes.find((n) => n.id === currentNodeId);

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

                    // Render bot message
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
                          \${userInput ? '' : \`
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
                          \${userInput ? '' : \`
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
                                          transition: border-color 0.2s, box-shadow 0.2s;
                                        "
                                        onfocus="this.style.borderColor='\${config.theme?.primary || '#6366f1'}'; this.style.boxShadow='0 0 0 3px rgba(99, 102, 241, 0.1)'"
                                        onblur="this.style.borderColor='\${isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)'}'; this.style.boxShadow='none'"
                                        \${field.required ? 'required' : ''}
                                        aria-label="\${field.label}"
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
                          <p style="margin: 0; font-size: 15px; font-weight: 400;">\${node.data.label || (node.type === 'aiinput' ? 'Assistant' : 'Please enter your response')}</p>
                          <span style="
                            font-size: 12px;
                            color: \${isDarkMode ? '#9ca3af' : '#6b7280'};
                            opacity: 0.6;
                            margin-top: 4px;
                            display: block;
                          ">\${timestamp}</span>
                        </div>
                      \`;
                    }

                    // Render user input
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
                          \${
                            typeof userInput === 'object'
                              ? \`<pre style="margin: 0; font-size: 14px; font-weight: 400;">\${JSON.stringify(userInput, null, 2)}</pre>\`
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

                container.querySelectorAll('button[data-option-index]').forEach((btn) => {
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
                  const incomingEdges = edges.reduce((acc, edge) => {
                    acc[edge.target] = true;
                    return acc;
                  }, {});
                  const startNode = nodes.find((node) => !incomingEdges[node.id]) || nodes[0];
                  if (startNode) {
                    currentNodeId = startNode.id;
                    chatHistory = [{ node: startNode, userInput: null }];
                    isTyping = false;
                    autoAdvanceTextNodes();
                    requestAnimationFrame(renderChat);
                  }
                });
              };

              const handleInteraction = (nodeId, userInput, optionIndex = null) => {
                console.log('[Chatbot] Interaction:', { nodeId, userInput, optionIndex });
                const currentNode = nodes.find((n) => n.id === nodeId);

                // Add user input to chat history for the current node
                const currentHistoryEntry = chatHistory.find((h) => h.node.id === nodeId && !h.userInput);
                if (currentHistoryEntry) {
                  currentHistoryEntry.userInput = userInput;
                } else {
                  chatHistory.push({ node: currentNode, userInput });
                }

                // Render chat to show user input immediately
                requestAnimationFrame(renderChat);

                // Find next node
                let nextEdge = null;
                if (currentNode.type === 'custom' && optionIndex !== null) {
                  const sourceHandle = \`option-\${optionIndex}\`;
                  nextEdge = edges.find((edge) => edge.source === nodeId && edge.sourceHandle === sourceHandle);
                } else {
                  nextEdge = edges.find((edge) => edge.source === nodeId);
                }

                if (nextEdge) {
                  const nextNode = nodes.find((n) => n.id === nextEdge.target);
                  if (nextNode) {
                    currentNodeId = nextNode.id;
                    chatHistory.push({ node: nextNode, userInput: null });
                    setTimeout(() => {
                      isTyping = false;
                      autoAdvanceTextNodes();
                    }, 300);
                  } else {
                    console.error('[Chatbot] Error: Next node not found for edge:', nextEdge);
                    isTyping = false;
                    requestAnimationFrame(renderChat);
                  }
                } else {
                  console.warn('[Chatbot] No next edge found for node:', nodeId);
                  isTyping = false;
                  requestAnimationFrame(renderChat);
                }
              };

              autoAdvanceTextNodes();
            })
            .catch((error) => {
              console.error('[Chatbot] Failed to load chatbot:', error);
              container.querySelector('.chatbot-messages').innerHTML = \`
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
                  <p style="font-size: 16px; font-weight: 600; margin: 0;">Error loading assistant: \${error.message}</p>
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
            @media (max-width: 480px) {
              .chatbot-wrapper {
                width: 100vw !important;
                height: 100vh !important;
                border-radius: 0 !important;
                top: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                left: 0 !important;
              }
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
              #close-chat {
                display: block !important;
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

          // Responsive adjustments
          const updateResponsiveStyles = () => {
            if (window.innerWidth <= 480) {
              closeChat.style.display = 'block';
              toggleIcon.style.display = chatbotWrapper.style.display === 'none' ? 'flex' : 'none';
            } else {
              closeChat.style.display = 'none';
            }
          };
          window.addEventListener('resize', updateResponsiveStyles);
          updateResponsiveStyles();
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
module.exports = router;