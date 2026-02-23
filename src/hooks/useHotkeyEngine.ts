import { useCallback, useEffect, useRef } from 'react';

type ClipType = 'Offense' | 'Defense';

interface UseHotkeyEngineProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    onClipCreated: (clipType: ClipType, startTime: number, endTime: number) => void;
    enabled: boolean;
}

interface HotkeyState {
    activeType: ClipType | null;
    startTime: number | null;
    timeoutId: ReturnType<typeof setTimeout> | null;
}

export function useHotkeyEngine({ videoRef, onClipCreated, enabled }: UseHotkeyEngineProps) {
    const stateRef = useRef<HotkeyState>({
        activeType: null,
        startTime: null,
        timeoutId: null,
    });

    // Expose activeType as a callback for UI
    const getActiveType = useCallback((): ClipType | null => {
        return stateRef.current.activeType;
    }, []);

    const stopRecording = useCallback(() => {
        const state = stateRef.current;
        if (state.activeType && state.startTime !== null && videoRef.current) {
            const endTime = videoRef.current.currentTime;
            onClipCreated(state.activeType, state.startTime, endTime);
        }
        if (state.timeoutId) {
            clearTimeout(state.timeoutId);
        }
        stateRef.current = { activeType: null, startTime: null, timeoutId: null };
    }, [onClipCreated, videoRef]);

    const startRecording = useCallback((type: ClipType) => {
        if (!videoRef.current) return;

        const startTime = videoRef.current.currentTime;
        const timeoutId = setTimeout(() => {
            // Auto-stop after 5 seconds
            stopRecording();
            // Force re-render via a dummy state update is handled in parent
            window.dispatchEvent(new CustomEvent('hotkey-state-change'));
        }, 5000);

        stateRef.current = { activeType: type, startTime, timeoutId };
    }, [videoRef, stopRecording]);

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger when typing in inputs
            const target = e.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'SELECT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return;
            }

            const key = e.key.toLowerCase();
            if (key !== 'o' && key !== 'd') return;

            e.preventDefault();
            const state = stateRef.current;
            const pressedType: ClipType = key === 'o' ? 'Offense' : 'Defense';

            if (state.activeType === pressedType) {
                // Toggle off — save the current clip
                stopRecording();
            } else {
                // If recording the OTHER type, auto-stop and save it
                if (state.activeType !== null) {
                    stopRecording();
                }
                // Start recording the new type
                startRecording(pressedType);
            }

            window.dispatchEvent(new CustomEvent('hotkey-state-change'));
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [enabled, startRecording, stopRecording]);

    return { getActiveType, stopRecording };
}
