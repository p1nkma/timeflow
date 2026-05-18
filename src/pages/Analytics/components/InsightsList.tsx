import styles from './InsightsList.module.css';

const LEFT_INSIGHTS = [
  { icon: '📈', text: 'Учёба выросла на 22% за неделю' },
  { icon: '⚡', text: 'Лучший день — вторник: 8 задач' },
  { icon: '💡', text: 'Пик концентрации с 9 до 11' },
];

const RIGHT_INSIGHTS = [
  { icon: '📉', text: 'Фриланс снизился на 8%' },
  { icon: '🎯', text: 'Кодинг стабилен 3 недели' },
  { icon: '📚', text: 'Чтение нужно увеличить' },
];

function InsightsBlock({ title, items }: { title: string; items: typeof LEFT_INSIGHTS }) {
  return (
    <div className={styles.block}>
      <span className="t-h3">{title}</span>
      <ul className={styles.list}>
        {items.map((ins, i) => (
          <li key={i} className={styles.item}>
            <span className={styles.icon}>{ins.icon}</span>
            <span className="t-body-md">{ins.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InsightsList() {
  return (
    <div className={styles.grid}>
      <InsightsBlock title="Инсайты" items={LEFT_INSIGHTS} />
      <InsightsBlock title="Инсайты" items={RIGHT_INSIGHTS} />
    </div>
  );
}
