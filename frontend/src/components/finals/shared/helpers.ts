import { Tournament } from '@/types';
import { FinalsStage } from './types';

export const isFinalsTournament = (tournament?: Pick<Tournament, 'type'> | null) =>
  (tournament?.type || '').trim().toUpperCase() === 'FINALS';

// Та же логика, что normalize_name на бэкенде: посев и флаг не влияют на сравнение
export const normalizeName = (name?: string | null) =>
  (name || '')
    .replace(/\s*\(.*?\)/g, '')
    .replace(/[^\p{L}\p{N}_]/gu, '')
    .toLowerCase();

export const samePlayer = (a?: string | null, b?: string | null) => {
  const left = normalizeName(a);
  return Boolean(left) && left === normalizeName(b);
};

export const includesPlayer = (list: string[], name?: string | null) =>
  list.some((item) => samePlayer(item, name));

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  }).format(new Date(value)).replace(' в ', ', ');

export const stageLabel = (stage: FinalsStage) => {
  if (stage.state === 'open' && stage.closes_at) {
    return `Выбор открыт до ${formatDate(stage.closes_at)} МСК`;
  }
  if (stage.state === 'waiting') {
    return stage.opens_at
      ? `Откроется ${formatDate(stage.opens_at)} МСК`
      : 'Этап пока не открыт';
  }
  if (stage.state === 'closed') return 'Прием прогнозов закрыт, ждем результаты';
  return 'Этап завершен';
};

export const pointsWord = (value: number) => {
  const lastTwo = value % 100;
  const last = value % 10;
  if (last === 1 && lastTwo !== 11) return 'очко';
  if (last >= 2 && last <= 4 && (lastTwo < 10 || lastTwo >= 20)) return 'очка';
  return 'очков';
};


// Тег сравниваем без учета регистра и пробелов: 'wta ' тоже считается WTA
export const finalsTag = (tag?: string) => (tag || '').trim().toUpperCase();

const LOGOS: Record<string, string> = {
  WTA: '/images/finals/wta-finals-logo.png',
  ATP: '/images/finals/atp-finals-logo.png',
};

export const finalsLogo = (tag?: string, imageUrl?: string) =>
  LOGOS[finalsTag(tag)] || imageUrl || null;

// Картинка справа на карточке главной: у WTA кубок, у ATP логотип турнира
export const finalsTrophy = (tag?: string, imageUrl?: string) =>
  (finalsTag(tag) === 'WTA' ? '/images/finals/wta-trophie.png' : finalsLogo(tag, imageUrl));

export const championWord = (tag?: string) => (finalsTag(tag) === 'ATP' ? 'чемпиона' : 'чемпионку');
