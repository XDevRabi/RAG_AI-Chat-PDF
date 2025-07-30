"use client";

import { Button } from "src/components/ui/button";
import * as React from "react";
import { Input } from "src/components/ui/input";
import { Send, FileText, Bot, User, Loader2 } from "lucide-react";

interface Doc {
  pageContent?: string;
  metadata?: {
    loc?: {
      pageNumber?: number;
    };
    source?: string;
  };
}

interface IMessage {
  role: "assistant" | "user";
  content?: string;
  documents?: Doc[];
  timestamp?: Date;
}

const ChatComponent: React.FC = () => {
  const [message, setMessage] = React.useState<string>("");
  const [messages, setMessages] = React.useState<IMessage[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendChatMessage = async () => {
    if (!message.trim()) return;

    const userMessage: IMessage = {
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

    try {
      const res = await fetch(
        `http://localhost:8000/chat?message=${encodeURIComponent(message)}`
      );
      const data = await res.json();

      const assistantMessage: IMessage = {
        role: "assistant",
        content: data?.message,
        documents: data?.docs,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: IMessage = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendChatMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
              <FileText className="w-12 h-12 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Start a conversation
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              Upload a PDF document and start asking questions about its content.
              I&apos;ll help you find the information you need!
            </p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="flex-shrink-0">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              )}
              
              <div
                className={`max-w-3xl rounded-2xl px-4 py-3 shadow-sm ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {msg.content}
                </div>
                
                {msg.documents && msg.documents.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Sources ({msg.documents.length})
                    </div>
                    <div className="space-y-2">
                      {msg.documents.slice(0, 3).map((doc, docIndex) => (
                        <div
                          key={docIndex}
                          className="text-xs bg-gray-50 dark:bg-gray-700 rounded-lg p-2 border-l-2 border-blue-500"
                        >
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Page {doc.metadata?.loc?.pageNumber || "Unknown"}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400 line-clamp-2">
                            {doc.pageContent?.substring(0, 150)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {msg.timestamp && (
                  <div
                    className={`text-xs mt-2 ${
                      msg.role === "user"
                        ? "text-blue-200"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {formatTime(msg.timestamp)}
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="flex-shrink-0">
                  <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                    <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question about your document..."
                className="pr-12 py-3 rounded-xl border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 resize-none"
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleSendChatMessage}
              disabled={!message.trim() || isLoading}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
            Press Enter to send • Shift + Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatComponent;