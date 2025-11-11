import React, { useEffect, useRef, useState } from "react";
import { Send, Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const App = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef(null);

  useEffect(() => {
    // scroll to bottom when messages change
    const el = messagesRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // append user message immediately
    const userMsg = { text, sender: "user" };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const backend = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
      const res = await fetch(`${backend}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const aiText = data?.reply || "(no response)";
      const aiMsg = { text: aiText, sender: "ai" };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [...prev, { text: "⚠️ Server error", sender: "ai" }]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (d) => {
    try {
      const dt = new Date(d);
      return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="app-container">
      <div className="chat-card" role="region" aria-label="Chat">
        <header className="chat-header">
          <div>
            <h1 className="chat-title">AI Chat Bot</h1>
            <p className="chat-sub">Smart replies — powered by your backend</p>
          </div>
          <div className="brand">🤖</div>
        </header>

        <div className="messages" ref={messagesRef} aria-live="polite">
          {messages.length === 0 && (
            <div className="message ai">
              <div className="bubble formatted-text">Say hi — I'm listening 👋</div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.sender}`}>
              <div className="avatar" aria-hidden>
                {msg.sender === 'ai' ? 'A' : 'U'}
              </div>
              <div className="bubble-wrap">
                <div className="bubble formatted-text">
                  {msg.sender === "ai" ? (
                    <ReactMarkdown
                    components={{
                      h1: ({ node, ...props }) => <h1 className="text-xl font-bold my-2" {...props} />,
                      h2: ({ node, ...props }) => <h2 className="text-lg font-bold my-2" {...props} />,
                      h3: ({ node, ...props }) => <h3 className="text-base font-bold my-1" {...props} />,
                      p: ({ node, ...props }) => <p className="my-2 leading-relaxed" {...props} />,
                      ul: ({ node, ...props }) => <ul className="list-disc list-inside my-2 ml-2" {...props} />,
                      ol: ({ node, ...props }) => <ol className="list-decimal list-inside my-2 ml-2" {...props} />,
                      li: ({ node, ...props }) => <li className="my-1" {...props} />,
                      blockquote: ({ node, ...props }) => (
                        <blockquote className="border-l-4 border-blue-500 pl-4 my-2 italic" {...props} />
                      ),
                      code: ({ node, inline, className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || "");
                        if (inline) {
                          return <code className="bg-gray-700 px-2 py-1 rounded text-sm" {...props}>{children}</code>;
                        }
                        return (
                          <SyntaxHighlighter
                            style={atomDark}
                            language={match ? match[1] : "text"}
                            PreTag="div"
                            className="rounded my-2"
                            {...props}
                          >
                            {String(children).replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        );
                      },
                      a: ({ node, ...props }) => (
                        <a className="text-blue-400 underline hover:text-blue-300" target="_blank" rel="noopener noreferrer" {...props} />
                      ),
                      strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                      em: ({ node, ...props }) => <em className="italic" {...props} />,
                      table: ({ node, ...props }) => <table className="border-collapse my-2" {...props} />,
                      th: ({ node, ...props }) => <th className="border border-gray-600 px-3 py-2 bg-gray-700" {...props} />,
                      td: ({ node, ...props }) => <td className="border border-gray-600 px-3 py-2" {...props} />,
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                ) : (
                  msg.text
                )}
                </div>
                <div className="meta">{formatTime(msg.time || Date.now())}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="message ai">
              <div className="avatar">A</div>
              <div className="bubble-wrap">
                <div className="bubble formatted-text">
                  <span className="typing">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
                <div className="meta">{formatTime(Date.now())}</div>
              </div>
            </div>
          )}
        </div>

        <div className="input-row">
          <input
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask something, e.g. 'Explain closures in JS'"
            aria-label="Message"
            disabled={loading}
          />
          <button
            className="send-button"
            onClick={sendMessage}
            aria-label="Send message"
            disabled={loading}
          >
            <Send />
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
