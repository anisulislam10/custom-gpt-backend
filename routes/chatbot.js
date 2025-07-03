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
            container.style.position = 'relative';
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

          let isChatbotOpen = false;
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
            console.log('[Chatbot] Set closed state:', {
              display: chatbotWrapper.style.display,
              pointerEvents: chatbotWrapper.style.pointerEvents,
              opacity: chatbotWrapper.style.opacity,
              visibility: chatbotWrapper.style.visibility,
              zIndex: chatbotWrapper.style.zIndex,
              toggleInDOM: document.body.contains(toggleIcon),
              toggleClasses: toggleIcon.className,
              isChatbotOpen
            });
          };
          setClosedState();

          // Toggle chatbot visibility
          const toggleChatbot = () => {
            console.log('[Chatbot] toggleChatbot called, isChatbotOpen:', isChatbotOpen);
            if (!isChatbotOpen) {
              console.log('[Chatbot] Opening chatbot');
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
                console.log('[Chatbot] Toggle removed from DOM');
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
            console.log('[Chatbot] Chatbot state after toggle:', {
              display: chatbotWrapper.style.display,
              pointerEvents: chatbotWrapper.style.pointerEvents,
              opacity: chatbotWrapper.style.opacity,
              visibility: chatbotWrapper.style.visibility,
              zIndex: chatbotWrapper.style.zIndex,
              toggleInDOM: document.body.contains(toggleIcon),
              toggleClasses: toggleIcon.className,
              isChatbotOpen
            });
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

          // Mutation observer for toggle and wrapper
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              const removedNodes = Array.from(mutation.removedNodes);
              const addedNodes = Array.from(mutation.addedNodes);
              if (addedNodes.includes(toggleIcon) && isChatbotOpen) {
                console.log('[Chatbot] Toggle unexpectedly added to DOM, removing');
                toggleIcon.remove();
              }
              if (removedNodes.includes(toggleIcon) && !isChatbotOpen) {
                console.log('[Chatbot] Toggle unexpectedly removed, restoring');
                document.body.appendChild(toggleIcon);
                toggleIcon.classList.remove('chatbot-toggle-hidden');
                toggleIcon.classList.add('chatbot-toggle-visible');
              }
              if (addedNodes.includes(chatbotWrapper) && !isChatbotOpen) {
                console.log('[Chatbot] Wrapper unexpectedly added to DOM, setting closed state');
                setClosedState();
              }
            });
          });
          observer.observe(document.body, { childList: true });

          // Responsive styles
          const updateResponsiveStyles = () => {
            console.log('[Chatbot] updateResponsiveStyles called, isChatbotOpen:', isChatbotOpen);
            const closeChat = container.querySelector('#close-chat');
            if (window.innerWidth <= 480) {
              if (isChatbotOpen) {
                chatbotWrapper.style.width = '100vw';
                chatbotWrapper.style.height = '100vh';
                chatbotWrapper.style.borderRadius = '0';
                chatbotWrapper.style.top = '0';
                chatbotWrapper.style.right = '0';
                chatbotWrapper.style.bottom = '0';
                chatbotWrapper.style.left = '0';
                chatbotWrapper.style.zIndex = '999';
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
                chatbotWrapper.style.zIndex = '999';
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
              console.log('[Chatbot] Toggle appended to DOM by updateResponsiveStyles');
            } else if (isChatbotOpen && document.body.contains(toggleIcon)) {
              toggleIcon.remove();
              console.log('[Chatbot] Toggle removed from DOM by updateResponsiveStyles');
            }
            console.log('[Chatbot] Responsive styles updated:', {
              device: window.innerWidth <= 480 ? 'mobile' : 'desktop',
              toggleInDOM: document.body.contains(toggleIcon),
              toggleClasses: toggleIcon.className,
              chatbotDisplay: chatbotWrapper.style.display,
              chatbotPointerEvents: chatbotWrapper.style.pointerEvents,
              chatbotOpacity: chatbotWrapper.style.opacity,
              chatbotVisibility: chatbotWrapper.style.visibility,
              chatbotZIndex: chatbotWrapper.style.zIndex,
              isChatbotOpen
            });
          };

          // Debounce resize event
          let resizeTimeout;
          window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(updateResponsiveStyles, 100);
          });

          // Initial call to set responsive styles
          updateResponsiveStyles();

          // Debug mousemove
          document.addEventListener('mousemove', (e) => {
            const elements = document.elementsFromPoint(e.clientX, e.clientY);
            const toggleState = {
              id: toggleIcon.id || 'chatbot-toggle',
              inDOM: document.body.contains(toggleIcon),
              classes: toggleIcon.className,
              display: document.body.contains(toggleIcon) ? window.getComputedStyle(toggleIcon).display : 'not in DOM',
              pointerEvents: document.body.contains(toggleIcon) ? window.getComputedStyle(toggleIcon).pointerEvents : 'not in DOM',
              opacity: document.body.contains(toggleIcon) ? window.getComputedStyle(toggleIcon).opacity : 'not in DOM',
              zIndex: document.body.contains(toggleIcon) ? window.getComputedStyle(toggleIcon).zIndex : 'not in DOM',
              visibility: document.body.contains(toggleIcon) ? window.getComputedStyle(toggleIcon).visibility : 'not in DOM',
              position: document.body.contains(toggleIcon) ? toggleIcon.getBoundingClientRect() : 'not in DOM',
              isChatbotOpen
            };
            const wrapperState = {
              id: chatbotWrapper.id || 'chatbot-wrapper',
              inDOM: document.body.contains(chatbotWrapper),
              display: window.getComputedStyle(chatbotWrapper).display,
              pointerEvents: window.getComputedStyle(chatbotWrapper).pointerEvents,
              opacity: window.getComputedStyle(chatbotWrapper).opacity,
              visibility: window.getComputedStyle(chatbotWrapper).visibility,
              zIndex: window.getComputedStyle(chatbotWrapper).zIndex,
              position: chatbotWrapper.getBoundingClientRect(),
              isChatbotOpen
            };
            console.log('[Chatbot] Elements under cursor:', elements.map(el => ({
              id: el.id || el.tagName,
              zIndex: window.getComputedStyle(el).zIndex,
              display: window.getComputedStyle(el).display,
              visibility: window.getComputedStyle(el).visibility
            })));
            console.log('[Chatbot] Toggle state on mousemove:', toggleState);
            console.log('[Chatbot] Wrapper state on mousemove:', wrapperState);
          });

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

          let currentNodeId = null;
          let chatHistory = [];
          let isTyping = false;
          let flowName = '';

          const fetchUrl = \`https://back.techrecto.com/api/flow/\${config.userId}/\${config.flowId}\`;
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
              flowName = flow.name || 'Unnamed Flow';
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
                                          transition: border-color 0.2s, box-shadow: 0.2s;
                                        "
                                        onfocus="this.style.borderColor='\${config.theme?.primary || '#6366f1'}'; this.style.boxShadow='0 0 0 3px rgba(99, 102, 241, 0.1)'"
                                        onblur="this.style.borderColor='\${isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)'}'; this.style.boxShadow='none'"
                                        \${field.required ? 'required' : ''}
                                        aria-label="\${field.label}"
                                        \${field.key === 'email' ? 'pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\\\\.[a-z]{2,}$"' : ''}
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
                    const email = data.email || config.userEmail;
                    if (email && !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) {
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

              const handleInteraction = async (nodeId, userInput, optionIndex = null) => {
                console.log('[Chatbot] Interaction:', { nodeId, userInput, optionIndex });
                const currentNode = nodes.find((n) => n.id === nodeId);

                const currentHistoryEntry = chatHistory.find((h) => h.node.id === nodeId && !h.userInput);
                if (currentHistoryEntry) {
                  currentHistoryEntry.userInput = userInput;
                } else {
                  chatHistory.push({ node: currentNode, userInput });
                }

                requestAnimationFrame(renderChat);

                if (currentNode.type === 'form') {
                  const email = userInput.email || config.userEmail;
                  if (!email) {
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
                        font-size: 14px;
                      ">
                        Email is required to submit the form.
                      </div>
                    \`;
                    messages.scrollTop = messages.scrollHeight;
                    isTyping = false;
                    return;
                  }

                  try {
                    const response = await fetch('https://back.techrecto.com/api/chatbot/form-responses', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userEmail: email,
                        formId: nodeId,
                        formName: flowName || 'Unnamed Form',
                        flowId: config.flowId,
                        userId: config.userId,
                        date: new Date().toISOString().split('T')[0],
                        submitDate: new Date().toISOString(),
                        response: userInput
                      })
                    });
                    if (!response.ok) {
                      throw new Error(\`Failed to save form response: \${response.statusText}\`);
                    }
                    console.log('[Chatbot] Form response saved:', { userEmail: email, formId: nodeId, response: userInput });
                  } catch (error) {
                    console.error('[Chatbot] Error saving form response:', error.message);
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
                        font-size: 14px;
                      ">
                        Failed to submit form. Please try again.
                      </div>
                    \`;
                    messages.scrollTop = messages.scrollHeight;
                    isTyping = false;
                    return;
                  }
                }

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

                    fetch('https://back.techrecto.com/api/chatbot/interactions', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userId: config.userId,
                        flowId: config.flowId,
                        nodeId: nextNode.id,
                        userInput: userInput || null,
                        botResponse: nextNode.data.label || 'Bot response',
                        date: new Date().toISOString().split('T')[0]
                      })
                    })
                      .then((response) => {
                        if (!response.ok) {
                          throw new Error(\`Failed to save interaction: \${response.statusText}\`);
                        }
                        console.log('[Chatbot] Interaction saved:', { userInput, botResponse: nextNode.data.label || 'Bot response' });
                      })
                      .catch((error) => {
                        console.error('[Chatbot] Error saving interaction:', error.message);
                      });

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
              z-index: 1000 !important;
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
        });
      };
    `;
    res.set('Content-Type', 'application/javascript');
    res.send(script)


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