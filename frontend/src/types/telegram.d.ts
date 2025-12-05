interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      username?: string;
      photo_url?: string;
    };
  };
  ready: () => void;
  // --- ДОБАВЛЯЕМ ЭТО ---
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  // ---------------------
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}