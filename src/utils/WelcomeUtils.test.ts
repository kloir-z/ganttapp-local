import { WelcomeUtils } from './WelcomeUtils';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('WelcomeUtils', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('isFirstLogin', () => {
    it('should return true when no welcome flag is stored', () => {
      const result = WelcomeUtils.isFirstLogin();
      expect(result).toBe(true);
    });

    it('should return false when welcome is completed', () => {
      localStorageMock.setItem('gantty_welcome_completed', 'true');
      const result = WelcomeUtils.isFirstLogin();
      expect(result).toBe(false);
    });

    it('should return true when welcome flag is set to false', () => {
      localStorageMock.setItem('gantty_welcome_completed', 'false');
      const result = WelcomeUtils.isFirstLogin();
      expect(result).toBe(true);
    });
  });

  describe('markWelcomeCompleted', () => {
    it('should set welcome flag to true in localStorage', () => {
      WelcomeUtils.markWelcomeCompleted();
      expect(localStorageMock.getItem('gantty_welcome_completed')).toBe('true');
    });

    it('should change isFirstLogin to false after marking completed', () => {
      expect(WelcomeUtils.isFirstLogin()).toBe(true);
      WelcomeUtils.markWelcomeCompleted();
      expect(WelcomeUtils.isFirstLogin()).toBe(false);
    });
  });

  describe('resetWelcomeFlag', () => {
    it('should remove welcome flag from localStorage', () => {
      localStorageMock.setItem('gantty_welcome_completed', 'true');
      WelcomeUtils.resetWelcomeFlag();
      expect(localStorageMock.getItem('gantty_welcome_completed')).toBeNull();
    });

    it('should make isFirstLogin return true after reset', () => {
      WelcomeUtils.markWelcomeCompleted();
      expect(WelcomeUtils.isFirstLogin()).toBe(false);
      WelcomeUtils.resetWelcomeFlag();
      expect(WelcomeUtils.isFirstLogin()).toBe(true);
    });
  });

  describe('getWelcomeStatus', () => {
    it('should return correct status when no flag is stored', () => {
      const status = WelcomeUtils.getWelcomeStatus();
      expect(status).toEqual({
        isFirstLogin: true,
        storageValue: null
      });
    });

    it('should return correct status when welcome is completed', () => {
      localStorageMock.setItem('gantty_welcome_completed', 'true');
      const status = WelcomeUtils.getWelcomeStatus();
      expect(status).toEqual({
        isFirstLogin: false,
        storageValue: 'true'
      });
    });

    it('should return correct status with custom storage value', () => {
      localStorageMock.setItem('gantty_welcome_completed', 'custom');
      const status = WelcomeUtils.getWelcomeStatus();
      expect(status).toEqual({
        isFirstLogin: true,
        storageValue: 'custom'
      });
    });
  });
});