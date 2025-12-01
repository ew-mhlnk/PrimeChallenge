'use client';

import { useRouter } from 'next/navigation';
import styles from './Bracket.module.css';

const BackIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>);

// Убрали 'id' из деструктуризации, так как пока не используем
export default function ClosedBracket({ tournamentName }: { id: string, tournamentName: string }) {
  const router = useRouter();
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backArrow}><BackIcon /></button>
        <h2 className={styles.tournamentTitle}>{tournamentName}</h2>
      </div>
      <div className="flex flex-col items-center justify-center h-full text-[#5F6067]">
          <p>Турнир завершен или идет.</p>
          <p>Логика сравнения скоро будет здесь.</p>
      </div>
    </div>
  );
}