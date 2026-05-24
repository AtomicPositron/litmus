'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import styles from './chat.module.css';
import useLitmusStore from '../hooks/useLitmusStore';
import Footer from '@/components/Footer';
// ─── Placeholder cycling ───────────────────────────────────────────────────────
const PLACEHOLDERS = [
    'A smart attendance system using facial recognition...',
    'Blockchain-based certificate verification for universities...',
    'AI chatbot for mental health support among students...',
    'IoT-powered smart campus energy management system...',
    'Peer-to-peer tutoring marketplace with NLP matching...',
];

// ─── Thinking dots ─────────────────────────────────────────────────────────────
function ThinkingDots() {
    return (
        <span className={styles.thinkingDots}>
            {[0, 1, 2].map((i) => (
                <motion.span
                    key={i}
                    className={styles.thinkingDot}
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
            ))}
        </span>
    );
}

// ─── Scan log ──────────────────────────────────────────────────────────────────
const SCAN_LINES = [
    'Tokenising input...',
    'Running keyword extraction...',
    'Querying academic archive (2018–2024)...',
    'Running binary similarity check...',
    'Computing originality vectors...',
    'Applying grading rubric...',
    'Generating project assets...',
];

function ScanLog({ active }) {
    const [lines, setLines] = useState([]);

    useEffect(() => {
        if (!active) { setLines([]); return; }
        let i = 0;
        const interval = setInterval(() => {
            if (i < SCAN_LINES.length) {
                setLines((prev) => [...prev, SCAN_LINES[i]]);
                i++;
            } else {
                clearInterval(interval);
            }
        }, 520);
        return () => clearInterval(interval);
    }, [active]);

    return (
        <AnimatePresence>
            {active && (
                <motion.div
                    className={styles.scanLog}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {lines.map((line, i) => (
                        <motion.p
                            key={i}
                            className={styles.scanLine}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.25 }}
                        >
                            <span className={styles.scanPrompt}>›</span> {line}
                        </motion.p>
                    ))}
                    {lines.length < SCAN_LINES.length && <ThinkingDots />}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ─── Char counter ──────────────────────────────────────────────────────────────
function CharCounter({ count, max }) {
    const pct = count / max;
    const color = pct > 0.9 ? '#ff6b6b' : pct > 0.7 ? '#f5a623' : 'var(--litmus-muted2)';
    return (
        <span className={styles.charCounter} style={{ color }}>
            {count}/{max}
        </span>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
const MAX_CHARS = 800;

export default function ChatPage() {
    const [idea, setIdea] = useState('');
    const [scanning, setScanning] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0]);

    const router = useRouter();
    const textareaRef = useRef(null);
    const submitIdea = useLitmusStore((s) => s.submitIdea);
    const reset = useLitmusStore((s) => s.reset);

    // cycle placeholder
    useEffect(() => {
        let i = 0;
        const interval = setInterval(() => {
            i = (i + 1) % PLACEHOLDERS.length;
            setPlaceholder(PLACEHOLDERS[i]);
        }, 3200);
        return () => clearInterval(interval);
    }, []);

    async function handleSubmit() {
        if (!idea.trim() || scanning) return;

        setScanning(true);
        setApiError(null);
        reset(); // clear any previous result

        // ── derive a rough "title" = first sentence / first 80 chars ──────────
        const title = idea.split(/[.!?]/)[0].trim().slice(0, 80) || idea.slice(0, 80);
        const description = idea.trim();

        // ── fire API call in background while scan animation plays ────────────
        const apiPromise = submitIdea({ title, description });

        // ── wait for animation to finish ──────────────────────────────────────
        const animDuration = SCAN_LINES.length * 520 + 800;
        const [apiResult] = await Promise.all([
            apiPromise,
            new Promise((r) => setTimeout(r, animDuration)),
        ]);

        if (!apiResult.ok) {
            setApiError(apiResult.error);
            setScanning(false);
            return;
        }

        router.push('/analysis');
    }

    function handleKey(e) {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
    }

    const canSubmit = idea.trim().length >= 20 && idea.length <= MAX_CHARS;

    return (
        <div className={styles.root}>
            <div className={styles.gridBg} aria-hidden />
            <div className={styles.glow} aria-hidden />

            <main className={styles.main}>
                <motion.div
                    className={styles.header}
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <p className={styles.step}>Step 01 of 01</p>
                    <h1 className={styles.title}>What's your project idea?</h1>
                    <p className={styles.sub}>
                        Describe your concept in a few sentences — or paste your full abstract.
                        The more detail, the sharper the scan.
                    </p>
                </motion.div>

                <motion.div
                    className={styles.inputWrap}
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.55, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                >
                    <div className={styles.inputBox}>
                        <div className={styles.inputTop}>
                            <span className={styles.inputLabel}>Project idea</span>
                            <CharCounter count={idea.length} max={MAX_CHARS} />
                        </div>

                        <textarea
                            ref={textareaRef}
                            className={styles.textarea}
                            value={idea}
                            onChange={(e) => setIdea(e.target.value.slice(0, MAX_CHARS))}
                            onKeyDown={handleKey}
                            placeholder={placeholder}
                            rows={6}
                            disabled={scanning}
                        />

                        <div className={styles.inputBottom}>
                            <span className={styles.inputHint}>
                                {idea.length < 20
                                    ? `${20 - idea.length} more characters to unlock scan`
                                    : '⌘ + Enter to submit'}
                            </span>

                            <motion.button
                                className={styles.submitBtn}
                                onClick={handleSubmit}
                                disabled={!canSubmit || scanning}
                                whileTap={canSubmit && !scanning ? { scale: 0.96 } : {}}
                                whileHover={canSubmit && !scanning ? { scale: 1.02 } : {}}
                            >
                                {scanning ? <>Scanning <ThinkingDots /></> : <>Validate idea ↗</>}
                            </motion.button>
                        </div>
                    </div>

                    <ScanLog active={scanning} />

                    {/* API error state */}
                    {apiError && (
                        <motion.div
                            className={styles.errorBanner}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            ⚠ {apiError} — check your connection and try again.
                        </motion.div>
                    )}
                </motion.div>

                {/* Example chips */}
                {!scanning && (
                    <motion.div
                        className={styles.chips}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        <span className={styles.chipsLabel}>Try an example →</span>
                        {PLACEHOLDERS.slice(0, 3).map((p, i) => (
                            <button
                                key={i}
                                className={styles.chip}
                                onClick={() => setIdea(p.replace('...', ''))}
                            >
                                {p.split(' ').slice(0, 4).join(' ')}...
                            </button>
                        ))}
                    </motion.div>
                )}
            </main>
        </div>
    );
}