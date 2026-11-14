
import { useState, useRef, useEffect } from "react";
import TypingIndicator from "./TypingIndicator.jsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

function Chat() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I'm your AI assistant. How can I help you?"
    }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [error, setError] = useState("");
  const [lastFailedMessages, setLastFailedMessages] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL;

  // Automatically scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages, loading, error]);

  // Automatically adjust textarea height
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height =
      `${Math.min(textarea.scrollHeight, 150)}px`;
  };

  // Read error response
  const getErrorMessage = async (response) => {
    const text = await response.text();

    try {
      const data = JSON.parse(text);
      return data.error || "Something went wrong.";
    } catch {
      return text || "Something went wrong.";
    }
  };

  // Common function to receive streaming AI response
  const requestAIResponse = async (conversation, onChunk) => {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: conversation.filter(
          (msg) => msg.role !== "system"
        )
      })
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response));
    }

    if (!response.body) {
      throw new Error("Streaming is not supported by this browser.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let aiResponse = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, {
          stream: true
        });

        aiResponse += chunk;

        onChunk(aiResponse);
      }

      // Process remaining decoded text
      const remaining = decoder.decode();

      if (remaining) {
        aiResponse += remaining;
        onChunk(aiResponse);
      }

      if (!aiResponse.trim()) {
        throw new Error("The AI returned an empty response.");
      }

      return aiResponse;

    } catch (error) {
      await reader.cancel().catch(() => {});
      throw error;
    }
  };

  // Send message to backend
  const sendMessage = async (e) => {
    e.preventDefault();

    if (!input.trim() || loading) return;

    const userMessage = {
      role: "user",
      content: input.trim()
    };

    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setError("");
    setLastFailedMessages(null);
    setLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Add empty assistant message for streaming
    setMessages([
      ...updatedMessages,
      {
        role: "assistant",
        content: ""
      }
    ]);

    try {
      const aiResponse = await requestAIResponse(
        updatedMessages,
        (content) => {
          setMessages((prev) => {
            const updated = [...prev];

            updated[updated.length - 1] = {
              role: "assistant",
              content
            };

            return updated;
          });
        }
      );

      // Save final response
      setMessages((prev) => {
        const updated = [...prev];

        updated[updated.length - 1] = {
          role: "assistant",
          content: aiResponse
        };

        return updated;
      });

    } catch (error) {
      console.error("Chat Error:", error);

      setError(
        error.message === "Failed to fetch"
          ? "Unable to connect to the server. Please check your connection."
          : error.message
      );

      setLastFailedMessages(updatedMessages);

      // Remove incomplete assistant response
      setMessages((prev) =>
        prev[prev.length - 1]?.role === "assistant"
          ? prev.slice(0, -1)
          : prev
      );

    } finally {
      setLoading(false);
    }
  };

  // Retry failed request
  const retryMessage = async () => {
    if (!lastFailedMessages || loading) return;

    setError("");
    setLoading(true);

    // Add an empty assistant message
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: ""
      }
    ]);

    try {
      const aiResponse = await requestAIResponse(
        lastFailedMessages,
        (content) => {
          setMessages((prev) => {
            const updated = [...prev];

            updated[updated.length - 1] = {
              role: "assistant",
              content
            };

            return updated;
          });
        }
      );

      setMessages((prev) => {
        const updated = [...prev];

        updated[updated.length - 1] = {
          role: "assistant",
          content: aiResponse
        };

        return updated;
      });

      setLastFailedMessages(null);

    } catch (error) {
      console.error("Retry Error:", error);

      setError(
        error.message === "Failed to fetch"
          ? "Unable to connect to the server. Please try again."
          : error.message
      );

      setMessages((prev) =>
        prev[prev.length - 1]?.role === "assistant"
          ? prev.slice(0, -1)
          : prev
      );

    } finally {
      setLoading(false);
    }
  };

  // Clear conversation
  const clearChat = () => {
    if (loading) return;

    setMessages([
      {
        role: "assistant",
        content: "Hello! I'm your AI assistant. How can I help you?"
      }
    ]);

    setInput("");
    setCopiedCode(false);
    setError("");
    setLastFailedMessages(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  // Copy code to clipboard
  const copyCode = async (codeString) => {
    try {
      await navigator.clipboard.writeText(codeString);

      setCopiedCode(true);

      setTimeout(() => {
        setCopiedCode(false);
      }, 2000);

    } catch (error) {
      console.error("Failed to copy code:", error);
    }
  };

  // Markdown renderer with syntax highlighting
  const renderMarkdown = (content) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");

            const isBlock =
              Boolean(match) || String(children).includes("\n");

            if (!isBlock) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }

            return (
              <div className="code-block-wrapper">
                <div className="code-block-header">
                  <span>{match?.[1] || "code"}</span>

                  <button
                    type="button"
                    className="copy-code-button"
                    onClick={() => copyCode(codeString)}
                  >
                    {copiedCode ? "Copied!" : "Copy Code"}
                  </button>
                </div>

                <SyntaxHighlighter
                  language={match?.[1] || "text"}
                  style={oneLight}
                  PreTag="div"
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  return (
    <div className="chat-container">

      {/* Chat Header */}
      <header className="chat-header">
        <div>
          <h2>AI Assistant</h2>
          <p>Powered by Groq LLM</p>
        </div>

        <button onClick={clearChat} disabled={loading}>
          New Chat
        </button>
      </header>

      {/* Chat Messages */}
      <div className="messages-container">

        {messages.map((message, index) => (
          <div
            key={index}
            className={`message ${message.role}`}
          >
            <div className="message-content">
              {message.role === "assistant"
                ? renderMarkdown(message.content)
                : message.content}
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {loading && messages[messages.length - 1]?.content === "" && (
          <TypingIndicator />
        )}

        {/* Error Message and Retry Button */}
        {error && (
          <div className="error-container">
            <p>{error}</p>

            {lastFailedMessages && (
              <button
                type="button"
                onClick={retryMessage}
                disabled={loading}
              >
                Retry
              </button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />

      </div>

      {/* Chat Input */}
      <form className="chat-input" onSubmit={sendMessage}>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            adjustTextareaHeight();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage(e);
            }
          }}
          placeholder="Ask me anything..."
          disabled={loading}
          rows={1}
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
        >
          {loading ? "Generating..." : "Send"}
        </button>

      </form>

    </div>
  );
}

export default Chat;
