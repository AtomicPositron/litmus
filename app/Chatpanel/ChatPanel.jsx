"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useLitmusStore from "../hooks/useLitmusStore";
import styles from "./ChatPanel.module.css";

// ─── Thinking dots ─────────────────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <span className={styles.dots}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className={styles.dot}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </span>
  );
}

// ─── Single message bubble ─────────────────────────────────────────────────────
function Bubble({ role, text }) {
  const isUser = role === "user";
  return (
    <motion.div
      className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAssistant}`}
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {!isUser && <span className={styles.assistantLabel}>Litmus Guide</span>}
      <p className={styles.bubbleText}>{text}</p>
    </motion.div>
  );
}

// ─── ChatPanel ─────────────────────────────────────────────────────────────────
export default function ChatPanel() {
  const chatOpen = useLitmusStore((s) => s.chatOpen);
  const setChatOpen = useLitmusStore((s) => s.setChatOpen);
  const chatMessages = useLitmusStore((s) => s.chatMessages);
  const chatLoading = useLitmusStore((s) => s.chatLoading);
  const sendChat = useLitmusStore((s) => s.sendChat);
  const result = useLitmusStore((s) => s.result);

  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  // focus input when panel opens
  useEffect(() => {
    if (chatOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [chatOpen]);

  const SaveHistory = (req, res) => {
    
  };

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || chatLoading) return;
    setInput("");
    await sendChat(trimmed);
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Suggested openers shown before first message
  const suggestions = [
    "How can I improve my score?",
    "What makes this idea weak?",
    "Suggest a more novel angle",
    "Explain the similar projects",
  ];

  return (
    <>
      {/* ── Backdrop ── */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setChatOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Panel ── */}
      <AnimatePresence>
        {chatOpen && (
          <motion.aside
            className={styles.panel}
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
          >
            {/* Header */}
            <div className={styles.panelHeader}>
              <div className={styles.panelHeaderLeft}>
                <span className={styles.panelDot} />
                <span className={styles.panelTitle}>Litmus Guide</span>
                <span className={styles.panelBadge}>AI</span>
              </div>
              <button
                className={styles.closeBtn}
                onClick={() => setChatOpen(false)}
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>

            {/* Context pill — shows current score */}
            {result && (
              <div className={styles.contextPill}>
                <span className={styles.contextLabel}>Context</span>
                <span className={styles.contextScore}>
                  Score {result.novelty_score.toFixed(1)} · {result.level}
                </span>
              </div>
            )}

            {/* Messages */}
            <div className={styles.messages}>
              {chatMessages.length === 0 && (
                <motion.div
                  className={styles.empty}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <p className={styles.emptyTitle}>
                    Ask me anything about your results
                  </p>
                  <p className={styles.emptySub}>
                    I have full context on your score, matches, and idea.
                  </p>

                  {/* Suggestion chips */}
                  <div className={styles.suggestions}>
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        className={styles.suggestion}
                        onClick={() => {
                          setInput(s);
                          inputRef.current?.focus();
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {chatMessages.map((msg, i) => (
                <Bubble key={i} role={msg.role} text={msg.text} />
              ))}

              {chatLoading && (
                <motion.div
                  className={`${styles.bubble} ${styles.bubbleAssistant}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <span className={styles.assistantLabel}>Litmus Guide</span>
                  <ThinkingDots />
                </motion.div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className={styles.inputRow}>
              <textarea
                ref={inputRef}
                className={styles.input}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about your score, matches, or idea..."
                rows={2}
                disabled={chatLoading}
              />
              <motion.button
                className={styles.sendBtn}
                onClick={handleSend}
                disabled={!input.trim() || chatLoading}
                whileTap={{ scale: 0.93 }}
                whileHover={{ scale: 1.04 }}
              >
                ↑
              </motion.button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Floating trigger button (visible when panel is closed) ── */}
      <AnimatePresence>
        {!chatOpen && (
          <motion.button
            className={styles.triggerBtn}
            onClick={() => setChatOpen(true)}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
          >
            <span className={styles.triggerIcon}>💬</span>
            <span className={styles.triggerLabel}>Ask Litmus Guide</span>
            {chatMessages.length > 0 && (
              <span className={styles.triggerBadge}>{chatMessages.length}</span>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
