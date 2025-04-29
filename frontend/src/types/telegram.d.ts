interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
    };
  };
  ready: () => void;
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}