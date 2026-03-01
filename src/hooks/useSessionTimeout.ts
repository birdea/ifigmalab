import { useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { apiKeyAtom, isLockedAtom, savedEncryptedKeyAtom } from '../components/FigmaAgent/atoms';
import { SESSION_TIMEOUT_MS as DEFAULT_TIMEOUT_MS } from '../constants/config';

const INACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;

/**
 * 비활동 시간이 timeoutMs를 초과하면 API Key를 메모리에서 제거하고 잠금 상태로 전환합니다.
 * savedEncryptedKey가 있는 경우(암호화 저장된 키)에만 동작합니다.
 * @param timeoutMs - 비활동 타임아웃 (기본값: 30분)
 */
export function useSessionTimeout(timeoutMs = DEFAULT_TIMEOUT_MS) {
    const [apiKey, setApiKey] = useAtom(apiKeyAtom);
    const [, setIsLocked] = useAtom(isLockedAtom);
    const [savedEncryptedKey] = useAtom(savedEncryptedKeyAtom);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // 활성화 조건: apiKey가 있고 복호화에 사용할 암호화 키가 저장된 경우
        if (!apiKey || !savedEncryptedKey) return;

        const lock = () => {
            setApiKey('');
            setIsLocked(true);
        };

        const resetTimer = () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(lock, timeoutMs);
        };

        INACTIVITY_EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
        resetTimer();

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            INACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetTimer));
        };
    }, [apiKey, savedEncryptedKey, setApiKey, setIsLocked, timeoutMs]);
}
