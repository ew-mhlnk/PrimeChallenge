import styles from '../Finals.module.css';

const PREDICT = [
  { label: 'Ваш выбор', className: styles.legendPicked },
  { label: 'Не выбрано', className: styles.legendEmpty },
];

const RESULTS = [
  { label: 'Угадано', className: styles.legendCorrect },
  { label: 'Не угадано', className: styles.legendWrong },
  { label: 'Прошел дальше', className: styles.legendAdvanced },
];

export const Legend = ({ results }: { results: boolean }) => (
  <div className={styles.legend}>
    {(results ? RESULTS : PREDICT).map((item) => (
      <span key={item.label} className={styles.legendItem}>
        <i className={item.className} />
        {item.label}
      </span>
    ))}
  </div>
);
