// backend/public/widget.js
(function () {
    window.FlowBuilderChatbot = {
      init: function (config) {
        console.log("Initializing FlowBuilderChatbot:", config);
        const { containerId, flowId, userId, apiUrl, theme = {}, apiKey } = config;
        const container = document.getElementById(containerId);
  
        if (!container) {
          console.error("Container not found:", containerId);
          return;
        }
  
        // Default theme (matches FlowBuilder's light theme)
        const defaultTheme = {
          primary: "#3b82f6",
          secondary: "#f59e0b",
          success: "#10b981",
          danger: "#ef4444",
          background: "#f9fafb",
          sidebar: "#ffffff",
          text: "#111827",
          border: "#e5e7eb",
          font: "'Inter', sans-serif"
        };
  
        const appliedTheme = { ...defaultTheme, ...theme };
  
        // State
        let conversation = [];
        let currentPath = [];
        let selectedOptions = {};
        let formData = {};
        let inputValues = {};
        let aiResponses = {};
        let isMinimized = true;
  
        // Apply container styles
        Object.assign(container.style, {
          width: "360px",
          height: isMinimized ? "48px" : "480px",
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: "1000",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          background: appliedTheme.background,
          fontFamily: appliedTheme.font,
          transition: "height 0.3s ease",
        });
  
        // Render UI
        renderChatbot();
  
        // Fetch flow
        fetch(`${apiUrl}/flows/${userId}/${flowId}`, {
          headers: { "x-api-key": apiKey || "" },
        })
          .then((response) => {
            if (!response.ok) throw new Error(`Fetch error: ${response.status} ${response.statusText}`);
            return response.json();
          })
          .then((flow) => {
            console.log("Flow data loaded:", flow);
            window.FlowBuilderChatbot.flow = flow;
            resetConversation();
          })
          .catch((error) => {
            console.error("Fetch error:", error);
            container.querySelector(".chatbot-messages").innerHTML = `
              <div style="text-align: center; padding: 16px; color: ${appliedTheme.text};">
                Error: Failed to load flow. Check flowId, userId, or apiKey.
              </div>
            `;
          });
  
        function renderChatbot() {
          console.log("Rendering chatbot UI");
          container.innerHTML = `
            <style>
              .chatbot-container { height: 100%; display: flex; flex-direction: column; }
              .chatbot-header { background: ${appliedTheme.primary}; color: white; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
              .chatbot-toggle { background: none; border: none; color: white; cursor: pointer; font-size: 16px; }
              .chatbot-messages { flex: 1; overflow-y: auto; padding: 16px; background: ${appliedTheme.background}; display: ${isMinimized ? "none" : "block"}; }
              .chatbot-input { padding: 12px 16px; border-top: 1px solid ${appliedTheme.border}; display: ${isMinimized ? "none" : "flex"}; gap: 8px; }
              .chatbot-input input { flex: 1; padding: 8px; border: 1px solid ${appliedTheme.border}; border-radius: 20px; outline: none; }
              .chatbot-input button { background: ${appliedTheme.primary}; color: white; padding: 8px 16px; border-radius: 20px; border: none; cursor: pointer; }
              .chatbot-input button:hover { background: ${appliedTheme.secondary}; }
              .message { margin: 8px 0; padding: 8px 12px; border-radius: 12px; max-width: 80%; }
              .bot-message { background: #f3f4f6; color: ${appliedTheme.text}; border-radius: 12px 12px 12px 0; }
              .ai-message { background: #f3e8ff; color: ${appliedTheme.text}; border-radius: 12px 12px 12px 0; }
              .user-message { background: ${appliedTheme.primary}; color: white; border-radius: 12px 12px 0 12px; align-self: flex-end; }
              .system-message { background: ${appliedTheme.border}; color: ${appliedTheme.text}; text-align: center; }
              .option-button { display: block; width: 100%; padding: 8px; margin: 4px 0; border: 1px solid ${appliedTheme.border}; border-radius: 6px; cursor: pointer; background: #fff; }
              .option-button:hover { background: #f3f4f6; }
              .form-field { margin-bottom: 12px; }
              .form-field label { display: block; margin-bottom: 4px; }
              .form-field input, .form-field select { width: 100%; padding: 8px; border: 1px solid ${appliedTheme.border}; border-radius: 6px; }
              .input-form { display: flex; gap: 8px; margin-top: 8px; }
              .input-form input { flex: 1; padding: 8px; border: 1px solid ${appliedTheme.border}; border-radius: 6px 0 0 6px; }
              .input-form button { background: ${appliedTheme.primary}; color: white; padding: 8px 16px; border-radius: 0 6px 6px 0; border: none; cursor: pointer; }
              .input-form button:hover { background: ${appliedTheme.secondary}; }
              @media (max-width: 480px) {
                .chatbot-container { width: 100% !important; height: 100vh !important; border-radius: 0 !important; position: static !important; }
              }
            </style>
            <div class="chatbot-container">
              <div class="chatbot-header">
                <span>Chatbot</span>
                <div>
                  <button class="chatbot-reset" style="background: none; border: none; color: white; cursor: pointer; margin-right: 8px;">↻</button>
                  <button class="chatbot-toggle">${isMinimized ? "↑" : "↓"}</button>
                </div>
              </div>
              <div class="chatbot-messages">
                <div style="text-align: center; color: ${appliedTheme.text}; opacity: 0.6;">Loading...</div>
              </div>
              <div class="chatbot-input">
                <input type="text" placeholder="Type a message..." />
                <button>Send</button>
              </div>
            </div>
          `;
  
          // Toggle minimize/maximize
          container.querySelector(".chatbot-toggle").addEventListener("click", () => {
            isMinimized = !isMinimized;
            container.style.height = isMinimized ? "48px" : "480px";
            container.querySelector(".chatbot-messages").style.display = isMinimized ? "none" : "block";
            container.querySelector(".chatbot-input").style.display = isMinimized ? "none" : "flex";
            container.querySelector(".chatbot-toggle").textContent = isMinimized ? "↑" : "↓";
          });
  
          // Reset conversation
          container.querySelector(".chatbot-reset").addEventListener("click", resetConversation);
  
          // Default input handler (hidden unless needed)
          const input = container.querySelector(".chatbot-input input");
          const sendButton = container.querySelector(".chatbot-input button");
          const submitMessage = () => {
            const message = input.value.trim();
            if (message) {
              addUserMessage(message);
              input.value = "";
            }
          };
          sendButton.addEventListener("click", submitMessage);
          input.addEventListener("keypress", (e) => {
            if (e.key === "Enter") submitMessage();
          });
        }
  
        function resetConversation() {
          console.log("Resetting conversation");
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
          const flow = window.FlowBuilderChatbot.flow;
          if (!flow?.nodes || !flow?.edges) {
            console.error("Invalid flow data:", flow);
            addSystemMessage("Error: Invalid flow data.");
            return;
          }
          const startingNodes = flow.nodes.filter(
            (node) => !flow.edges.some((edge) => edge.target === node.id)
          );
          console.log("Starting nodes:", startingNodes);
          if (startingNodes.length > 0) {
            processNode(startingNodes[0]);
          } else {
            console.warn("No starting nodes found");
            addSystemMessage("Error: No starting node found.");
          }
        }
  
        function processNode(node, userResponse = null) {
          if (!node) {
            console.warn("Node is undefined");
            return;
          }
          console.log("Processing node:", node);
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
          let message = {
            type: "bot",
            content: node.data?.label || getDefaultMessage(node.type),
            nodeType: node.type,
            nodeId: node.id,
            timestamp: new Date().toLocaleTimeString(),
          };
  
          if (node.type === "custom" && node.data?.options) {
            message.options = node.data.options;
          }
  
          if (node.type === "form" && node.data?.fields) {
            message.fields = node.data.fields.map((field) => ({
              ...field,
              options: field.type === "select" ? field.options || [] : undefined,
            }));
          }
  
          if (node.type === "singleInput" || node.type === "aiinput") {
            message.inputConfig = {
              placeholder: node.data?.placeholder || "Type your answer...",
              buttonText: node.type === "aiinput" ? "Ask AI" : "Send",
            };
          }
  
          conversation = [...conversation, message];
          console.log("Added bot message:", message);
          renderMessages();
        }
  
        function addUserMessage(content) {
          const message = {
            type: "user",
            content,
            timestamp: new Date().toLocaleTimeString(),
          };
          conversation = [...conversation, message];
          console.log("Added user message:", message);
          renderMessages();
        }
  
        function addSystemMessage(content) {
          const message = {
            type: "system",
            content,
            timestamp: new Date().toLocaleTimeString(),
          };
          conversation = [...conversation, message];
          console.log("Added system message:", message);
          renderMessages();
        }
  
        function addAiMessage(content, nodeId) {
          const message = {
            type: "ai",
            content,
            nodeId,
            timestamp: new Date().toLocaleTimeString(),
          };
          conversation = [...conversation, message];
          console.log("Added AI message:", message);
          renderMessages();
        }
  
        function handleOptionSelect(nodeId, option, optionIndex) {
          selectedOptions = { ...selectedOptions, [nodeId]: option };
          addUserMessage(option);
          const edge = window.FlowBuilderChatbot.flow.edges.find(
            (e) => e.source === nodeId && e.sourceHandle === `option-${optionIndex}`
          );
          console.log("Option selected:", { nodeId, option, optionIndex, edge });
          if (edge) {
            const nextNode = window.FlowBuilderChatbot.flow.nodes.find((n) => n.id === edge.target);
            setTimeout(() => processNode(nextNode, option), 500);
          } else {
            console.warn("No edge found for option:", { nodeId, optionIndex });
          }
        }
  
        function handleFormSubmit(nodeId, data) {
          formData = { ...formData, [nodeId]: data };
          addUserMessage("Form submitted");
          console.log("Form submitted:", { nodeId, data });
          proceedToNextNode(nodeId, data);
        }
  
        function handleSingleInputSubmit(nodeId, value) {
          if (!value.trim()) return;
          inputValues = { ...inputValues, [nodeId]: value };
          addUserMessage(value);
          console.log("Single input submitted:", { nodeId, value });
          proceedToNextNode(nodeId, value);
        }
  
        function handleAiSubmit(nodeId, value) {
          if (!value.trim()) return;
          addUserMessage(value);
          inputValues = { ...inputValues, [nodeId]: value };
          const aiNode = window.FlowBuilderChatbot.flow.nodes.find((n) => n.id === nodeId);
          if (!aiNode) return;
  
          try {
            const aiResponse = `Simulated AI response to: "${value}"`;
            aiResponses = { ...aiResponses, [nodeId]: aiResponse };
            addAiMessage(aiResponse, nodeId);
            console.log("AI response:", { nodeId, aiResponse });
            proceedToNextNode(nodeId, { input: value, response: aiResponse });
          } catch (error) {
            addSystemMessage(`AI error: ${error.message}`);
          }
        }
  
        function proceedToNextNode(nodeId, data) {
          const edge = window.FlowBuilderChatbot.flow.edges.find((e) => e.source === nodeId);
          console.log("Proceeding to next node:", { nodeId, edge });
          if (edge) {
            const nextNode = window.FlowBuilderChatbot.flow.nodes.find((n) => n.id === edge.target);
            setTimeout(() => processNode(nextNode, data), 500);
          } else {
            console.warn("No outgoing edge for node:", nodeId);
          }
        }
  
        function processCondition(node) {
          const randomChoice = Math.random() > 0.5 ? "yes" : "no";
          const edge = window.FlowBuilderChatbot.flow.edges.find(
            (e) => e.source === node.id && e.sourceHandle === randomChoice
          );
          addSystemMessage(`Condition evaluated to: ${randomChoice.toUpperCase()}`);
          if (edge) {
            const nextNode = window.FlowBuilderChatbot.flow.nodes.find((n) => n.id === edge.target);
            setTimeout(() => processNode(nextNode), 500);
          }
        }
  
        function processWebhook(node) {
          addSystemMessage(`Calling webhook: ${node.data?.method || "POST"} ${node.data?.url || "unknown"}`);
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
          const messagesDiv = container.querySelector(".chatbot-messages");
          if (!messagesDiv) {
            console.error("Messages div not found");
            return;
          }
          messagesDiv.innerHTML = conversation.length === 0
            ? `<div style="text-align: center; color: ${appliedTheme.text}; opacity: 0.6;">Start chatting...</div>`
            : conversation
                .map((msg) => {
                  const sender = msg.type === "bot" ? "Bot" : msg.type === "ai" ? "AI" : msg.type === "user" ? "You" : "System";
                  const messageClass = msg.type === "bot" ? "bot-message" : msg.type === "ai" ? "ai-message" : msg.type === "user" ? "user-message" : "system-message";
                  const align = msg.type === "user" ? "flex-end" : "flex-start";
                  let content = `<div class="message ${messageClass}">${msg.content}</div>`;
  
                  if (msg.options && msg.type === "bot") {
                    content += `<div style="margin-top: 8px;">${msg.options
                      .map(
                        (opt, i) => `
                          <button class="option-button" data-nodeid="${msg.nodeId}" data-option="${opt}" data-index="${i}">
                            ${opt}
                          </button>`
                      )
                      .join("")}</div>`;
                  }
  
                  if (msg.fields && msg.type === "bot") {
                    content += `
                      <div style="margin-top: 8px;">
                        <form data-nodeid="${msg.nodeId}">
                          ${msg.fields
                            .map(
                              (field) => `
                                <div class="form-field">
                                  <label>${field.label}</label>
                                  ${field.type === "select" ? `
                                    <select name="${field.key}" ${field.required ? "required" : ""}>
                                      ${field.options?.map((opt) => `<option value="${opt}">${opt}</option>`).join("")}
                                    </select>
                                  ` : `
                                    <input type="${field.type || "text"}" name="${field.key}" placeholder="${field.label}" ${field.required ? "required" : ""} />
                                  `}
                                </div>`
                            )
                            .join("")}
                          <button type="submit" style="background: ${appliedTheme.primary}; color: white; padding: 8px; border-radius: 6px; width: 100%;">Submit</button>
                        </form>
                      </div>`;
                  }
  
                  if (msg.inputConfig && msg.type === "bot") {
                    content += `
                      <form class="input-form" data-nodeid="${msg.nodeId}">
                        <input type="text" placeholder="${msg.inputConfig.placeholder}" />
                        <button type="submit">${msg.inputConfig.buttonText}</button>
                      </form>`;
                  }
  
                  if (msg.type === "ai" && aiResponses[msg.nodeId]) {
                    content += `
                      <div style="margin-top: 8px; padding: 8px; background: #fafafa; border-radius: 6px;">
                        <div style="font-size: 12px; color: ${appliedTheme.text}; opacity: 0.6;">AI Response:</div>
                        <div>${aiResponses[msg.nodeId]}</div>
                      </div>`;
                  }
  
                  return `
                    <div style="display: flex; flex-direction: column; align-items: ${align}; margin-bottom: 12px;">
                      <div style="font-size: 12px; color: #6b7280;">${sender}</div>
                      ${content}
                    </div>`;
                })
                .join("");
  
          // Attach event listeners
          messagesDiv.querySelectorAll(".option-button").forEach((button) => {
            button.addEventListener("click", () => {
              const nodeId = button.dataset.nodeid;
              const option = button.dataset.option;
              const index = button.dataset.index;
              handleOptionSelect(nodeId, option, index);
            });
          });
  
          messagesDiv.querySelectorAll("form[data-nodeid]").forEach((form) => {
            form.addEventListener("submit", (e) => {
              e.preventDefault();
              const nodeId = form.dataset.nodeid;
              const node = window.FlowBuilderChatbot.flow.nodes.find((n) => n.id === nodeId);
              if (node.type === "form") {
                const inputs = form.querySelectorAll("input, select");
                const data = {};
                let isValid = true;
                inputs.forEach((input) => {
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
          console.log("Messages rendered:", conversation);
        }
      },
    };
  })();