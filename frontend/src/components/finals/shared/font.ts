import { Montserrat } from 'next/font/google';

// Шрифт из дизайна подключен только для экранов итогового турнира
export const finalsFont = Montserrat({
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '600', '700', '800', '900'],
  display: 'swap',
});
