'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Tournament } from '@/types';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import styles from './Finals.module.css';
import { finalsFont } from './shared/font';
import { finalsLogo } from './shared/helpers';

export const FinalsCard = ({ tournament }: { tournament: Tournament }) => {
  const { impact } = useHapticFeedback();
  const logo = finalsLogo(tournament.tag, tournament.image_url);

  return (
    <Link href={`/tournament/${tournament.id}`} onClick={() => impact('light')} className="block w-full mb-3">
      <motion.div whileTap={{ scale: 0.98 }} className={`${styles.card} ${finalsFont.className}`} data-tag={tournament.tag}>
        {logo
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={logo} alt={tournament.name} className={styles.cardLogo} />
          : <h3 className={styles.cardTitle}>{tournament.name}</h3>}
        <div className={styles.cardSide}>
          <span className={styles.cardDates}>{tournament.dates || 'Даты уточняются'}</span>
          <span className={styles.cardAction}>Играть</span>
        </div>
      </motion.div>
    </Link>
  );
};
