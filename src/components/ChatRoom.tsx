import React, { useRef, useEffect, useState } from 'react';
import { useMatrixSync } from '../hooks/useMatrixSync';
import { matrixService } from '../services/matrixService';
import { LogOut } from 'lucide-react';
import hjFullLogo from '../assets/hj_full_logo.png';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';

interface ChatRoomProps {
  roomId: string;
}

export function ChatRoom({ roomId }: ChatRoomProps) {
  const { messages, isLoading, error: syncError } = useMatrixSync(roomId);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isVoiceMessageSending, setIsVoiceMessageSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (message: string) => {
    setSendError(null);
    try {
      await matrixService.sendMessage(roomId, message);
      scrollToBottom();
    } catch (error) {
      setSendError('Failed to send message. Please try again.');
      console.error('Failed to send message:', error);
    }
  };

  const handleVoiceMessage = async (blob: Blob) => {
    setIsVoiceMessageSending(true);
    setSendError(null);

    try {
      const client = matrixService.getClient();
      if (!client) throw new Error('Client not initialized');

      const response = await client.uploadContent(blob, {
        type: 'audio/webm;codecs=opus',
        name: `voice-${Date.now()}.webm`
      });

      await client.sendMessage(roomId, {
        msgtype: 'm.audio',
        body: 'Voice message',
        url: response.content_uri,
        info: {
          mimetype: 'audio/webm;codecs=opus',
          size: blob.size
        }
      });

      scrollToBottom();
    } catch (error) {
      console.error('Failed to send voice message:', error);
      setSendError('无法发送语音消息，请重试。');
    } finally {
      setIsVoiceMessageSending(false);
    }
  };

  const handleLogout = () => {
    matrixService.disconnect();
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#F5F5F5] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
        <div className="flex items-center flex-1 justify-center">
          <img 
            src={hjFullLogo} 
            alt="Logo" 
            className="h-8 w-auto object-contain"
          />
        </div>
        <button
          onClick={handleLogout}
          className="absolute right-2 flex items-center text-gray-600 hover:text-gray-800 p-2"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-2 space-y-2"
      >
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            content={message.content}
            sender={message.sender}
            timestamp={message.timestamp}
            isCurrentUser={message.sender === matrixService.getUserId()}
            avatar={message.avatar}
            displayName={message.displayName}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {(syncError || sendError) && (
        <div className="px-3 py-2 bg-red-50 border-t border-red-200">
          <p className="text-xs text-red-600">{syncError || sendError}</p>
        </div>
      )}

      <ChatInput
        onSendMessage={handleSendMessage}
        onSendVoiceMessage={handleVoiceMessage}
        isVoiceMessageSending={isVoiceMessageSending}
      />
    </div>
  );
}