'use client';

import { useCallback, useEffect, useState } from 'react';
import { finalsToast, finalsToastError } from '../shared/toast';
import { FinalsData, FinalsSavePayload } from '../shared/types';

const REFRESH_MS = 60_000;
const MAX_TIMER_MS = 2_000_000_000;

const waitForTelegram = async () => {
  for (let i = 0; i < 20; i++) {
    if (window.Telegram?.WebApp?.initData) return window.Telegram.WebApp.initData;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return '';
};

export function useFinals(tournamentId: string) {
  const [data, setData] = useState<FinalsData | null>(null);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const initData = await waitForTelegram();
    const response = await fetch(`/api/finals/${tournamentId}`, {
      headers: { Authorization: initData },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Server error: ${response.status}`);
    setData(await response.json());
  }, [tournamentId]);

  useEffect(() => {
    load().catch((e) => {
      console.error(e);
      setError(true);
    });
  }, [load]);

  // Держим этап актуальным, пока экран открыт: неудачное обновление ничего не ломает
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') load().catch(console.error);
    };
    const timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [load]);

  // Ровно в момент дедлайна спрашиваем сервер, а не ждем следующего обновления
  useEffect(() => {
    if (!data) return;
    const serverNow = new Date(data.server_now).getTime();
    const delays = [data.group_stage, data.playoff_stage]
      .filter((stage) => stage.state === 'open' && stage.closes_at)
      .map((stage) => new Date(stage.closes_at as string).getTime() - serverNow);
    if (delays.length === 0) return;
    const timer = setTimeout(
      () => load().catch(console.error),
      Math.min(Math.max(0, Math.min(...delays)) + 1000, MAX_TIMER_MS),
    );
    return () => clearTimeout(timer);
  }, [data, load]);

  const save = useCallback(async (payload: FinalsSavePayload) => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      finalsToastError('Ошибка авторизации. Перезагрузка...');
      setTimeout(() => window.location.reload(), 1500);
      return false;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/finals/${tournamentId}/picks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: initData },
        body: JSON.stringify(payload),
      });

      if (response.status === 401 || response.status === 403) {
        finalsToastError('Сессия истекла. Обновляю...');
        setTimeout(() => window.location.reload(), 2000);
        return false;
      }
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        finalsToastError(body?.detail || 'Не удалось сохранить');
        if (response.status === 409) await load();
        return false;
      }

      setData(await response.json());
      finalsToast('Прогноз сохранен');
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      return true;
    } catch (e) {
      console.error(e);
      finalsToastError('Не удалось сохранить');
      return false;
    } finally {
      setSaving(false);
    }
  }, [load, tournamentId]);

  return { data, error, saving, save };
}
