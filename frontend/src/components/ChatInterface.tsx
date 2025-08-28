import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  citations?: Array<{
    page: number;
    text: string;
  }>;
  timestamp: Date;
}

interface ChatInterfaceProps {
  onCitationClick: (page: number) => void;
  pdfFile?: File | null;
  sessionId?: string | null;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onCitationClick,
  pdfFile,
  sessionId
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (pdfFile && messages.length === 0) {
      setMessages([{
        id: '1',
        type: 'assistant',
        content: `Hello! I've loaded your PDF "${pdfFile.name}". You can now ask me questions about its contents, and I'll provide answers with specific page references.`,
        timestamp: new Date(),
      }]);
    }
  }, [pdfFile, messages.length]);

  const callChatAPI = async (message: string): Promise<ChatMessage> => {
    if (!sessionId) {
      throw new Error('No session ID available');
    }

    const chatApiUrl = import.meta.env.VITE_API_CHAT_URL;

    try {
      const response = await fetch(chatApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: message,
        }),
      });

      if (!response.ok) {
        throw new Error('Chat API request failed');
      }

      const data = await response.json();

      // Parse citations from response if they exist
      const citations = data.citations || [];

      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: data.message || data.response || 'I received your question, but there was an issue with the response.',
        citations: citations,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error while processing your question. Please try again.',
        timestamp: new Date(),
      };
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !pdfFile || !sessionId) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageContent = inputValue.trim();
    setInputValue('');
    setIsTyping(true);

    try {
      const aiResponse = await callChatAPI(messageContent);
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="h-full flex flex-col bg-gradient-surface shadow-medium">
      {/* Header */}
      <div className="p-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">PDF Assistant</h3>
            <p className="text-sm text-muted-foreground">
              {pdfFile ? 'Ask questions about your document' : 'Upload a PDF to start chatting'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message-enter flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
            >
              <div className={`
                p-2 rounded-full flex-shrink-0
                ${message.type === 'user'
                  ? 'bg-chat-user text-chat-user-foreground'
                  : 'bg-chat-assistant text-chat-assistant-foreground'
                }
              `}>
                {message.type === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>

              <div className={`
                max-w-[80%] rounded-lg p-3 shadow-soft
                ${message.type === 'user'
                  ? 'bg-chat-user text-chat-user-foreground ml-auto'
                  : 'bg-chat-assistant text-chat-assistant-foreground'
                }
              `}>
                <p className="text-sm leading-relaxed">{message.content}</p>

                {message.citations && message.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-current/10">
                    <p className="text-xs font-medium mb-2 opacity-75">Sources:</p>
                    <div className="flex flex-wrap gap-2">
                      {message.citations.map((citation, index) => (
                        <button
                          key={index}
                          onClick={() => onCitationClick(citation.page)}
                          className="citation-btn flex items-center gap-1"
                          title={citation.text}
                        >
                          <BookOpen className="h-3 w-3" />
                          Page {citation.page}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs opacity-60 mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 animate-fade-in">
              <div className="p-2 rounded-full bg-chat-assistant text-chat-assistant-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-chat-assistant text-chat-assistant-foreground rounded-lg p-3 shadow-soft">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-card/50 backdrop-blur-sm">
        <div className="flex gap-3">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={pdfFile && sessionId ? "Ask a question about your PDF..." : "Upload a PDF first"}
            disabled={!pdfFile || !sessionId || isTyping}
            className="flex-1 bg-background/50 backdrop-blur-sm"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || !pdfFile || !sessionId || isTyping}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};