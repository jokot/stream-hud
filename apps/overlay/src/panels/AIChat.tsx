import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIData, AIMessage, PanelProps } from '../core/types';
import { AIChatWSClient } from '../lib/ws';
import { formatTimestamp } from '../lib/format';

export function AIChat({ config }: PanelProps) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [source, setSource] = useState<'websocket' | 'polling'>('polling');
  const [wsClient, setWsClient] = useState<AIChatWSClient | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleData = useCallback((data: AIData) => {
    if (data.messages && Array.isArray(data.messages)) {
      setMessages(data.messages);
    }
    
    setIsTyping(data.isTyping || false);
    setLastUpdate(data.ts || Date.now() / 1000);
  }, []);

  const handleStatus = useCallback((status: string) => {
    setIsConnected(status === 'connected');
    // Map status to source type for display
    if (status === 'connected' && wsClient?.getConnection() === 'websocket') {
      setSource('websocket');
    } else if (status === 'connected' && wsClient?.getConnection() === 'polling') {
      setSource('polling');
    }
  }, [wsClient]);

  useEffect(() => {
    const client = new AIChatWSClient(handleData, handleStatus);
    setWsClient(client);
    client.start();

    return () => {
      client.destroy();
    };
  }, []); // Remove dependencies to prevent infinite loop

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'r') {
        wsClient?.forceReload();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [wsClient]);

  // Get display configuration
  const showTitle = config.title !== false;
  const compact = config.compact === true;
  const title = typeof config.title === 'string' ? config.title : 'AI Chat';
  const maxMessages = config.maxMessages || 10;

  const displayMessages = messages.slice(-maxMessages);

  return (
    <div className="p-4 w-fit max-w-md">
      <motion.div
        className="overlay-card p-4 space-y-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        {!compact && showTitle && (
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <div className="flex items-center space-x-2">
              <span className={`status-chip ${
                source === 'websocket' ? 'status-ws' : 'status-poll'
              }`}>
                {source === 'websocket' ? 'WS' : 'POLL'}
              </span>
            </div>
          </div>
        )}

        {/* Messages */}
        <div 
          ref={scrollContainerRef}
          className="max-h-96 overflow-y-auto space-y-3"
        >
          <AnimatePresence>
            {displayMessages.map((message, index) => (
              <motion.div
                key={`${message.id || index}-${message.timestamp}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : message.role === 'assistant'
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                      : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                  }`}
                >
                  {/* Message Content */}
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                  
                  {/* Timestamp */}
                  {message.timestamp && (
                    <div className={`text-xs mt-1 ${
                      message.role === 'user'
                        ? 'text-blue-100'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {formatTimestamp(message.timestamp)}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex justify-start"
            >
              <div className="bg-gray-200 dark:bg-gray-700 rounded-lg px-3 py-2">
                <div className="flex space-x-1">
                  <motion.div
                    className="w-2 h-2 bg-gray-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-gray-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-gray-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* No Messages State */}
        {displayMessages.length === 0 && !isTyping && (
          <div className="text-center py-8">
            <div className="text-gray-500 dark:text-gray-400 text-sm">
              {isConnected ? 'No messages yet...' : 'Connecting...'}
            </div>
          </div>
        )}

        {/* Connection Status */}
        {!compact && (
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-2">
            <span>
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </span>
            <span className={isConnected ? 'text-green-500' : 'text-red-500'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default AIChat;