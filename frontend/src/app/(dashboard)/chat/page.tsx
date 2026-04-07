"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import styles from "./chat.module.css";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [token, setToken] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Responsive sidebar: close on mobile by default
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, []);
  const [freeChatsRemaining, setFreeChatsRemaining] = useState<number | null>(null);
  const [isWaking, setIsWaking] = useState(false);

  // Auth check
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        return;
      }
      setUser({ id: session.user.id, email: session.user.email || "" });
      setToken(session.access_token);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) router.push("/login");
        else setToken(session.access_token);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.getConversations(token);
      setConversations(data.conversations || []);
    } catch {
      // Backend might be cold starting
      setIsWaking(true);
      setTimeout(() => loadConversations(), 5000);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadConversations();
      // Get profile for free chats
      api.getProfile(token).then(data => {
        setFreeChatsRemaining(data.profile?.free_chats_remaining ?? null);
        setIsWaking(false);
      }).catch(() => {
        setIsWaking(true);
      });
    }
  }, [token, loadConversations]);

  // Load conversation messages
  const loadConversation = async (convId: string) => {
    if (!token) return;
    try {
      const data = await api.getConversation(convId, token);
      setMessages(data.messages || []);
      setActiveConvId(convId);

      // Auto-collapse sidebar on mobile
      if (typeof window !== "undefined" && window.innerWidth <= 768) {
        setSidebarOpen(false);
      }
    } catch (err) {
      console.error("Failed to load conversation:", err);
    }
  };

  // Send message
  const handleInputContent = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming || !token) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const response = await fetch(api.getChatStreamUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversation_id: activeConvId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 402) {
          // Trial expired
          setIsStreaming(false);
          setMessages((prev) => [
            ...prev,
            {
              id: "trial-expired",
              role: "assistant",
              content:
                "Your free trial has ended. Please add your API key in Settings to continue our conversation. I'll be here when you're ready. 💜",
            },
          ]);
          return;
        }
        throw new Error(errorData.detail || "Failed to send message");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let currentConvId = activeConvId;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (line.includes('"event":"metadata"') || data.conversation_id) {
                  currentConvId = data.conversation_id || currentConvId;
                  if (!activeConvId) setActiveConvId(currentConvId);
                }

                if (data.content) {
                  fullContent += data.content;
                  setStreamingContent(fullContent);
                }

                if (data.free_chats_remaining !== undefined && data.free_chats_remaining !== null) {
                  setFreeChatsRemaining(data.free_chats_remaining);
                }
              } catch {
                // Skip malformed SSE data
              }
            }

            if (line.startsWith("event: ")) {
              const eventType = line.slice(7).trim();
              if (eventType === "done") {
                // Done streaming
              }
            }
          }
        }
      }

      // Add assistant message
      if (fullContent) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: fullContent,
          },
        ]);
      }

      setStreamingContent("");
      setIsStreaming(false);
      loadConversations(); // Refresh sidebar
    } catch (err) {
      console.error("Chat error:", err);
      setIsStreaming(false);
      setMessages((prev) => [
        ...prev,
        {
          id: "error",
          role: "assistant",
          content: "Something went wrong. Please try again.",
        },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setStreamingContent("");
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Auto-collapse sidebar on mobile
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  const deleteConversation = async (convId: string) => {
    if (!token) return;
    await api.deleteConversation(convId, token);
    if (activeConvId === convId) {
      startNewChat();
    }
    loadConversations();
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (isWaking) {
    return (
      <div className={styles.wakingContainer}>
        <div className={styles.wakingOrb} />
        <h2>Sapti is waking up...</h2>
        <p className="text-secondary">
          First visit takes a moment. Just a few more seconds.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarLogo}>
            <div className={styles.logoOrb} />
            <span>Sapti</span>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setSidebarOpen(false)}
            title="Close sidebar"
          >
            ✕
          </button>
        </div>

        <button
          className={`${styles.newChatBtn} btn btn-secondary`}
          onClick={startNewChat}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Chat
        </button>

        <div className={styles.conversationList}>
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`${styles.conversationItem} ${activeConvId === conv.id ? styles.conversationActive : ""
                }`}
              onClick={() => loadConversation(conv.id)}
            >
              <span className={styles.conversationTitle}>
                {conv.title || "New conversation"}
              </span>
              <button
                className={styles.deleteBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                }}
                title="Delete"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className={styles.sidebarFooter}>
          {freeChatsRemaining !== null && freeChatsRemaining > 0 && (
            <div className={styles.trialBadge}>
              {freeChatsRemaining} free chats remaining
            </div>
          )}
          <div className={styles.footerLinks}>
            <button className="btn btn-ghost btn-sm" onClick={() => router.push("/evolution")}>
              🧬 Evolution
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => router.push("/settings")}>
              ⚙️ Settings
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Chat Area */}
      <main className={styles.chatArea}>
        {/* Mobile header */}
        <div className={styles.chatHeader}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>
          <span className={styles.chatTitle}>
            {activeConvId
              ? conversations.find((c) => c.id === activeConvId)?.title || "Chat"
              : "New Chat"}
          </span>
          <div style={{ width: 36 }} />
        </div>

        {/* Messages */}
        <div className={styles.messagesContainer}>
          <div className={styles.messages}>
            {messages.length === 0 && !isStreaming && (
              <div className={styles.emptyState}>
                <div className={styles.emptyOrb} />
                <h2>
                  Hey{user?.email ? `, ${user.email.split("@")[0]}` : ""}
                </h2>
                <p className="text-secondary">
                  I&apos;m Sapti — an evolving intelligence. Ask me anything, tell
                  me about your day, or let&apos;s explore ideas together.
                </p>
                <div className={styles.suggestions}>
                  {[
                    "Tell me about yourself, Sapti",
                    "I need help thinking through something",
                    "What's on your mind today?",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      className={styles.suggestionChip}
                      onClick={() => {
                        setInput(suggestion);
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`${styles.message} ${msg.role === "user" ? styles.messageUser : styles.messageAssistant
                  }`}
              >
                {msg.role === "assistant" && (
                  <div className={styles.messageAvatar}>
                    <div className={styles.avatarOrb} />
                  </div>
                )}
                <div className={styles.messageBubble}>
                  <div className={styles.messageContent}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}

            {/* Streaming message */}
            {isStreaming && (
              <div className={`${styles.message} ${styles.messageAssistant}`}>
                <div className={styles.messageAvatar}>
                  <div className={`${styles.avatarOrb} ${styles.avatarOrbThinking}`} />
                </div>
                <div className={styles.messageBubble}>
                  <div className={styles.messageContent}>
                    {streamingContent ? (
                      <ReactMarkdown>{streamingContent}</ReactMarkdown>
                    ) : (
                      <span className={styles.thinking}>
                        <span>●</span>
                        <span>●</span>
                        <span>●</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className={styles.inputArea}>
          <div className={styles.inputContainer}>
            <textarea
              ref={textareaRef}
              className={styles.chatInput}
              placeholder="Ask anything to Sapti..."
              value={input}
              onChange={handleInputContent}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isStreaming}
            />
            <button
              className={`${styles.sendBtn} ${input.trim() ? styles.sendBtnActive : ""}`}
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p className={styles.inputHint}>
            Sapti remembers your conversations and evolves through the Hive Mind
            <span style={{ opacity: 0.6, marginLeft: '8px' }}>•  Shift + Enter ↵ for new line</span>
          </p>
        </div>
      </main>
    </div>
  );
}
