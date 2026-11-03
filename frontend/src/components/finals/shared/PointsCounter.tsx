'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from '../Finals.module.css';
import { pointsWord } from './helpers';

interface PointsCounterProps {
  points: number;
  maxPoints: number;
  showMax: boolean;
  href: string;
}

export const PointsCounter = ({ points, maxPoints, showMax, href }: PointsCounterProps) => {
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);

  useEffect(() => {
    const from = shownRef.current;
    const startedAt = performance.now();
    let frame = 0;
    const step = (time: number) => {
      const progress = Math.min(1, (time - startedAt) / 900);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(from + (points - from) * eased);
      shownRef.current = value;
      setShown(value);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [points]);

  return (
    <Link href={href} className={styles.points}>
      <strong>{shown}</strong>
      <span>{pointsWord(shown)}</span>
      {showMax && <small>из {maxPoints} возможных</small>}
    </Link>
  );
};
