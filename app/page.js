'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, useInView, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import styles from './page.module.css';
import ElectricBorder from '@/components/ElectricBroder';
import Nav from '@/components/Navbar';
import { usePerformanceTier } from '../app/hooks/useperformancetier';
import Footer from '@/components/Footer';
import { h1 } from 'framer-motion/client';

// ─── Static Data ───────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: '01',
    title: 'Paste your idea',
    body: 'Drop in your project title or abstract. Plain text works fine.',
  },
  {
    num: '02',
    title: 'Keyword scan',
    body: 'Litmus extracts core terms and runs them against your school project archive.',
  },
  {
    num: '03',
    title: 'Get a grade',
    body: 'Binary checks and similarity scoring produce an A–F originality grade.',
  },
  {
    num: '04',
    title: 'Generate assets',
    body: 'Get starter code, an intro draft, methodology, and fresh keywords instantly.',
  },
];

const FEATURES = [
  {
    icon: '◎',
    title: 'Originality scanner',
    body: 'Checks your idea against a growing database of past student projects using keyword and binary matching.',
  },
  {
    icon: 'Аᵦ',
    title: 'Letter grade scoring',
    body: 'Translates your similarity score into a clear A–F grade so you know exactly where you stand.',
  },
  {
    icon: '</>',
    title: 'Starter code generation',
    body: 'Auto-generates boilerplate code matched to your project domain and methodology.',
  },
  {
    icon: '≡',
    title: 'Intro & methodology draft',
    body: 'Generates a structured introduction and methodology section you can edit and build on.',
  },
  {
    icon: '#',
    title: 'Fresh keyword suggestions',
    body: 'Recommends unique keywords to help differentiate your work and improve academic searchability.',
  },
  {
    icon: '⬡',
    title: 'AI chat support',
    body: 'Ask follow-up questions about your score, refine your idea, or explore alternative approaches via chat.',
  },
];

// ─── Ticker ────────────────────────────────────────────────────────────────────

const TICKER_ITEMS = [
  'Validate instantly',
  'Check originality',
  'Get graded A–F',
  'Generate starter code',
  'Skip research bottlenecks',
  'Start building sooner',
];

function Ticker() {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={styles.tickerWrap}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={styles.tickerTrack}
        style={{
          animationPlayState: hovered ? 'paused' : 'running',
          animationDuration: hovered ? '10s' : '22s',
        }}
      >
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
          <span key={i} className={styles.tickerItem}>
            {item} <span className={styles.tickerDot}>✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Animated Counter ──────────────────────────────────────────────────────────

function Counter({ target, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target, duration]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}{suffix}
    </span>
  );
}

// ─── Magnetic Tilt Card — throttled on high tier, static on low ───────────────

function MagneticCard({ children, className, tier }) {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const frameRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    if (tier === 'low') return;
    // Throttle to rAF — prevents setState storm on mousemove
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setTilt({ x: y * -8, y: x * 8 });
    });
  }, [tier]);

  const handleMouseLeave = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  }, []);

  if (tier === 'low') {
    return <div ref={ref} className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      animate={{ rotateX: tilt.x, rotateY: tilt.y, scale: isHovered ? 1.025 : 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
    >
      {children}
    </motion.div>
  );
}

// ─── Cursor Spotlight ──────────────────────────────────────────────────────────

function CursorSpotlight({ children, className, tier }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const frameRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    if (tier === 'low') return;
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    });
  }, [tier]);

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => tier === 'high' && setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {visible && tier === 'high' && (
        <div
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            left: pos.x,
            top: pos.y,
            transform: 'translate(-50%, -50%)',
            width: 350,
            height: 350,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(200,245,66,0.08) 0%, transparent 70%)',
            zIndex: 0,
          }}
        />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}

// ─── SplitText — full animation on high tier, simple fade on low ──────────────

function SplitText({ text, className, accent, delay = 0, tier }) {
  // Low tier: single fade-in, no per-char nodes
  if (tier === 'low') {
    return (
      <motion.span
        className={className}
        aria-label={text}
        style={{ display: 'block', color: accent ? 'var(--litmus-accent)' : undefined }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        {text}
      </motion.span>
    );
  }

  const words = text.split(' ');
  return (
    <span className={className} aria-label={text} style={{ display: 'block' }}>
      {words.map((word, wi) => (
        <span key={wi} style={{ display: 'inline-block', marginRight: '0.25em', overflow: 'hidden' }}>
          {word.split('').map((char, ci) => (
            <motion.span
              key={ci}
              style={{ display: 'inline-block', color: accent ? 'var(--litmus-accent)' : undefined }}
              initial={{ y: '110%', opacity: 0 }}
              animate={{ y: '0%', opacity: 1 }}
              transition={{
                duration: 0.55,
                delay: delay + (wi * word.length + ci) * 0.018,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {char}
            </motion.span>
          ))}
        </span>
      ))}
    </span>
  );
}

// ─── Floating Orbs — skipped entirely on low tier ─────────────────────────────

function FloatingOrbs({ tier }) {
  if (tier === 'low') return null;

  // Reduced to 2 orbs on high tier (was 4), no blur filter — use opacity falloff instead
  const orbs = [
    { size: 300, x: '8%', y: '18%', color: 'rgba(200,245,66,0.05)', duration: 8, delay: 0 },
    { size: 180, x: '72%', y: '12%', color: 'rgba(167,139,250,0.05)', duration: 11, delay: 2 },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            left: orb.x,
            top: orb.y,
            width: orb.size,
            height: orb.size,
            borderRadius: '50%',
            // No filter: blur() — replaced with a CSS radial gradient that fades naturally
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            willChange: 'transform',
          }}
          animate={{ y: [0, -24, 0], x: [0, 12, 0] }}
          transition={{ duration: orb.duration, delay: orb.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ─── Scan line — skipped on low tier ──────────────────────────────────────────

function ScanLine({ tier }) {
  if (tier === 'low') return null;
  return (
    <motion.div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(200,245,66,0.4), transparent)',
        pointerEvents: 'none',
        zIndex: 5,
      }}
      animate={{ top: ['0%', '100%'] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
    />
  );
}

// ─── Grade Badge ───────────────────────────────────────────────────────────────

function GradeBadge({ grade = 'B+', delay = 0 }) {
  return (
    <motion.div
      className={styles.gradeBadge}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay }}
    >
      {grade}
    </motion.div>
  );
}

// ─── Hero Preview Card ─────────────────────────────────────────────────────────

function HeroCard({ tier }) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setProgress((p) => {
          if (p >= 100) { clearInterval(interval); setDone(true); return 100; }
          const jitter = Math.random() > 0.92 ? 0 : p + 2;
          return jitter || p + 2;
        });
      }, 30);
      return () => clearInterval(interval);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Only run glitch effect on high-tier devices
  useEffect(() => {
    if (tier === 'low') return;
    const g = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 120);
    }, 5000);
    return () => clearInterval(g);
  }, [tier]);

  return (
    <div
      className={`${styles.heroCard} ${glitch ? styles.heroCardGlitch : ''}`}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      <ScanLine tier={tier} />
      <div className={styles.heroCardBar}>
        <span className={styles.heroCardDot} style={{ background: '#ff5f57' }} />
        <span className={styles.heroCardDot} style={{ background: '#febc2e' }} />
        <span className={styles.heroCardDot} style={{ background: '#28c840' }} />
        <span className={styles.heroCardLabel}>litmus — analysis</span>
      </div>

      <div className={styles.heroCardBody}>
        <p className={styles.heroCardInput}>
          "AI-powered attendance system using facial recognition for university lectures..."
        </p>

        <div className={styles.heroCardScanRow}>
          <span className={styles.heroCardScanText}>Scanning project archive</span>
          <motion.span
            className={styles.heroCardScanDots}
            animate={done ? {} : { opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            {done ? '✓ done' : '...'}
          </motion.span>
        </div>

        <div className={styles.heroCardProgressBar}>
          <motion.div
            className={styles.heroCardProgressFill}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: 'easeOut' }}
          />
          {!done && tier === 'high' && (
            <motion.div
              style={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--litmus-accent)',
                boxShadow: '0 0 8px 3px rgba(200,245,66,0.6)',
              }}
              animate={{ left: `${progress}%` }}
              transition={{ ease: 'easeOut' }}
            />
          )}
        </div>

        {!done && (
          <motion.p
            style={{ fontSize: '0.7rem', color: 'var(--litmus-muted2)', fontFamily: 'monospace', margin: 0 }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            checking {Math.floor(progress * 4.7)} / 470 archived projects...
          </motion.p>
        )}

        {done && (
          <motion.div
            className={styles.heroCardResult}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <GradeBadge grade="B+" delay={0.1} />
            <div>
              <p className={styles.heroCardResultTitle}>Moderate originality detected</p>
              <p className={styles.heroCardResultSub}>5 similar projects · 11 keyword overlaps · 2 binary flags</p>
            </div>
          </motion.div>
        )}

        {done && (
          <motion.div
            className={styles.heroCardBars}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className={styles.heroCardBarRow}>
              <span>Originality score</span>
              <div className={styles.heroCardBarTrack}>
                <motion.div
                  className={styles.heroCardBarFill}
                  style={{ background: 'var(--litmus-accent)' }}
                  initial={{ width: 0 }}
                  animate={{ width: '70%' }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                />
              </div>
              <span>70%</span>
            </div>
            <div className={styles.heroCardBarRow}>
              <span>Research uniqueness</span>
              <div className={styles.heroCardBarTrack}>
                <motion.div
                  className={styles.heroCardBarFill}
                  style={{ background: '#a78bfa' }}
                  initial={{ width: 0 }}
                  animate={{ width: '64%' }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                />
              </div>
              <span>64%</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Fade-in section wrapper ───────────────────────────────────────────────────

function FadeIn({ children, delay = 0, className, tier }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px -10% 0px' });

  // Low tier: no scale transform, just opacity + y
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: tier === 'low' ? 16 : 40, scale: tier === 'low' ? 1 : 0.98 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: tier === 'low' ? 0.4 : 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ─── ScrollSpotlight — y transform removed on low tier ────────────────────────

function ScrollSpotlight({ children, className, tier }) {
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'center center', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.8, 1], [0, 2, 1]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.95, 1, 0.95]);
  const y = useTransform(scrollYProgress, [0, 0.5, 1], [40, 0, -40]);

  // Low tier: only opacity, no scale/y transform
  const motionStyle = tier === 'low'
    ? { opacity }
    : { opacity, scale, y };

  return (
    <motion.div ref={ref} style={motionStyle} className={className}>
      {children}
    </motion.div>
  );
}

// ─── Stats Strip ──────────────────────────────────────────────────────────────

function StatsStrip() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  const stats = [
    { value: 12400, suffix: '+', label: 'Projects validated' },
    { value: 94, suffix: '%', label: 'Accuracy rate' },
    { value: 3, suffix: 's', label: 'Avg. analysis time' },
    { value: 870, suffix: '+', label: 'Universities indexed' },
  ];

  return (
    <div ref={ref} className={styles.statsStrip}>
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          className={styles.statItem}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className={styles.statValue}>
            {inView ? <Counter target={s.value} suffix={s.suffix} /> : `0${s.suffix}`}
          </span>
          <span className={styles.statLabel}>{s.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Step Card ────────────────────────────────────────────────────────────────

function StepCard({ step, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-15% 0px' });

  return (
    <div ref={ref} className={styles.stepCard}>
      <motion.span
        className={styles.stepNum}
        initial={{ opacity: 0, x: -10 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.5, delay: index * 0.1 }}
      >
        {step.num}
      </motion.span>

      <h3 className={styles.stepTitle}>
        {step.title}
        <motion.span
          className={styles.stepTitleLine}
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.5, delay: index * 0.1 + 0.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </h3>

      <motion.p
        className={styles.stepBody}
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
      >
        {step.body}
      </motion.p>

      <motion.div
        className={styles.stepCornerDot}
        initial={{ scale: 0 }}
        animate={inView ? { scale: 1 } : {}}
        transition={{ type: 'spring', stiffness: 300, delay: index * 0.1 + 0.1 }}
      />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const tier = usePerformanceTier();

  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.1, 0.25], [1, 1, 0]);
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  return (
    <div className={styles.root}>

      {/* Scroll progress bar */}
      <motion.div
        style={{
          scaleX,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'var(--litmus-accent)',
          transformOrigin: '0%',
          zIndex: 999,
          boxShadow: tier === 'high' ? '0 0 8px rgba(200,245,66,0.6)' : 'none',
        }}
      />

      <Nav />

      {/* Hero */}
      <div style={{ width: '100%', position: 'relative' }} className={styles.hero}>
        <FloatingOrbs tier={tier} />

        <motion.section style={{ opacity: heroOpacity }} className={styles.heroScreens}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              <SplitText text="Your final-year project idea," delay={0.1} tier={tier} />
              <SplitText
                text="scored before you build."
                accent
                delay={0.3}
                className={styles.heroTitleAccent}
                tier={tier}
              />
            </h1>
            <motion.p
              className={styles.heroSub}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              Paste your idea. Litmus checks it against your school's past projects,
              <br />
              gives you a grade, then generates starter code, methodology,
              <br />
              and keywords to get you moving.
            </motion.p>

            <motion.div
              className={styles.heroCtas}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.85 }}
            >
              <Link href="/chat" className={styles.ctaPrimary}>
                Validate my idea ↗
              </Link>
              <a href="#how" className={styles.ctaSecondary}>
                See an example
              </a>
            </motion.div>
          </div>

          <motion.div
            className={styles.heroCardWrap}
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <HeroCard tier={tier} />
          </motion.div>
        </motion.section>
      </div>

      <StatsStrip />
      <Ticker />

      {/* How it works */}
      <section className={styles.section} id="how">
        <FadeIn tier={tier}>
          <p className={styles.sectionLabel}>HOW IT WORKS</p>
          <h2 className={styles.sectionTitle}>
            From idea to insight <em>in seconds</em>
          </h2>
          <p className={styles.sectionSub}>
            Four steps. No setup. No waiting for a supervisor to tell you if your idea is taken.
          </p>
        </FadeIn>

        <div className={styles.stepsGrid}>
          {STEPS.map((step, i) => (
            <FadeIn key={step.num} delay={i * 0.08} tier={tier}>
              <StepCard step={step} index={i} />
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Features */}
      <ScrollSpotlight tier={tier}>
        <section className={`${styles.section} ${styles.features}`} id="features">
          <p className={styles.sectionLabel}>FEATURES</p>
          <h2 className={styles.sectionTitle}>Everything you need to start right</h2>

          <div className={styles.featuresGrid}>
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.06} tier={tier}>
                <MagneticCard className={styles.featureCard} tier={tier}>
                  <span className={styles.featureIcon}>{f.icon}</span>
                  <h3 className={styles.featureTitle}>{f.title}</h3>
                  <p className={styles.featureBody}>{f.body}</p>
                </MagneticCard>
              </FadeIn>
            ))}
          </div>
        </section>
      </ScrollSpotlight>

      {/* CTA Banner */}
      <FadeIn tier={tier}>
        <ElectricBorder
          color="#98c235"
          speed={0.7}
          chaos={0.11}
          thickness={2}
          style={{ borderRadius: 16, width: '80%' }}
          className={styles.ctaElectric}
        >
          <CursorSpotlight tier={tier}>
            <section className={styles.ctaBanner}>
              <p className={styles.ctaBannerEyebrow}>Stop guessing.</p>
              <h2 className={styles.ctaBannerTitle}>Start building.</h2>
              <p className={styles.ctaBannerSub}>
                Know your originality score before your supervisor does.
              </p>
              <Link href="/chat" className={styles.ctaPrimary}>
                Validate my project ↗
              </Link>
            </section>
          </CursorSpotlight>
        </ElectricBorder>
      </FadeIn>
      <Footer />
    </div>
  );

}