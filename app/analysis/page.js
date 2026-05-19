'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './analysis.module.css';
import useLitmusStore, { scoreToGrade } from '../hooks/useLitmusStore';
import ChatPanel from '../Chatpanel/ChatPanel';

// ─── Constants ────────────────────────────────────────────────────────────────

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1];

const FLAG_CONFIG = {
    warn: {
        bg: 'var(--flag-warn-bg)',
        border: 'var(--flag-warn-border)',
        text: 'var(--flag-warn-text)',
        icon: (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M7 1.5L12.5 11H1.5L7 1.5Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
                <path d="M7 6V8.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                <circle cx="7" cy="10" r="0.6" fill="currentColor" />
            </svg>
        ),
    },
    info: {
        bg: 'var(--flag-info-bg)',
        border: 'var(--flag-info-border)',
        text: 'var(--flag-info-text)',
        icon: (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.25" />
                <path d="M7 6.5V10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                <circle cx="7" cy="4.5" r="0.7" fill="currentColor" />
            </svg>
        ),
    },
    good: {
        bg: 'var(--flag-good-bg)',
        border: 'var(--flag-good-border)',
        text: 'var(--flag-good-text)',
        icon: (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.25" />
                <path d="M4.5 7L6.2 8.7L9.5 5.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildFlags(result) {
    const flags = [];
    const matchCount = result.closest_matches?.length ?? 0;
    const tagCount = result.matched_tags?.length ?? 0;

    if (matchCount > 0) {
        flags.push({ type: 'warn', text: `${matchCount} similar project${matchCount > 1 ? 's' : ''} found in the archive` });
    }
    if (tagCount > 0) {
        flags.push({ type: 'warn', text: `${tagCount} overlapping keyword${tagCount > 1 ? 's' : ''} detected` });
    }
    if (result.semantic_novelty > 0.7) {
        flags.push({ type: 'good', text: 'High semantic novelty — your angle is relatively unexplored' });
    }
    if (result.tag_novelty > 0.7) {
        flags.push({ type: 'good', text: 'Strong keyword freshness — terms are underused in existing work' });
    }
    if (result.confidence < 0.5) {
        flags.push({ type: 'info', text: 'Low confidence — adding more description detail will improve accuracy' });
    }
    if (matchCount === 0) {
        flags.push({ type: 'good', text: 'No close matches found — strong differentiation from existing projects' });
    }
    return flags;
}

function clamp(n, min, max) {
    return Math.min(Math.max(n, min), max);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreBar({ label, value, color, delay }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true });
    const pct = clamp(Math.round(value), 0, 100);

    return (
        <div className={styles.scoreRow} ref={ref}>
            <div className={styles.scoreTop}>
                <span className={styles.scoreLabel}>{label}</span>
                <motion.span
                    className={styles.scoreValue}
                    style={{ color }}
                    initial={{ opacity: 0 }}
                    animate={inView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.4, delay: delay + 0.4 }}
                >
                    {pct}%
                </motion.span>
            </div>
            <div className={styles.scoreTrack} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
                <motion.div
                    className={styles.scoreFill}
                    style={{ background: color }}
                    initial={{ width: 0 }}
                    animate={inView ? { width: `${pct}%` } : {}}
                    transition={{ duration: 0.9, delay: delay + 0.15, ease: EASE_OUT_EXPO }}
                />
            </div>
        </div>
    );
}

function Flag({ type, text }) {
    const config = FLAG_CONFIG[type];
    return (
        <div
            className={styles.flag}
            style={{
                background: config.bg,
                borderColor: config.border,
                color: config.text,
            }}
        >
            <span className={styles.flagIcon}>{config.icon}</span>
            <span className={styles.flagText}>{text}</span>
        </div>
    );
}

function SectionCard({ title, tag, children, delay = 0, className = '' }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: '-40px' });

    return (
        <motion.div
            ref={ref}
            className={`${styles.card} ${className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay, ease: EASE_OUT_EXPO }}
        >
            <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{title}</h2>
                {tag && <span className={styles.cardTag}>{tag}</span>}
            </div>
            {children}
        </motion.div>
    );
}

function CopyButton({ result, submission }) {
    const [state, setState] = useState('idle'); // idle | copied | error

    const handleCopy = useCallback(async () => {
        const { grade, label } = scoreToGrade(result.novelty_score);
        const text = [
            `Litmus Analysis — "${submission?.title ?? 'Untitled'}"`,
            '',
            `Grade: ${grade} (${label})`,
            `Novelty score: ${Math.round(result.novelty_score)}%`,
            `Semantic novelty: ${Math.round(result.semantic_novelty * 100)}%`,
            `Keyword freshness: ${Math.round(result.tag_novelty * 100)}%`,
            `Confidence: ${Math.round(result.confidence * 100)}%`,
            '',
            result.explanation,
        ].join('\n');

        try {
            await navigator.clipboard.writeText(text);
            setState('copied');
            setTimeout(() => setState('idle'), 2000);
        } catch {
            setState('error');
            setTimeout(() => setState('idle'), 2000);
        }
    }, [result, submission]);

    return (
        <button
            className={styles.copyBtn}
            onClick={handleCopy}
            aria-label="Copy results to clipboard"
        >
            <AnimatePresence mode="wait" initial={false}>
                {state === 'idle' && (
                    <motion.span key="copy" className={styles.copyInner} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                        <CopyIcon /> Copy results
                    </motion.span>
                )}
                {state === 'copied' && (
                    <motion.span key="done" className={`${styles.copyInner} ${styles.copyDone}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                        <CheckIcon /> Copied
                    </motion.span>
                )}
                {state === 'error' && (
                    <motion.span key="err" className={`${styles.copyInner} ${styles.copyError}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                        Failed
                    </motion.span>
                )}
            </AnimatePresence>
        </button>
    );
}

// ─── Inline SVG icons ─────────────────────────────────────────────────────────

function CopyIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <rect x="4.5" y="4.5" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
            <path d="M2.5 8.5H2A1.5 1.5 0 0 1 .5 7V2A1.5 1.5 0 0 1 2 .5h5A1.5 1.5 0 0 1 8.5 2v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <path d="M2.5 6.5L5.5 9.5L10.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function RefineIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <path d="M6.5 1.5v2M6.5 9.5v2M1.5 6.5h2M9.5 6.5h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="6.5" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
        </svg>
    );
}

// ─── Loading / Error screens ──────────────────────────────────────────────────

function LoadingScreen() {
    return (
        <div className={styles.fullscreen} role="status" aria-live="polite">
            <div className={styles.loadingSpinner} aria-hidden="true" />
            <p className={styles.loadingText}>Analysing your idea…</p>
        </div>
    );
}

function ErrorScreen({ message, onRetry }) {
    return (
        <div className={styles.fullscreen} role="alert">
            <p className={styles.errorMessage}>{message}</p>
            <button className={styles.retryBtn} onClick={onRetry}>
                Try again ↗
            </button>
        </div>
    );
}

// ─── Analysis Page ────────────────────────────────────────────────────────────

export default function AnalysisPage() {
    const router = useRouter();
    const result = useLitmusStore((s) => s.result);
    const resultLoading = useLitmusStore((s) => s.resultLoading);
    const resultError = useLitmusStore((s) => s.resultError);
    const submission = useLitmusStore((s) => s.submission);
    const reset = useLitmusStore((s) => s.reset);

    const titleFull = submission?.title ?? '';
    const titleShort = titleFull.length > 55 ? `${titleFull.slice(0, 55)}…` : titleFull;

    useEffect(() => {
        if (!result && !resultLoading) {
            router.replace('/chat');
        }
    }, [result, resultLoading, router]);

    const handleReset = useCallback(() => {
        reset();
        router.push('/chat');
    }, [reset, router]);

    const handleRefine = useCallback(() => {
        router.push('/chat');
    }, [router]);

    if (resultLoading) return <LoadingScreen />;
    if (resultError) return <ErrorScreen message={resultError} onRetry={() => router.push('/chat')} />;
    if (!result) return null;

    const { grade, label: gradeLabel, color: gradeColor } = scoreToGrade(result.novelty_score);
    const noveltyPct = clamp(Math.round(result.novelty_score), 0, 100);

    const scores = [
        { label: 'Semantic novelty', value: result.semantic_novelty * 100, color: 'var(--score-semantic)' },
        { label: 'Keyword freshness', value: result.tag_novelty * 100, color: 'var(--score-keyword)' },
        { label: 'Confidence', value: result.confidence * 100, color: 'var(--score-confidence)' },
    ];

    const flags = buildFlags(result);
    const hasMatches = result.closest_matches?.length > 0;
    const hasKeywords = result.generated_keywords?.length > 0;
    const hasMatchedTags = result.matched_tags?.length > 0;

    return (
        <div className={styles.root}>
            {/* ── Ambient glow ── */}
            <div className={styles.ambientGlow} aria-hidden="true" style={{ '--glow-color': gradeColor }} />

            {/* ── Navigation ── */}
            <nav className={styles.nav} aria-label="Page navigation">
                <Link href="/" className={styles.navLogo} aria-label="Litmus home">
                    litmus
                </Link>

                <div className={styles.navCenter}>
                    {titleShort && (
                        <span className={styles.navIdea} title={titleFull}>
                            "{titleShort}"
                        </span>
                    )}
                </div>

                <div className={styles.navActions}>
                    <CopyButton result={result} submission={submission} />
                    <button className={styles.refineBtn} onClick={handleRefine} aria-label="Refine this idea">
                        <RefineIcon /> Refine idea
                    </button>
                    <button className={styles.newIdeaBtn} onClick={handleReset} aria-label="Try a different idea">
                        New idea ↗
                    </button>
                </div>
            </nav>

            <main className={styles.main} id="main-content">

                {/* ── Grade Hero ── */}
                <motion.section
                    className={styles.hero}
                    aria-label="Novelty score"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
                >
                    {/* Left — grade circle + meta */}
                    <div className={styles.heroLeft}>
                        <motion.div
                            className={styles.gradeCircle}
                            style={{
                                color: gradeColor,
                                borderColor: `${gradeColor}33`,
                                boxShadow: `0 0 40px ${gradeColor}18`,
                            }}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.1 }}
                            aria-label={`Grade ${grade}`}
                        >
                            {grade}
                        </motion.div>

                        <div className={styles.heroMeta}>
                            <p className={styles.gradeLabel}>Originality grade</p>
                            <motion.h1
                                className={styles.gradeTitle}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.2, ease: EASE_OUT_EXPO }}
                            >
                                {gradeLabel}
                            </motion.h1>
                            <motion.p
                                className={styles.gradeSummary}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.3, ease: EASE_OUT_EXPO }}
                            >
                                {result.explanation}
                            </motion.p>
                        </div>
                    </div>

                    {/* Right — big score + sub-bars */}
                    <div className={styles.heroRight}>
                        <div className={styles.bigScore}>
                            <motion.span
                                className={styles.bigScoreNumber}
                                style={{ color: gradeColor }}
                                initial={{ opacity: 0, scale: 0.7 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.15 }}
                            >
                                {noveltyPct}
                            </motion.span>
                            <span className={styles.bigScoreUnit}>/ 100</span>
                        </div>

                        <div className={styles.scoreBars}>
                            {scores.map((s, i) => (
                                <ScoreBar key={s.label} {...s} delay={i * 0.08} />
                            ))}
                        </div>
                    </div>
                </motion.section>

                {/* ── Grid ── */}
                <div className={styles.grid}>

                    {/* Scan findings — always shown */}
                    <SectionCard
                        title="Scan findings"
                        tag={`${flags.length} item${flags.length !== 1 ? 's' : ''}`}
                        delay={0.05}
                        className={styles.cardFindings}
                    >
                        <div className={styles.flagList} role="list">
                            {flags.map((f, i) => (
                                <motion.div
                                    key={i}
                                    role="listitem"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + i * 0.06, ease: EASE_OUT_EXPO }}
                                >
                                    <Flag {...f} />
                                </motion.div>
                            ))}
                        </div>
                    </SectionCard>

                    {/* Similar projects */}
                    {hasMatches && (
                        <SectionCard
                            title="Similar projects"
                            tag={`${result.closest_matches.length} match${result.closest_matches.length !== 1 ? 'es' : ''}`}
                            delay={0.1}
                        >
                            <ul className={styles.similarList} aria-label="Similar projects">
                                {result.closest_matches.map((p, i) => {
                                    const pct = clamp(Math.round(p.similarity * 100), 0, 100);
                                    const isHigh = pct > 60;
                                    return (
                                        <li key={p.id ?? i} className={styles.similarRow}>
                                            <div className={styles.similarInfo}>
                                                <p className={styles.similarTitle}>{p.title}</p>
                                                {p.department && (
                                                    <p className={styles.similarDept}>{p.department}</p>
                                                )}
                                                {p.tags?.length > 0 && (
                                                    <p className={styles.similarTags}>{p.tags.join(' · ')}</p>
                                                )}
                                            </div>
                                            <span
                                                className={styles.similarPct}
                                                data-high={isHigh}
                                                aria-label={`${pct}% similar`}
                                            >
                                                {pct}%
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </SectionCard>
                    )}

                    {/* Generated keywords */}
                    {hasKeywords && (
                        <SectionCard
                            title="Generated keywords"
                            tag={`${result.generated_keywords.length} term${result.generated_keywords.length !== 1 ? 's' : ''}`}
                            delay={0.15}
                        >
                            <div className={styles.tagCloud} aria-label="Generated keywords">
                                {result.generated_keywords.map((kw, i) => (
                                    <motion.span
                                        key={kw}
                                        className={styles.tag}
                                        initial={{ opacity: 0, scale: 0.88 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.3 + i * 0.03, ease: EASE_OUT_EXPO }}
                                    >
                                        {kw}
                                    </motion.span>
                                ))}
                            </div>
                        </SectionCard>
                    )}

                    {/* Overlapping tags */}
                    {hasMatchedTags && (
                        <SectionCard
                            title="Overlapping tags"
                            tag={`${result.matched_tags.length} risk flag${result.matched_tags.length !== 1 ? 's' : ''}`}
                            delay={0.18}
                        >
                            <div className={styles.tagCloud} aria-label="Overlapping tags">
                                {result.matched_tags.map((tag, i) => (
                                    <motion.span
                                        key={tag}
                                        className={`${styles.tag} ${styles.tagWarn}`}
                                        initial={{ opacity: 0, scale: 0.88 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.3 + i * 0.03, ease: EASE_OUT_EXPO }}
                                    >
                                        {tag}
                                    </motion.span>
                                ))}
                            </div>
                        </SectionCard>
                    )}

                    {/* Empty state when no additional info */}
                    {!hasMatches && !hasKeywords && !hasMatchedTags && (
                        <SectionCard title="Archive scan" delay={0.1}>
                            <p className={styles.emptyState}>
                                No additional data available for this submission.
                            </p>
                        </SectionCard>
                    )}

                </div>
            </main>

            {/* ── Chat Panel ── */}
            <ChatPanel />
        </div>
    );
}