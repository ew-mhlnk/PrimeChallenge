'use client';

import { useCallback, useEffect, useState } from 'react';
import { finalsToast, finalsToastError } from '../shared/toast';
import { FinalsData, FinalsSavePayload } from '../shared/types';

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
