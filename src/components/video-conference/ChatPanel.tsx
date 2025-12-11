import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface Message {
  sender: string;
  content: string;
}

interface ChatPanelProps {
  messages: { sender: string; content: string }[];
  messageInput: string;
  setMessageInput: (msg: string) => void;
  sendMessage: (msg: string) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, messageInput, setMessageInput, sendMessage }) => {
  const handleSend = () => {
    if (messageInput.trim()) {
      sendMessage(messageInput.trim());
      setMessageInput('');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 rounded-lg shadow-inner">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <div className="text-zinc-400 text-sm">No messages yet. Start the conversation!</div>
        )}
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`p-2 rounded-lg max-w-[80%] shadow-sm ${msg.sender === 'You' ? 'ml-auto bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'}`}
          >
            <div className="text-xs font-semibold mb-1">{msg.sender}</div>
            <div className="text-sm break-words">{msg.content}</div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t flex gap-2 bg-white">
        <input
          type="text"
          className="flex-1 border rounded px-2 py-1 focus:outline-none focus:ring focus:border-blue-300"
          value={messageInput}
          onChange={e => setMessageInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
        />
        <Button onClick={handleSend} disabled={!messageInput.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
};

export default ChatPanel;
