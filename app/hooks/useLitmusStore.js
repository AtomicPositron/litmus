'use client';

import { create } from 'zustand';

// ─── Score → Letter Grade ──────────────────────────────────────────────────────
export function scoreToGrade(score) {
    if (score >= 81) return { grade: 'A', label: 'Very high originality', color: '#c8f542' };
    if (score >= 61) return { grade: 'B', label: 'High originality', color: '#86efac' };
    if (score >= 41) return { grade: 'C', label: 'Moderate originality', color: '#f5a623' };
    if (score >= 21) return { grade: 'D', label: 'Low originality', color: '#fb923c' };
    return { grade: 'F', label: 'Very low originality', color: '#ff6b6b' };
}

// ─── API base — one place to change when Render URL is ready ──────────────────
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// ─── Zustand Store ────────────────────────────────────────────────────────────
const useLitmusStore = create((set, get) => ({

    // Submission fields
    submission: null,       // { title, description, department, tags }

    // Novelty API result
    result: null,           // full NoveltyResponse
    resultLoading: false,
    resultError: null,

    // Chat panel
    chatOpen: false,
    chatMessages: [],       // [{ role: 'user'|'assistant', text }]
    chatLoading: false,

    // ── submitIdea → calls POST /novelty ───────────────────────────────────────
    submitIdea: async ({ title, description, department = null, tags = [] }) => {
        set({
            submission: { title, description, department, tags },
            resultLoading: true,
            resultError: null,
            result: null,
            chatMessages: [],
        });

        try {
            const res = await fetch(`${API_BASE}/novelty`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, department, tags }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `Server error ${res.status}`);
            }

            const data = await res.json();
            set({ result: data, resultLoading: false });
            return { ok: true };
        } catch (err) {
            set({ resultError: err.message, resultLoading: false });
            return { ok: false, error: err.message };
        }
    },

    // ── setChatOpen ────────────────────────────────────────────────────────────
    setChatOpen: (open) => set({ chatOpen: open }),

    // ── sendChat → calls POST /chat ────────────────────────────────────────────
    sendChat: async (userInput) => {
        const { submission, result, chatMessages } = get();

        set({
            chatMessages: [...chatMessages, { role: 'user', text: userInput }],
            chatLoading: true,
        });

        try {
            const res = await fetch(`${API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: userInput,
                    title: submission?.title ?? null,
                    tags: submission?.tags ?? null,
                    score_or_result: result
                        ? `${result.novelty_score.toFixed(1)} (${result.level})`
                        : null,
                    matches_or_popularity: result
                        ? `${result.closest_matches?.length ?? 0} similar projects found`
                        : null,
                }),
            });

            if (!res.ok) throw new Error(`Chat error ${res.status}`);
            const data = await res.json();

            set((s) => ({
                chatMessages: [...s.chatMessages, { role: 'assistant', text: data.response }],
                chatLoading: false,
            }));
        } catch (err) {
            set((s) => ({
                chatMessages: [
                    ...s.chatMessages,
                    { role: 'assistant', text: `⚠ ${err.message}` },
                ],
                chatLoading: false,
            }));
        }
    },

    // ── reset ──────────────────────────────────────────────────────────────────
    reset: () =>
        set({
            submission: null,
            result: null,
            resultLoading: false,
            resultError: null,
            chatOpen: false,
            chatMessages: [],
            chatLoading: false,
        }),
}));

export default useLitmusStore;