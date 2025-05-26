window.Chatbot = {
    init(config) {
      const { flowId, userId, flowData, theme, apiConfig } = config;
      const data = JSON.parse(decodeURIComponent(flowData));
  
      // Render chatbot UI
      const container = document.getElementById('chatbot-container');
      container.style.backgroundColor = theme.backgroundColor;
      container.style.color = theme.textColor;
      container.style.borderRadius = theme.borderRadius;
      container.style.fontFamily = theme.fontFamily;
      // Implement chatbot logic using data.nodes and data.edges
      console.log('Chatbot initialized with:', { flowId, userId, data, theme, apiConfig });
    },
  };