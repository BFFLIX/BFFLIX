import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { X, Send, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getRecommendations, type RecommendationItem } from '../../lib/agentApi';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { ImageWithFallback } from '../figma/ImageWithFallback';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendations?: RecommendationItem[];
};

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const serviceColors: Record<string, string> = {
  Netflix: 'bg-red-600',
  'Prime Video': 'bg-blue-500',
  'Disney+': 'bg-blue-400',
  Hulu: 'bg-green-500',
  'HBO Max': 'bg-purple-600',
  'Apple TV+': 'bg-gray-700',
};

export function AIAssistantDrawer({ isOpen, onClose }: AIAssistantDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content: "Hey! I'm your BFFlix AI assistant. I can help you discover amazing movies and shows. What are you in the mood for?",
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [conversationId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isThinking) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmedInput,
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsThinking(true);

    try {
      // Build conversation history
      const history = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Call AI API
      const response = await getRecommendations({
        query: trimmedInput,
        limit: 5,
        preferFeed: true,
        conversationId,
        history,
      });

      // Process results
      const recommendations: RecommendationItem[] = [];
      let assistantText = '';

      response.results.forEach(result => {
        if ('type' in result && result.type === 'conversation') {
          assistantText = result.message;
        } else {
          recommendations.push(result as RecommendationItem);
        }
      });

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantText || 'Here are some recommendations for you:',
        recommendations: recommendations.length > 0 ? recommendations : undefined,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      // Error fallback
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-full md:w-[500px] bg-gradient-to-b from-black/95 to-black/90 backdrop-blur-xl border-l border-white/10 z-50 flex flex-col transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white">AI Assistant</h2>
              <p className="text-white/50 text-sm">Powered by BFFlix</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3 animate-in slide-in-from-bottom-2 duration-300',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600">
                    <Sparkles className="w-4 h-4 text-white" />
                  </AvatarFallback>
                </Avatar>
              )}

              <div className={cn(
                'flex flex-col gap-3 max-w-[80%]',
                message.role === 'user' && 'items-end'
              )}>
                {/* Text Message */}
                {message.content && (
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-3',
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                        : 'bg-white/10 text-white/90'
                    )}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                )}

                {/* Recommendation Cards */}
                {message.recommendations && message.recommendations.length > 0 && (
                  <div className="space-y-3 w-full">
                    {message.recommendations.map((rec) => (
                      <div
                        key={rec.tmdbId}
                        className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all hover:scale-[1.02]"
                      >
                        <div className="flex gap-3">
                          {/* Poster */}
                          {rec.poster && (
                            <ImageWithFallback
                              src={rec.poster}
                              alt={rec.title}
                              className="w-16 h-24 object-cover rounded-lg flex-shrink-0"
                            />
                          )}

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="text-white text-sm line-clamp-1">
                                {rec.title}
                              </h4>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'border-white/20 text-xs flex-shrink-0',
                                  rec.type === 'movie' ? 'text-red-400' : 'text-blue-400'
                                )}
                              >
                                {rec.type === 'movie' ? 'Movie' : 'TV'}
                              </Badge>
                            </div>

                            {rec.year && (
                              <p className="text-white/50 text-xs mb-2">{rec.year}</p>
                            )}

                            {rec.overview && (
                              <p className="text-white/70 text-xs leading-relaxed line-clamp-2 mb-2">
                                {rec.overview}
                              </p>
                            )}

                            {/* Reason/Match Score */}
                            {rec.reason && (
                              <p className="text-purple-400 text-xs italic mb-2">
                                {rec.reason}
                              </p>
                            )}

                            {/* Streaming Services */}
                            {rec.playableOn.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {rec.playableOn.map(service => (
                                  <Badge
                                    key={service}
                                    className={cn(
                                      'text-xs',
                                      `${serviceColors[service] || 'bg-gray-600'} text-white`
                                    )}
                                  >
                                    {service}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-xs">
                    You
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {/* Thinking Indicator */}
          {isThinking && (
            <div className="flex gap-3 animate-in slide-in-from-bottom-2 duration-300">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600">
                  <Sparkles className="w-4 h-4 text-white" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-white/10 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-white/60 animate-spin" />
                  <p className="text-white/60 text-sm">Thinking...</p>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 border-t border-white/10">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask for recommendations..."
              disabled={isThinking}
              className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50 disabled:opacity-50"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isThinking}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
