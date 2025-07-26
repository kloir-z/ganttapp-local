const WELCOME_STORAGE_KEY = 'gantty_welcome_completed';

export const WelcomeUtils = {
    isFirstLogin(): boolean {
        return localStorage.getItem(WELCOME_STORAGE_KEY) !== 'true';
    },
    markWelcomeCompleted(): void {
        localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
    },
    resetWelcomeFlag(): void {
        localStorage.removeItem(WELCOME_STORAGE_KEY);
    },
    getWelcomeStatus(): { isFirstLogin: boolean; storageValue: string | null } {
        const storageValue = localStorage.getItem(WELCOME_STORAGE_KEY);
        return {
            isFirstLogin: storageValue !== 'true',
            storageValue
        };
    }
};