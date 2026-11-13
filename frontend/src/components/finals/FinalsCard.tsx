'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Tournament } from '@/types';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import styles from './Finals.module.css';
import { finalsFont } from './shared/font';
import { finalsTag, finalsTrophy } from './shared/helpers';

export const FinalsCard = ({ tournament }: { tournament: Tournament }) => {
  const { impact } = useHapticFeedback();
  const [trophyFailed, setTrophyFailed] = useState(false);
  const trophy = finalsTrophy(tournament.tag, tournament.image_url);

  return (
    <Link href={`/tournament/${tournament.id}`} onClick={() => impact('light')} className="block w-full mb-3">
      <motion.div whileTap={{ scale: 0.98 }} className={`${styles.card} ${finalsFont.className}`} data-tag={finalsTag(tournament.tag)}>
        <div className={styles.cardText}>
          <h3 className={styles.cardTitle}>{tournament.name}</h3>
          <span className={styles.cardDates}>{tournament.dates || 'Даты уточняются'}</span>
        </div>
        {trophy && !trophyFailed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={trophy} alt="" className={styles.cardTrophy} onError={() => setTrophyFailed(true)} />
        )}
      </motion.div>
    </Link>
  );
};
