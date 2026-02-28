import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { createStore, Provider } from 'jotai';
import { useSessionTimeout } from './useSessionTimeout';
import { apiKeyAtom, isLockedAtom, savedEncryptedKeyAtom } from '../components/FigmaAgent/atoms';

const wrapper = (store: ReturnType<typeof createStore>) =>
    ({ children }: { children: React.ReactNode }) =>
        React.createElement(Provider, { store }, children);

describe('useSessionTimeout', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('does nothing when apiKey is empty', () => {
        const store = createStore();
        store.set(apiKeyAtom, '');
        store.set(savedEncryptedKeyAtom, 'enc-key');

        renderHook(() => useSessionTimeout(1000), { wrapper: wrapper(store) });
        act(() => { jest.advanceTimersByTime(2000); });

        expect(store.get(isLockedAtom)).toBe(false);
        expect(store.get(apiKeyAtom)).toBe('');
    });

    it('does nothing when savedEncryptedKey is empty', () => {
        const store = createStore();
        store.set(apiKeyAtom, 'my-api-key');
        store.set(savedEncryptedKeyAtom, '');

        renderHook(() => useSessionTimeout(1000), { wrapper: wrapper(store) });
        act(() => { jest.advanceTimersByTime(2000); });

        expect(store.get(isLockedAtom)).toBe(false);
        expect(store.get(apiKeyAtom)).toBe('my-api-key');
    });

    it('locks after timeout when both apiKey and savedEncryptedKey are set', () => {
        const store = createStore();
        store.set(apiKeyAtom, 'my-api-key');
        store.set(savedEncryptedKeyAtom, 'enc-key');

        renderHook(() => useSessionTimeout(1000), { wrapper: wrapper(store) });
        act(() => { jest.advanceTimersByTime(1500); });

        expect(store.get(apiKeyAtom)).toBe('');
        expect(store.get(isLockedAtom)).toBe(true);
    });

    it('resets timer on user activity', () => {
        const store = createStore();
        store.set(apiKeyAtom, 'my-api-key');
        store.set(savedEncryptedKeyAtom, 'enc-key');

        renderHook(() => useSessionTimeout(1000), { wrapper: wrapper(store) });

        // Advance 800ms, then simulate activity
        act(() => { jest.advanceTimersByTime(800); });
        act(() => { window.dispatchEvent(new MouseEvent('mousedown')); });

        // Advance another 800ms (total 1600ms but timer was reset)
        act(() => { jest.advanceTimersByTime(800); });

        // Should not be locked yet (activity reset the timer)
        expect(store.get(isLockedAtom)).toBe(false);
    });
});
