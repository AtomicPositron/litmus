import { useEffect, useState } from "react";
import styles from "./GradeDisplay.module.css";

const gradeClass = (g) => {
    if (g.startsWith('A')) return 'grade-a';
    if (g.startsWith('B')) return 'grade-b';
    if (g.startsWith('C')) return 'grade-c';
    return 'grade-f';
};

export default function GradeDisplay({ grade, score }) {
    const [animatedWidth, setAnimatedWidth] = useState(0);

    // Trigger bar animation after mount so the transition actually plays
    useEffect(() => {
        const id = requestAnimationFrame(() => setAnimatedWidth(score));
        return () => cancelAnimationFrame(id);
    }, [score]);

    const cls = gradeClass(grade);

    return (
        <div className="card">
            <div className={styles.flexContainer}>
                <div className={`${styles.largeLetter} ${styles[cls]}`}>
                    {grade}
                </div>
                <div className={styles.scoreDetails}>
                    <h3>Originality Score</h3>
                    <div className={styles.barTrack}>
                        <div
                            className={styles.barFill}
                            style={{
                                width: `${animatedWidth}%`,
                                backgroundColor: `var(--${cls})`,
                            }}
                        />
                    </div>
                    <p className="mono">{score}% Unique</p>
                </div>
            </div>
        </div>
    );
}