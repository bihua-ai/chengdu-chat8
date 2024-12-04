import React, { useState, useRef } from 'react';
import { Send } from 'lucide-react';
import { VoiceRecorder } from './VoiceRecorder';

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  onSendVoiceMessage: (blob: Blob) => Promise<void>;
  isVoiceMessageSending: boolean;
}

export function ChatInput({ onSendMessage, onSendVoiceMessage, isVoiceMessageSending }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [textareaHeight, setTextareaHeight] = useState(100);
  const resizeRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const lastYRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    isResizingRef.current = true;
    lastYRef.current = e.clientY;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizingRef.current) return;
    const delta = lastYRef.current - e.clientY;
    setTextareaHeight((prev) => Math.min(Math.max(prev + delta, 100), 400));
    lastYRef.current = e.clientY;
  };

  const handleMouseUp = () => {
    isResizingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    await onSendMessage(message);
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="bg-white">
      <div
        ref={resizeRef}
        className="h-[1px] bg-gray-100 cursor-ns-resize hover:bg-gray-200 transition-colors"
        onMouseDown={handleMouseDown}
      />
      <form onSubmit={handleSubmit} className="p-2">
        <div className="flex flex-col space-y-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ height: `${textareaHeight}px` }}
            className="w-full resize-none outline-none focus:outline-none p-2 bg-white text-sm transition-all duration-200"
            placeholder="输入消息... (Ctrl + Enter 发送)"
          />
          <div className="flex items-center justify-between">
            <VoiceRecorder
              onRecordingComplete={onSendVoiceMessage}
              disabled={isVoiceMessageSending}
            />
            <button
              type="submit"
              className="inline-flex items-center px-2 py-2 border border-gray-200 rounded-md shadow-sm text-sm font-medium bg-[#E9E9E9] hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Send className="w-4 h-4 text-green-600" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}