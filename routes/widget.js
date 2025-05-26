// backend/routes/widget.js
const express = require("express");
const router = express.Router();
const path = require("path");
const Flow = require("../models/Flow");

router.get("/widget.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.sendFile(path.join(__dirname, "../public/widget.js"));
});

// New route for JavaScript embed
router.get("/chatbot-widget.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.send(`
    (function() {
      // Read the config from the script's data-config attribute
      const scripts = document.getElementsByTagName("script");
      const currentScript = scripts[scripts.length - 1];
      const config = JSON.parse(currentScript.dataset.config || '{}');

      // Default config values
      const flowId = config.flowId || '';
      const userId = config.userId || '';
      const theme = config.theme || 'light';
      const primary = config.primary || '#3b82f6';
      const background = config.background || '#f9fafb';
      const text = config.text || '#111827';
      const border = config.border || '#e5e7eb';
      const position = config.position || 'bottom-right';
      const width = config.width || '360px';
      const height = config.height || '480px';

      // Validate required fields
      if (!flowId || !userId) {
        console.error("Chatbot embed error: flowId and userId are required");
        return;
      }

      // Create iframe
      const iframe = document.createElement("iframe");
      const queryParams = new URLSearchParams({
        flowId,
        userId,
        theme,
        primary,
        background,
        text,
        border,
      }).toString();

      iframe.src = 'http://localhost:5000/api/widget?' + queryParams;
      iframe.width = width;
      iframe.height = height;
      iframe.frameBorder = "0";
      iframe.title = "FlowBuilder Chatbot";
      iframe.style.position = "fixed";
      iframe.style.zIndex = "1000";
      iframe.style.borderRadius = "12px";
      iframe.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";

      // Set position
      if (position === 'bottom-right') {
        iframe.style.bottom = "20px";
        iframe.style.right = "20px";
      } else if (position === 'bottom-left') {
        iframe.style.bottom = "20px";
        iframe.style.left = "20px";
      } else {
        iframe.style.bottom = "20px";
        iframe.style.right = "20px"; // Default to bottom-right
      }

      // Append iframe to the body
      document.body.appendChild(iframe);
      console.log("Chatbot widget loaded with config:", config);
    })();
  `);
});

// Existing /api/widget route (unchanged)
router.get("/widget", async (req, res) => {
  const { flowId, userId, theme = "light", primary, secondary, background, text, border, font } = req.query;

  const themes = {
    light: {
      primary: "#3b82f6",
      secondary: "#f59e0b",
      success: "#10b981",
      danger: "#ef4444",
      background: "#f9fafb",
      sidebar: "#ffffff",
      text: "#111827",
      border: "#e5e7eb",
      font: "'Inter', sans-serif",
    },
    dark: {
      primary: "#60a5fa",
      secondary: "#fbbf24",
      success: "#34d399",
      danger: "#f87171",
      background: "#1f2937",
      sidebar: "#111827",
      text: "#f3f4f6",
      border: "#374151",
      font: "'Inter', sans-serif",
    },
    ocean: {
      primary: "#06b6d4",
      secondary: "#0ea5e9",
      success: "#14b8a6",
      danger: "#f43f5e",
      background: "#f0f9ff",
      sidebar: "#e0f2fe",
      text: "#082f49",
      border: "#bae6fd",
      font: "'Inter', sans-serif",
    },
  };

  const customTheme = {
    primary: primary || themes[theme]?.primary || "#3b82f6",
    secondary: secondary || themes[theme]?.secondary || "#f59e0b",
    success: themes[theme]?.success || "#10b981",
    danger: themes[theme]?.danger || "#ef4444",
    background: background || themes[theme]?.background || "#f9fafb",
    sidebar: themes[theme]?.sidebar || "#ffffff",
    text: text || themes[theme]?.text || "#111827",
    border: border || themes[theme]?.border || "#e5e7eb",
    font: font || themes[theme]?.font || "'Inter', sans-serif",
  };

  try {
    const flow = await Flow.findOne({ userId, _id: flowId });
    if (!flow) {
      console.error("Flow not found:", { flowId, userId });
      return res.status(404).send("<p>Flow not found</p>");
    }
    console.log("Serving iframe with flow:", flow);

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
        <style>
          body { margin: 0; font-family: ${customTheme.font}; background: ${customTheme.background}; color: ${customTheme.text}; }
          .chatbot-container { width: 360px; height: 480px; display: flex; flex-direction: column; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .chatbot-header { background: ${customTheme.primary}; color: white; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
          .chatbot-toggle { background: none; border: none; color: white; cursor: pointer; font-size: 16px; }
          .chatbot-reset { background: none; border: none; color: white; cursor: pointer; }
          .chatbot-messages { flex: 1; overflow-y: auto; padding: 16px; background: ${customTheme.background}; }
          .chatbot-input { padding: 12px 16px; border-top: 1px solid ${customTheme.border}; display: flex; gap: 8px; }
          .chatbot-input input { flex: 1; padding: 8px; border: 1px solid ${customTheme.border}; border-radius: 20px; outline: none; }
          .chatbot-input button { background: ${customTheme.primary}; color: white; padding: 8px 16px; border-radius: 20px; border: none; cursor: pointer; }
          .chatbot-input button:hover { background: ${customTheme.secondary}; }
          .message { margin: 8px 0; padding: 8px 12px; border-radius: 12px; max-width: 80%; }
          .bot-message { background: #f3f4f6; color: ${customTheme.text}; border-radius: 12px 12px 12px 0; }
          .ai-message { background: #f3e8ff; color: ${customTheme.text}; border-radius: 12px 12px 12px 0; }
          .user-message { background: ${customTheme.primary}; color: white; border-radius: 12px 12px 0 12px; align-self: flex-end; }
          .system-message { background: ${customTheme.border}; color: ${customTheme.text}; text-align: center; }
          .option-button { display: block; width: 100%; padding: 8px; margin: 4px 0; border: 1px solid ${customTheme.border}; border-radius: 6px; cursor: pointer; background: #fff; }
          .option-button:hover { background: #f3f4f6; }
          .form-field { margin-bottom: 12px; }
          .form-field label { display: block; margin-bottom: 4px; }
          .form-field input, .form-field select { width: 100%; padding: 8px; border: 1px solid ${customTheme.border}; border-radius: 6px; }
          .input-form { display: flex; gap: 8px; margin-top: 8px; }
          .input-form input { flex: 1; padding: 8px; border: 1px solid ${customTheme.border}; border-radius: 6px 0 0 6px; }
          .input-form button { background: ${customTheme.primary}; color: white; padding: 8px 16px; border-radius: 0 6px 6px 0; border: none; cursor: pointer; }
          .input-form button:hover { background: ${customTheme.secondary}; }
          form button { background: ${customTheme.primary}; color: white; padding: 8px; border-radius: 6px; width: 100%; }
          @media (max-width: 480px) {
            .chatbot-container { width: 100% !important; height: 100vh !important; border-radius: 0 !important; }
          }
        </style>
      </head>
      <body>
        <div class="chatbot-container">
          <div class="chatbot-header">
            <span>Chatbot</span>
            <div>
              <button class="chatbot-reset">↻</button>
              <button class="chatbot-toggle">↓</button>
            </div>
          </div>
          <div class="chatbot-messages">
            <div style="text-align: center; color: ${customTheme.text}; opacity: 0.6;">Loading...</div>
          </div>
          <div class="chatbot-input">
            <input type="text" placeholder="Type a message..." />
            <button>Send</button>
          </div>
        </div>
        <script>
          (function () {
            try {
              const flow = ${JSON.stringify(flow)};
              console.log("Iframe flow data:", flow);
              const appliedTheme = ${JSON.stringify(customTheme)};
              let conversation = [];
              let currentPath = [];
              let selectedOptions = {};
              let formData = {};
              let inputValues = {};
              let aiResponses = {};
              let isMinimized = false;

              const container = document.querySelector(".chatbot-container");
              const messagesDiv = document.querySelector(".chatbot-messages");
              const toggleButton = document.querySelector(".chatbot-toggle");
              const resetButton = document.querySelector(".chatbot-reset");
              const input = document.querySelector(".chatbot-input input");
              const sendButton = document.querySelector(".chatbot-input button");

              conversation.push({
                type: "system",
                content: "Chatbot initialized",
                timestamp: new Date().toLocaleTimeString(),
              });
              renderMessages();

              toggleButton.addEventListener("click", function() {
                isMinimized = !isMinimized;
                container.style.height = isMinimized ? "48px" : "480px";
                messagesDiv.style.display = isMinimized ? "none" : "block";
                document.querySelector(".chatbot-input").style.display = isMinimized ? "none" : "flex";
                toggleButton.textContent = isMinimized ? "↑" : "↓";
              });

              resetButton.addEventListener("click", resetConversation);

              const submitMessage = function() {
                const message = input.value.trim();
                if (message) {
                  addUserMessage(message);
                  input.value = "";
                }
              };
              sendButton.addEventListener("click", submitMessage);
              input.addEventListener("keypress", function(e) {
                if (e.key === "Enter") submitMessage();
              });

              function resetConversation() {
                console.log("Resetting iframe conversation");
                conversation = [];
                currentPath = [];
                selectedOptions = {};
                formData = {};
                inputValues = {};
                aiResponses = {};
                renderMessages();
                startConversation();
              }

              function startConversation() {
                console.log("Starting conversation with flow:", flow);
                if (!flow || !flow.nodes || !flow.edges) {
                  console.error("Invalid flow data: nodes or edges missing", flow);
                  addSystemMessage("Error: Invalid flow data.");
                  return;
                }
                console.log("Nodes:", flow.nodes);
                console.log("Edges:", flow.edges);
                const startingNodes = flow.nodes.filter(function(node) {
                  const isTarget = flow.edges.some(function(edge) {
                    return edge.target === node.id;
                  });
                  console.log("Checking node " + node.id + " as starting node. Is target? " + isTarget);
                  return !isTarget;
                });
                console.log("Iframe starting nodes:", startingNodes);
                if (startingNodes.length > 0) {
                  console.log("Processing starting node:", startingNodes[0]);
                  processNode(startingNodes[0]);
                } else {
                  console.warn("No starting nodes found in flow");
                  addSystemMessage("Error: No starting node found.");
                }
              }

              function processNode(node, userResponse) {
                if (!node) {
                  console.warn("Iframe node is undefined");
                  addSystemMessage("Error: Node is undefined.");
                  return;
                }
                console.log("Iframe processing node:", node);
                currentPath = [...currentPath, node.id];

                if (node.type !== "webhook") {
                  addBotMessage(node);
                }

                switch (node.type) {
                  case "custom":
                  case "form":
                  case "singleInput":
                  case "aiinput":
                    break;
                  case "condition":
                    processCondition(node);
                    break;
                  case "webhook":
                    processWebhook(node);
                    break;
                  default:
                    proceedToNextNode(node.id, userResponse);
                }
              }

              function addBotMessage(node) {
                console.log("Adding bot message for node:", node);
                console.log("Node data:", node.data);
                const nodeData = node.data || { label: "Default message" };
                const label = typeof nodeData.label === "string" && nodeData.label.trim() !== ""
                  ? nodeData.label
                  : getDefaultMessage(node.type);
                let message = {
                  type: "bot",
                  content: label,
                  nodeType: node.type,
                  nodeId: node.id,
                  timestamp: new Date().toLocaleTimeString(),
                };

                if (node.type === "custom" && nodeData.options) {
                  message.options = nodeData.options;
                }

                if (node.type === "form" && nodeData.fields) {
                  message.fields = nodeData.fields.map(function(field) {
                    return {
                      ...field,
                      options: field.type === "select" ? field.options || [] : undefined,
                    };
                  });
                }

                if (node.type === "singleInput" || node.type === "aiinput") {
                  message.inputConfig = {
                    placeholder: nodeData.placeholder || "Type your answer...",
                    buttonText: node.type === "aiinput" ? "Ask AI" : "Send",
                  };
                }

                conversation = [...conversation, message];
                console.log("Iframe added bot message:", message);
                renderMessages();
              }

              function addUserMessage(content) {
                const message = {
                  type: "user",
                  content: content,
                  timestamp: new Date().toLocaleTimeString(),
                };
                conversation = [...conversation, message];
                console.log("Iframe added user message:", message);
                renderMessages();
              }

              function addSystemMessage(content) {
                const message = {
                  type: "system",
                  content: content,
                  timestamp: new Date().toLocaleTimeString(),
                };
                conversation = [...conversation, message];
                console.log("Iframe added system message:", message);
                renderMessages();
              }

              function addAiMessage(content, nodeId) {
                const message = {
                  type: "ai",
                  content: content,
                  nodeId: nodeId,
                  timestamp: new Date().toLocaleTimeString(),
                };
                conversation = [...conversation, message];
                console.log("Iframe added AI message:", message);
                renderMessages();
              }

              function handleOptionSelect(nodeId, option, optionIndex) {
                selectedOptions = { ...selectedOptions, [nodeId]: option };
                addUserMessage(option);
                const edge = flow.edges.find(
                  function(e) { return e.source === nodeId && e.sourceHandle === 'option-' + optionIndex; }
                );
                console.log("Iframe option selected:", { nodeId, option, optionIndex, edge });
                if (edge) {
                  const nextNode = flow.nodes.find(function(n) { return n.id === edge.target; });
                  setTimeout(function() { processNode(nextNode, option); }, 500);
                }
              }

              function handleFormSubmit(nodeId, data) {
                formData = { ...formData, [nodeId]: data };
                addUserMessage("Form submitted");
                console.log("Iframe form submitted:", { nodeId, data });
                proceedToNextNode(nodeId, data);
              }

              function handleSingleInputSubmit(nodeId, value) {
                if (!value.trim()) return;
                inputValues = { ...inputValues, [nodeId]: value };
                addUserMessage(value);
                console.log("Iframe single input submitted:", { nodeId, value });
                proceedToNextNode(nodeId, value);
              }

              function handleAiSubmit(nodeId, value) {
                if (!value.trim()) return;
                addUserMessage(value);
                inputValues = { ...inputValues, [nodeId]: value };
                const aiNode = flow.nodes.find(function(n) { return n.id === nodeId; });
                if (!aiNode) return;

                try {
                  const aiResponse = "Simulated AI response to: " + value;
                  aiResponses = { ...aiResponses, [nodeId]: aiResponse };
                  addAiMessage(aiResponse, nodeId);
                  console.log("Iframe AI response:", { nodeId, aiResponse });
                  proceedToNextNode(nodeId, { input: value, response: aiResponse });
                } catch (error) {
                  addSystemMessage("AI error: " + error.message);
                }
              }

              function proceedToNextNode(nodeId, data) {
                const edge = flow.edges.find(function(e) { return e.source === nodeId; });
                console.log("Iframe proceeding to next node:", { nodeId, edge });
                if (edge) {
                  const nextNode = flow.nodes.find(function(n) { return n.id === edge.target; });
                  setTimeout(function() { processNode(nextNode, data); }, 500);
                }
              }

              function processCondition(node) {
                const randomChoice = Math.random() > 0.5 ? "yes" : "no";
                const edge = flow.edges.find(
                  function(e) { return e.source === node.id && e.sourceHandle === randomChoice; }
                );
                addSystemMessage("Condition evaluated to: " + randomChoice.toUpperCase());
                if (edge) {
                  const nextNode = flow.nodes.find(function(n) { return n.id === edge.target; });
                  setTimeout(function() { processNode(nextNode); }, 500);
                }
              }

              function processWebhook(node) {
                addSystemMessage("Calling webhook: " + (node.data?.method || "POST") + " " + (node.data?.url || "unknown"));
                proceedToNextNode(node.id);
              }

              function getDefaultMessage(nodeType) {
                const messages = {
                  text: "Hello!",
                  condition: "Checking condition...",
                  webhook: "Making API call...",
                  form: "Please fill out this form:",
                  singleInput: "Please answer:",
                  aiinput: "Ask away:",
                  default: "Message",
                };
                return messages[nodeType] || messages.default;
              }

              function renderMessages() {
                if (!messagesDiv) {
                  console.error("Iframe messages div not found");
                  return;
                }
                console.log("Rendering messages. Conversation length:", conversation.length);
                console.log("Messages to render:", conversation);
                try {
                  messagesDiv.innerHTML = conversation.length === 0
                    ? '<div style="text-align: center; color: ${customTheme.text}; opacity: 0.6;">Start chatting...</div>'
                    : conversation
                        .map(function(msg) {
                          const sender = msg.type === "bot" ? "Bot" : msg.type === "ai" ? "AI" : msg.type === "user" ? "You" : "System";
                          const messageClass = msg.type === "bot" ? "bot-message" : msg.type === "ai" ? "ai-message" : msg.type === "user" ? "user-message" : "system-message";
                          const align = msg.type === "user" ? "flex-end" : "flex-start";
                          let content = '<div class="message ' + messageClass + '">' + (msg.content || "No content") + '</div>';

                          if (msg.options && msg.type === "bot") {
                            content += '<div style="margin-top: 8px;">' + msg.options
                              .map(function(opt, i) {
                                return (
                                  '<button class="option-button" data-nodeid="' + msg.nodeId + '" data-option="' + opt + '" data-index="' + i + '">' +
                                  opt +
                                  '</button>'
                                );
                              })
                              .join("") + '</div>';
                          }

                          if (msg.fields && msg.type === "bot") {
                            content += '<div style="margin-top: 8px;"><form data-nodeid="' + msg.nodeId + '">' +
                              msg.fields
                                .map(function(field) {
                                  return (
                                    '<div class="form-field"><label>' + field.label + '</label>' +
                                    (field.type === "select"
                                      ? '<select name="' + field.key + '" ' + (field.required ? "required" : "") + '>' +
                                        field.options?.map(function(opt) { return '<option value="' + opt + '">' + opt + '</option>'; }).join("") +
                                        '</select>'
                                      : '<input type="' + (field.type || "text") + '" name="' + field.key + '" placeholder="' + field.label + '" ' + (field.required ? "required" : "") + ' />') +
                                    '</div>'
                                  );
                                })
                                .join("") +
                              '<button type="submit">Submit</button></form></div>';
                          }

                          if (msg.inputConfig && msg.type === "bot") {
                            content += '<form class="input-form" data-nodeid="' + msg.nodeId + '">' +
                              '<input type="text" placeholder="' + msg.inputConfig.placeholder + '" />' +
                              '<button type="submit">' + msg.inputConfig.buttonText + '</button></form>';
                          }

                          if (msg.type === "ai" && aiResponses[msg.nodeId]) {
                            content += '<div style="margin-top: 8px; padding: 8px; background: #fafafa; border-radius: 6px;">' +
                              '<div style="font-size: 12px; color: ${customTheme.text}; opacity: 0.6;">AI Response:</div>' +
                              '<div>' + aiResponses[msg.nodeId] + '</div></div>';
                          }

                          return (
                            '<div style="display: flex; flex-direction: column; align-items: ' + align + '; margin-bottom: 12px;">' +
                            '<div style="font-size: 12px; color: #6b7280;">' + sender + '</div>' +
                            content +
                            '</div>'
                          );
                        })
                        .join("");

                  messagesDiv.querySelectorAll(".option-button").forEach(function(button) {
                    button.addEventListener("click", function() {
                      const nodeId = button.dataset.nodeid;
                      const option = button.dataset.option;
                      const index = button.dataset.index;
                      handleOptionSelect(nodeId, option, index);
                    });
                  });

                  messagesDiv.querySelectorAll("form[data-nodeid]").forEach(function(form) {
                    form.addEventListener("submit", function(e) {
                      e.preventDefault();
                      const nodeId = form.dataset.nodeid;
                      const node = flow.nodes.find(function(n) { return n.id === nodeId; });
                      if (node.type === "form") {
                        const inputs = form.querySelectorAll("input, select");
                        const data = {};
                        let isValid = true;
                        inputs.forEach(function(input) {
                          if (input.required && !input.value.trim()) {
                            isValid = false;
                            input.style.borderColor = appliedTheme.danger;
                          } else {
                            data[input.name] = input.value;
                            input.style.borderColor = "";
                          }
                        });
                        if (isValid) {
                          handleFormSubmit(nodeId, data);
                        } else {
                          addSystemMessage("Please fill all required fields.");
                        }
                      } else if (node.type === "singleInput" || node.type === "aiinput") {
                        const input = form.querySelector("input");
                        const value = input.value.trim();
                        if (value) {
                          if (node.type === "singleInput") {
                            handleSingleInputSubmit(nodeId, value);
                          } else {
                            handleAiSubmit(nodeId, value);
                          }
                          input.value = "";
                        }
                      }
                    });
                  });

                  messagesDiv.scrollTop = messagesDiv.scrollHeight;
                  console.log("Iframe messages rendered:", conversation);
                } catch (renderError) {
                  console.error("Error rendering messages:", renderError);
                  messagesDiv.innerHTML = '<div style="text-align: center; color: red;">Error rendering messages: ' + renderError.message + '</div>';
                }
              }

              resetConversation();
            } catch (error) {
              console.error("Iframe script error:", error);
              messagesDiv.innerHTML = '<div style="text-align: center; color: red;">Iframe script error: ' + error.message + '</div>';
            }
          })();
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("Iframe error:", error);
    res.status(500).send('<p>Error loading chatbot: ' + error.message + '</p>');
  }
});

module.exports = router;