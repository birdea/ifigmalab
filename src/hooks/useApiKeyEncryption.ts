import { useEffect, useState, useCallback } from 'react';
import { useAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import {
    apiKeyAtom,
    isLockedAtom,
    savedEncryptedKeyAtom,
    pinAtom,
    rememberKeyAtom,
    unlockAttemptsAtom,
    lockedUntilAtom
} from '../components/FigmaAgent/atoms';
import { encryptData, decryptData } from '../utils/crypto';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { ENCRYPT_DEBOUNCE_MS, MAX_UNLOCK_ATTEMPTS, LOCKOUT_DURATION_MS } from '../constants/config';
import { reportError } from '../utils/errorReporter';

const LOCAL_STORAGE_KEY_ENC = STORAGE_KEYS.API_KEY_ENCRYPTED;

export function useApiKeyEncryption(onUnlockSuccess?: (apiKey: string) => void) {
    const { t } = useTranslation();
    const [apiKey, setApiKey] = useAtom(apiKeyAtom);
    const [rememberKey, setRememberKey] = useAtom(rememberKeyAtom);
    const [pin, setPin] = useAtom(pinAtom);
    const [savedEncryptedKey, setSavedEncryptedKey] = useAtom(savedEncryptedKeyAtom);
    const [isLocked, setIsLocked] = useAtom(isLockedAtom);
    const [unlockError, setUnlockError] = useState('');

    // Component Mount 시 LocalStorage 암호화 Key 검사
    useEffect(() => {
        if (apiKey || savedEncryptedKey) return;

        const enc = localStorage.getItem(LOCAL_STORAGE_KEY_ENC);
        if (enc) {
            setSavedEncryptedKey(enc);
            setIsLocked(true);
            setRememberKey(true);
        } else {
            // 하위 호환성 유지: 기존 일반 Text 형태의 SessionStorage 조회
            const sessionKey = sessionStorage.getItem(STORAGE_KEYS.API_KEY_SESSION_LEGACY);
            if (sessionKey) {
                sessionStorage.removeItem(STORAGE_KEYS.API_KEY_SESSION_LEGACY); // S-10: 평문 키 즉시 제거
                setApiKey(sessionKey);
                onUnlockSuccess?.(sessionKey);
            }
        }
    }, [apiKey, savedEncryptedKey, setSavedEncryptedKey, setIsLocked, setRememberKey, setApiKey, onUnlockSuccess]);

    // 조건 충족 시 API Key를 암호화하여 로컬에 보관 (300ms debounce로 경쟁 조건 방지)
    useEffect(() => {
        if (isLocked) return;

        let isActive = true;
        const timer = setTimeout(async () => {
            if (!isActive) return;
            if (rememberKey && apiKey && pin.length >= 4) {
                try {
                    let needsSave = true;
                    if (savedEncryptedKey) {
                        try {
                            const decryptedKey = await decryptData(savedEncryptedKey, pin);
                            if (decryptedKey === apiKey) {
                                needsSave = false;
                            }
                        } catch {
                            // 복호화 실패 시 (e.g. PIN 변경)
                        }
                    }

                    if (needsSave && isActive) {
                        const encrypted = await encryptData(apiKey, pin);
                        if (isActive) {
                            localStorage.setItem(LOCAL_STORAGE_KEY_ENC, encrypted);
                            setSavedEncryptedKey(encrypted);
                        }
                    }
                } catch (e) {
                    reportError('Encryption', e);
                }
            } else if (!rememberKey && savedEncryptedKey) {
                if (isActive) {
                    localStorage.removeItem(LOCAL_STORAGE_KEY_ENC);
                    setSavedEncryptedKey('');
                }
            }
        }, ENCRYPT_DEBOUNCE_MS);
        return () => { isActive = false; clearTimeout(timer); };
    }, [rememberKey, apiKey, pin, isLocked, savedEncryptedKey, setSavedEncryptedKey]);

    const [unlockAttempts, setUnlockAttempts] = useAtom(unlockAttemptsAtom);
    const [lockedUntil, setLockedUntil] = useAtom(lockedUntilAtom);

    const handleUnlock = useCallback(async () => {
        if (Date.now() < lockedUntil) {
            const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
            setUnlockError(t('errors.locked_out', { seconds: remaining }));
            return;
        }

        try {
            const decryptedKey = await decryptData(savedEncryptedKey, pin);
            if (!decryptedKey) throw new Error(t('errors.invalid_pin'));

            setApiKey(decryptedKey);
            setIsLocked(false);
            setUnlockError('');
            setUnlockAttempts(0);
            setLockedUntil(0);
            setPin(''); // 복호화 성공 후 PIN 즉시 메모리에서 제거
            onUnlockSuccess?.(decryptedKey);
        } catch {
            const newAttempts = unlockAttempts + 1;
            setUnlockAttempts(newAttempts);

            if (newAttempts >= MAX_UNLOCK_ATTEMPTS) {
                const lockoutTime = Date.now() + LOCKOUT_DURATION_MS;
                setLockedUntil(lockoutTime);
                setUnlockAttempts(0);
                setUnlockError(t('errors.locked_out', { seconds: LOCKOUT_DURATION_MS / 1000 }));
            } else {
                setUnlockError(`${t('errors.invalid_pin')} (${newAttempts}/${MAX_UNLOCK_ATTEMPTS})`);
            }
        }
    }, [savedEncryptedKey, pin, setApiKey, setIsLocked, setPin, onUnlockSuccess, t, unlockAttempts, setUnlockAttempts, lockedUntil, setLockedUntil]);

    const handleResetPin = useCallback(() => {
        localStorage.removeItem(LOCAL_STORAGE_KEY_ENC);
        setSavedEncryptedKey('');
        setPin('');
    }, [setSavedEncryptedKey, setPin]);

    const handleClearSaved = useCallback(() => {
        localStorage.removeItem(LOCAL_STORAGE_KEY_ENC);
        setSavedEncryptedKey('');
        setIsLocked(false);
        setApiKey('');
        setPin('');
        setRememberKey(false);
    }, [setSavedEncryptedKey, setIsLocked, setApiKey, setPin, setRememberKey]);

    return {
        apiKey,
        setApiKey,
        rememberKey,
        setRememberKey,
        pin,
        setPin,
        savedEncryptedKey,
        isLocked,
        unlockError,
        setUnlockError,
        handleUnlock,
        handleResetPin,
        handleClearSaved
    };
}
