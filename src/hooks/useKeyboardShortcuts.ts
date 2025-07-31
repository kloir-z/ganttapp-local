import { useEffect } from 'react';

interface ShortcutConfig {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    callback: () => void;
}

export const useKeyboardShortcuts = (shortcuts: ShortcutConfig[]) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            shortcuts.forEach(({ key, ctrlKey = false, shiftKey = false, altKey = false, callback }) => {
                if (
                    event.key === key &&
                    event.ctrlKey === ctrlKey &&
                    event.shiftKey === shiftKey &&
                    event.altKey === altKey
                ) {
                    event.preventDefault();
                    callback();
                }
            });
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [shortcuts]);
};