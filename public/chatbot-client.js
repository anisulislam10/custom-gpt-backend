// public/chatbot-client.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import ChatbotPreview from '../../custom-gpt-builder-frontends/app/components/ChatbotPreview'; // Reuse your preview component

const container = document.getElementById('chatbot-container');
const root = createRoot(container);
root.render(<ChatbotPreview nodes={window.flowData.nodes} edges={window.flowData.edges} />);