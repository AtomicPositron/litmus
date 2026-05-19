'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './analysis.module.css';
import useLitmusStore, { scoreToGrade } from '../hooks/useLitmusStore';
import ChatPanel from '../Chatpanel/ChatPanel';

// ─── Score bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ label, value, color, delay }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true });

    return (
        <div className={styles.scoreRow} ref={ref}>
            <div className={styles.scoreTop}>
                <span className={styles.scoreLabel}>{label}</span>
                <span className={styles.scoreValue} style={{ color }}>{Math.round(value)}%</span>
            </div>
            <div className={styles.scoreTrack}>
                <motion.div
                    className={styles.scoreFill}
                    style={{ background: color }}
                    initial={{ width: 0 }}
                    animate={inView ? { width: `${value}%` } : {}}
                    transition={{ duration: 1, delay: delay + 0.2, ease: [0.22, 1, 0.36, 1] }}
                />
            </div>
        </div>
    );
}

// ─── Flag item ─────────────────────────────────────────────────────────────────
const FLAG_STYLES = {
    warn: { bg: 'rgba(251,146,60,0.08)', border: 'rgba(251,146,60,0.2)', icon: '⚠', color: '#fb923c' },
    info: { bg: 'rgba(103,232,249,0.06)', border: 'rgba(103,232,249,0.15)', icon: '●', color: '#67e8f9' },
    good: { bg: 'rgba(200,245,66,0.06)', border: 'rgba(200,245,66,0.15)', icon: '✓', color: '#c8f542' },
};

function Flag({ type, text }) {
    const s = FLAG_STYLES[type];
    return (
        <div className={styles.flag} style={{ background: s.bg, border: `1px solid ${s.border}` }}>
            <span style={{ color: s.color, fontSize: '0.8rem' }}>{s.icon}</span>
            <span className={styles.flagText}>{text}</span>
        </div>
    );
}

// ─── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ title, tag, children, delay = 0 }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: '-60px' });

    return (
        <motion.div
            ref={ref}
            className={styles.card}
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
        >
            <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{title}</h2>
                {tag && <span className={styles.cardTag}>{tag}</span>}
            </div>
            {children}
        </motion.div>
    );
}

// ─── Build flags from real API result ─────────────────────────────────────────
function buildFlags(result) {
    const flags = [];

    const matchCount = result.closest_matches?.length ?? 0;
    const tagCount = result.matched_tags?.length ?? 0;

    if (matchCount > 0) {
        flags.push({ type: 'warn', text: `${matchCount} similar project${matchCount > 1 ? 's' : ''} found in archive` });
    }
    if (tagCount > 0) {
        flags.push({ type: 'warn', text: `${tagCount} overlapping keyword${tagCount > 1 ? 's' : ''} detected` });
    }
    if (result.semantic_novelty > 0.7) {
        flags.push({ type: 'good', text: 'High semantic novelty — your angle is relatively unexplored' });
    }
    if (result.tag_novelty > 0.7) {
        flags.push({ type: 'good', text: 'Strong keyword freshness — terms are underused in existing projects' });
    }
    if (result.confidence < 0.5) {
        flags.push({ type: 'info', text: 'Low confidence in score — consider adding more description detail' });
    }
    if (matchCount === 0) {
        flags.push({ type: 'good', text: 'No close matches found — strong differentiation' });
    }

    return flags;
}

// ─── Analysis Page ─────────────────────────────────────────────────────────────
export default function AnalysisPage() {
    const router = useRouter();
    const result = useLitmusStore((s) => s.result);
    const resultLoading = useLitmusStore((s) => s.resultLoading);
    const resultError = useLitmusStore((s) => s.resultError);
    const submission = useLitmusStore((s) => s.submission);
    const reset = useLitmusStore((s) => s.reset);

    const [copied, setCopied] = useState(false);

    // Guard — if no result and not loading, send back to input
    useEffect(() => {
        if (!result && !resultLoading) {
            router.replace('/chat');
        }
    }, [result, resultLoading, router]);

    if (resultLoading) {
        return (
            <div className={styles.loading}>
                <div className={styles.loadingSpinner} />
                <p className={styles.loadingText}>Analysing your idea…</p>
            </div>
        );
    }

    if (resultError) {
        return (
            <div className={styles.loading}>
                <p style={{ color: '#ff6b6b', marginBottom: '1rem' }}>⚠ {resultError}</p>
                <button className={styles.retryBtn} onClick={() => router.push('/chat')}>
                    Try again ↗
                </button>
            </div>
        );
    }

    if (!result) return null;

    // ── Derived display values ──────────────────────────────────────────────────
    const { grade, label: gradeLabel, color: gradeColor } = scoreToGrade(result.novelty_score);

    const scores = [
        { label: 'Novelty score', value: result.novelty_score, color: gradeColor },
        { label: 'Semantic novelty', value: result.semantic_novelty * 100, color: '#a78bfa' },
        { label: 'Keyword freshness', value: result.tag_novelty * 100, color: '#67e8f9' },
        { label: 'Confidence', value: result.confidence * 100, color: '#fb923c' },
    ];

    const flags = buildFlags(result);

    return (
        <div className={styles.root}>
            <div className={styles.glow} aria-hidden />

            {/* ── Nav ── */}
            <nav className={styles.nav}>
                <Link href="/" className={styles.navLogo}>litmus</Link>
                <div className={styles.navCenter}>
                    <span className={styles.navIdea}>
                        "{(submission?.title || '').slice(0, 60)}{(submission?.title || '').length > 60 ? '…' : ''}"
                    </span>
                </div>
                <button
                    className={styles.navRetry}
                    onClick={() => { reset(); router.push('/chat'); }}
                >
                    Try another idea ↗
                </button>
            </nav>

            <main className={styles.main}>

                {/* ── Grade Hero ── */}
                <motion.section
                    className={styles.gradeHero}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                >
                    <div className={styles.gradeLeft}>
                        <motion.div
                            className={styles.gradeCircle}
                            style={{ color: gradeColor, borderColor: `${gradeColor}40` }}
                            initial={{ scale: 0.4, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.2 }}
                        >
                            {grade}
                        </motion.div>
                        <div>
                            <p className={styles.gradeLabel}>Originality grade</p>
                            <h1 className={styles.gradeTitle}>{gradeLabel}</h1>
                            <p className={styles.gradeSummary}>{result.explanation}</p>
                        </div>
                    </div>

                    <div className={styles.gradeScores}>
                        {scores.map((s, i) => (
                            <ScoreBar key={s.label} {...s} delay={i * 0.07} />
                        ))}
                    </div>
                </motion.section>

                {/* ── Grid ── */}
                <div className={styles.grid}>

                    {/* Scan findings */}
                    <SectionCard title="Scan findings" tag={`${flags.length} items`} delay={0.05}>
                        <div className={styles.flags}>
                            {flags.map((f, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + i * 0.07 }}
                                >
                                    <Flag {...f} />
                                </motion.div>
                            ))}
                        </div>
                    </SectionCard>

                    {/* Similar projects */}
                    {result.closest_matches?.length > 0 && (
                        <SectionCard
                            title="Similar projects found"
                            tag={`${result.closest_matches.length} matches`}
                            delay={0.1}
                        >
                            <div className={styles.similar}>
                                {result.closest_matches.map((p, i) => {
                                    const pct = Math.round(p.similarity * 100);
                                    return (
                                        <div key={p.id || i} className={styles.similarRow}>
                                            <div>
                                                <p className={styles.similarTitle}>{p.title}</p>
                                                {p.department && (
                                                    <p className={styles.similarYear}>{p.department}</p>
                                                )}
                                                {p.tags?.length > 0 && (
                                                    <p className={styles.similarTags}>{p.tags.join(' · ')}</p>
                                                )}
                                            </div>
                                            <span
                                                className={styles.similarMatch}
                                                style={{
                                                    color: pct > 60 ? '#fb923c' : '#c8f542',
                                                    background: pct > 60 ? 'rgba(251,146,60,0.08)' : 'rgba(200,245,66,0.06)',
                                                }}
                                            >
                                                {pct}%
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </SectionCard>
                    )}

                    {/* Keywords */}
                    {result.generated_keywords?.length > 0 && (
                        <SectionCard
                            title="Generated keywords"
                            tag={`${result.generated_keywords.length} terms`}
                            delay={0.15}
                        >
                            <div className={styles.keywords}>
                                {result.generated_keywords.map((kw, i) => (
                                    <motion.span
                                        key={kw}
                                        className={styles.keyword}
                                        initial={{ opacity: 0, scale: 0.85 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.35 + i * 0.04 }}
                                    >
                                        {kw}
                                    </motion.span>
                                ))}
                            </div>
                        </SectionCard>
                    )}

                    {/* Matched tags (overlap warnings) */}
                    {result.matched_tags?.length > 0 && (
                        <SectionCard
                            title="Overlapping tags"
                            tag="risk flags"
                            delay={0.18}
                        >
                            <div className={styles.keywords}>
                                {result.matched_tags.map((tag, i) => (
                                    <motion.span
                                        key={tag}
                                        className={styles.keywordWarn}
                                        initial={{ opacity: 0, scale: 0.85 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.35 + i * 0.04 }}
                                    >
                                        {tag}
                                    </motion.span>
                                ))}
                            </div>
                        </SectionCard>
                    )}

                </div>
            </main>

            {/* ── Chat Panel (slide-in) ── */}
            <ChatPanel />
        </div>
    );
}