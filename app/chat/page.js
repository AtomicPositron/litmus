'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import styles from './chat.module.css';
import useLitmusStore from '../hooks/useLitmusStore';
import Footer from '@/components/Footer';

const PLACEHOLDERS = [
    'A smart attendance system using facial recognition...',
    'Blockchain-based certificate verification for universities...',
    'AI chatbot for mental health support among students...',
    'IoT-powered smart campus energy management system...',
    'Peer-to-peer tutoring marketplace with NLP matching...',
];

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
        reset();

        const title = idea.split(/[.!?]/)[0].trim().slice(0, 80) || idea.slice(0, 80);
        const description = idea.trim();

        const apiResult = await submitIdea({ title, description });

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

    const pct = idea.length / MAX_CHARS;
    const counterColor = pct > 0.9 ? '#ff6b6b' : pct > 0.7 ? '#f5a623' : 'var(--litmus-muted2)';
    const canSubmit = idea.trim().length >= 20 && idea.length <= MAX_CHARS;

    return (
        <div className={styles.root}>
            <div className={styles.gridBg} aria-hidden />
            <div className={styles.glow} aria-hidden />

            <main className={styles.main}>
                {/* ── Header ── */}
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

                {/* ── Input box ── */}
                <motion.div
                    className={styles.inputWrap}
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.55, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                >
                    <div className={styles.inputBox}>
                        <div className={styles.inputTop}>
                            <span className={styles.inputLabel}>Project idea</span>
                            <span className={styles.charCounter} style={{ color: counterColor }}>
                                {idea.length}/{MAX_CHARS}
                            </span>
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
                                {scanning
                                    ? <span className={styles.spinner} aria-label="Scanning" />
                                    : <>Validate idea ↗</>
                                }
                            </motion.button>
                        </div>
                    </div>

                    {/* ── API error ── */}
                    <AnimatePresence>
                        {apiError && (
                            <motion.div
                                className={styles.errorBanner}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                transition={{ duration: 0.25 }}
                            >
                                ⚠ {apiError} — check your connection and try again.
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* ── Example chips ── */}
                <AnimatePresence>
                    {!scanning && (
                        <motion.div
                            className={styles.chips}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ delay: 0.4, duration: 0.3 }}
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
                </AnimatePresence>
            </main>
        </div>
    );
}