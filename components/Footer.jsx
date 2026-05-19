'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';

// ─── Typewriter hook ────────────────────────────────────────────────────────────
function useTypewriter(text, speed = 38, startDelay = 400) {
    const [displayed, setDisplayed] = useState('');
    const [done, setDone] = useState(false);
    const ref = useRef(null);
    const started = useRef(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !started.current) {
                    started.current = true;
                    let i = 0;
                    const timeout = setTimeout(() => {
                        const interval = setInterval(() => {
                            i++;
                            setDisplayed(text.slice(0, i));
                            if (i >= text.length) {
                                clearInterval(interval);
                                setDone(true);
                            }
                        }, speed);
                        // store interval id for cleanup
                        ref._interval = interval;
                    }, startDelay);
                    ref._timeout = timeout;
                }
            },
            { threshold: 0.3 }
        );
        const el = ref.current;
        if (el) observer.observe(el);
        return () => {
            observer.disconnect();
            clearTimeout(ref._timeout);
            clearInterval(ref._interval);
        };
    }, [text, speed, startDelay]);

    return { displayed, done, ref };
}

// ─── Counter hook ───────────────────────────────────────────────────────────────
function useCounter(target, duration = 1800) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const started = useRef(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !started.current) {
                    started.current = true;
                    const startTime = performance.now();
                    const tick = (now) => {
                        const progress = Math.min((now - startTime) / duration, 1);
                        const eased = 1 - Math.pow(1 - progress, 4);
                        setCount(Math.round(eased * target));
                        if (progress < 1) requestAnimationFrame(tick);
                    };
                    requestAnimationFrame(tick);
                }
            },
            { threshold: 0.4 }
        );
        const el = ref.current;
        if (el) observer.observe(el);
        return () => observer.disconnect();
    }, [target, duration]);

    return { count, ref };
}

// ─── Animated stat ──────────────────────────────────────────────────────────────
function Stat({ value, suffix = '', label }) {
    const { count, ref } = useCounter(value);
    return (
        <div className={styles.stat} ref={ref}>
            <span className={styles.statNum}>{count.toLocaleString()}{suffix}</span>
            <span className={styles.statLabel}>{label}</span>
        </div>
    );
}

// ─── Radar canvas ───────────────────────────────────────────────────────────────
function RadarCanvas() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;
        let angle = 0;

        const dots = Array.from({ length: 28 }, () => ({
            r: 20 + Math.random() * 78,
            a: Math.random() * Math.PI * 2,
            size: 1 + Math.random() * 2.5,
            alpha: 0,
        }));

        function resize() {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        }
        resize();

        const ro = new ResizeObserver(resize);
        ro.observe(canvas);

        function draw() {
            const { width: W, height: H } = canvas;
            const cx = W / 2, cy = H / 2;
            const maxR = Math.min(W, H) * 0.46;

            ctx.clearRect(0, 0, W, H);

            // Rings
            [0.35, 0.62, 1].forEach((scale) => {
                ctx.beginPath();
                ctx.arc(cx, cy, maxR * scale, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(200, 245, 66, 0.06)';
                ctx.lineWidth = 0.5;
                ctx.stroke();
            });

            // Crosshairs
            ctx.beginPath();
            ctx.moveTo(cx - maxR, cy); ctx.lineTo(cx + maxR, cy);
            ctx.moveTo(cx, cy - maxR); ctx.lineTo(cx, cy + maxR);
            ctx.strokeStyle = 'rgba(200, 245, 66, 0.04)';
            ctx.lineWidth = 0.5;
            ctx.stroke();

            // Sweep wedge
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, maxR, angle - 1.1, angle, false);
            ctx.closePath();
            const sweep = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
            sweep.addColorStop(0, 'rgba(200, 245, 66, 0.14)');
            sweep.addColorStop(1, 'rgba(200, 245, 66, 0.0)');
            ctx.fillStyle = sweep;
            ctx.fill();
            ctx.restore();

            // Sweep line
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
            ctx.strokeStyle = 'rgba(200, 245, 66, 0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Dots
            dots.forEach((dot) => {
                const dx = cx + Math.cos(dot.a) * (dot.r / 100) * maxR;
                const dy = cy + Math.sin(dot.a) * (dot.r / 100) * maxR;
                const dotAngle = (dot.a + Math.PI * 2) % (Math.PI * 2);
                const sweepAngle = (angle + Math.PI * 2) % (Math.PI * 2);
                const diff = (sweepAngle - dotAngle + Math.PI * 2) % (Math.PI * 2);
                if (diff < 0.12) dot.alpha = 1;
                if (dot.alpha > 0) {
                    ctx.beginPath();
                    ctx.arc(dx, dy, dot.size, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(200, 245, 66, ${dot.alpha * 0.9})`;
                    ctx.fill();
                    dot.alpha *= 0.97;
                }
            });

            angle = (angle + 0.012) % (Math.PI * 2);
            animId = requestAnimationFrame(draw);
        }

        draw();
        return () => {
            cancelAnimationFrame(animId);
            ro.disconnect();
        };
    }, []);

    return <canvas ref={canvasRef} className={styles.radar} aria-hidden="true" />;
}

// ─── Magnetic link wrapper ──────────────────────────────────────────────────────
// Fixed: ref goes on the wrapper span, not the Link/a (Next Link doesn't forward refs by default)
function MagLink({ href, children, className, external }) {
    const wrapRef = useRef(null);
    const frameRef = useRef(null);

    const handleMouseMove = useCallback((e) => {
        if (frameRef.current) return;
        frameRef.current = requestAnimationFrame(() => {
            frameRef.current = null;
            const el = wrapRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const dx = e.clientX - (rect.left + rect.width / 2);
            const dy = e.clientY - (rect.top + rect.height / 2);
            el.style.transform = `translate(${dx * 0.22}px, ${dy * 0.22}px)`;
        });
    }, []);

    const handleMouseLeave = useCallback(() => {
        if (frameRef.current) {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
        }
        if (wrapRef.current) wrapRef.current.style.transform = 'translate(0,0)';
    }, []);

    const inner = external
        ? <a href={href} className={className} target="_blank" rel="noopener noreferrer">{children}</a>
        : <Link href={href} className={className}>{children}</Link>;

    return (
        <span
            ref={wrapRef}
            style={{ display: 'inline-block', transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1)' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {inner}
        </span>
    );
}

// ─── Glitching logo ─────────────────────────────────────────────────────────────
function GlitchLogo() {
    const [glitching, setGlitching] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setGlitching(true);
            setTimeout(() => setGlitching(false), 320);
        }, 4200);
        return () => clearInterval(interval);
    }, []);

    return (
        <span
            className={`${styles.navLogo} ${glitching ? styles.glitch : ''}`}
            data-text="litmus"
        >
            litmus
        </span>
    );
}

// ─── Grade ticker ───────────────────────────────────────────────────────────────
const GRADE_STREAM = [
    { id: 'CS-2024-0441', grade: 'A', label: 'Highly original' },
    { id: 'EE-2023-1182', grade: 'C+', label: 'Moderate overlap' },
    { id: 'IT-2024-0093', grade: 'B+', label: 'Good originality' },
    { id: 'ME-2023-0774', grade: 'A−', label: 'Strong concept' },
    { id: 'CS-2024-1340', grade: 'D', label: 'High similarity' },
    { id: 'AI-2024-0289', grade: 'A+', label: 'Novel approach' },
    { id: 'CE-2023-0556', grade: 'B', label: 'Needs refinement' },
];

const GRADE_COLOR = {
    'A+': '#c8f542', 'A': '#c8f542', 'A−': '#a3d63a',
    'B+': '#67e8f9', 'B': '#67e8f9',
    'C+': '#fb923c', 'C': '#fb923c',
    'D': '#ff6b6b', 'F': '#ff6b6b',
};

function GradeTicker() {
    return (
        <div className={styles.gradeTicker} aria-hidden="true">
            <div className={styles.gradeTickerTrack}>
                {[...GRADE_STREAM, ...GRADE_STREAM].map((item, i) => (
                    <div key={i} className={styles.gradeTickerItem}>
                        <span className={styles.gradeTickerGrade} style={{ color: GRADE_COLOR[item.grade] ?? '#888' }}>
                            {item.grade}
                        </span>
                        <span className={styles.gradeTickerDivider}>|</span>
                        <span className={styles.gradeTickerLabel}>{item.label}</span>
                        <span className={styles.gradeTickerId}>{item.id}</span>
                        <span className={styles.gradeTickerDot}>✦</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main Footer ────────────────────────────────────────────────────────────────
export default function Footer() {
    const tagline = 'Validating academic innovation through intelligent similarity analysis.';
    const { displayed, done, ref: taglineRef } = useTypewriter(tagline, 30, 200);

    return (
        <footer className={styles.footer}>

            <GradeTicker />

            <div className={styles.footerContainer}>
                <div className={styles.footerTop}>

                    {/* Brand column */}
                    <div className={styles.footerBrand}>
                        <GlitchLogo />
                        <p className={styles.footerBrandSub} ref={taglineRef}>
                            {displayed}
                            {!done && <span className={styles.cursor}>|</span>}
                        </p>

                        <div className={styles.statsRow}>
                            <Stat value={12400} suffix="+" label="Ideas scanned" />
                            <Stat value={98} suffix="%" label="Accuracy rate" />
                            <Stat value={340} suffix="ms" label="Avg. scan time" />
                        </div>

                        <div className={styles.statusBadge}>
                            <span className={styles.statusDot} />
                            <span>All systems operational</span>
                        </div>
                    </div>

                    {/* Radar */}
                    <div className={styles.radarWrap} aria-hidden="true">
                        <div className={styles.radarLabel}>
                        </div>
                    </div>

                    {/* Nav columns */}
                    <div className={styles.footerNav}>
                        <div className={styles.footerCol}>
                            <p className={styles.footerLabel}>Product</p>
                            <ul className={styles.footerList}>
                                <li><a href="#how">How it works</a></li>
                                <li><a href="#features">Features</a></li>
                                <li><Link href="/chat">Start Scan</Link></li>
                            </ul>
                        </div>
                        <div className={styles.footerCol}>
                            <p className={styles.footerLabel}>Resources</p>
                            <ul className={styles.footerList}>
                                <li><a href="#">Documentation</a></li>
                                <li><a href="#">API Reference</a></li>
                                <li><a href="#">Community</a></li>
                            </ul>
                        </div>
                        <div className={styles.footerCol}>
                            <p className={styles.footerLabel}>Legal</p>
                            <ul className={styles.footerList}>
                                <li><a href="#">Privacy</a></li>
                                <li><a href="#">Terms</a></li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* CTA strip */}
                <div className={styles.ctaStrip}>
                    <div className={styles.ctaStripText}>
                        <span className={styles.ctaStripLabel}>Ready to validate?</span>
                        <span className={styles.ctaStripSub}>Know your score before your supervisor does.</span>
                    </div>
                    <Link href="/chat" className={styles.ctaStripBtn}>
                        <span>Run a free scan</span>
                        <span className={styles.ctaArrow}>↗</span>
                    </Link>
                </div>

                {/* Bottom bar */}
                <div className={styles.footerBottom}>
                    <span className={styles.footerRight}>© 2026 LITMUS — Built for student developers</span>
                    <div className={styles.footerSocials}>
                        <MagLink href="https://github.com" className={styles.footerSocialLink} external>GH</MagLink>
                        <MagLink href="https://twitter.com" className={styles.footerSocialLink} external>TW</MagLink>
                        <MagLink href="https://linkedin.com" className={styles.footerSocialLink} external>LN</MagLink>
                    </div>
                </div>
            </div>
        </footer>
    );
}