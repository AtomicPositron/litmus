'use client';

import { useEffect, useState } from 'react';

/**
 * Detects whether the device is likely low-end and whether the user
 * has requested reduced motion. Returns a tier: 'high' | 'low'.
 *
 * Signals used:
 *  - prefers-reduced-motion media query
 *  - navigator.hardwareConcurrency (CPU cores)
 *  - navigator.deviceMemory        (RAM in GB, where supported)
 *  - connection.saveData / effectiveType
 */
export function usePerformanceTier() {
    const [tier, setTier] = useState('high');

    useEffect(() => {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const cores = navigator.hardwareConcurrency ?? 4;
        const memory = navigator.deviceMemory ?? 4; // GB, Chrome only
        const conn = navigator.connection ?? {};
        const savingData = conn.saveData === true;
        const slowNetwork = ['slow-2g', '2g', '3g'].includes(conn.effectiveType);

        const isLow =
            reducedMotion ||
            cores <= 2 ||
            memory <= 2 ||
            savingData ||
            slowNetwork;

        setTier(isLow ? 'low' : 'high');
    }, []);

    return tier;
}