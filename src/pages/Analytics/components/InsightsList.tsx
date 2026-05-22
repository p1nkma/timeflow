import { useState } from 'react';
import { Icon, SparklesIcon } from '../../../shared/ui';
import styles from './InsightsList.module.css';

type Period = '7' | '30' | '90';

interface Insight {
  text: string;
  detail: string;
  positive?: boolean;
}

const INSIGHTS: Record<Period, Insight[]> = {
  '7': [
    { text: 'Учёба: 8.4 ч за неделю (+22% к прошлой)',       detail: 'Лучший день — вторник (2.1 ч). Пик сессий: 09:00–11:00. Продолжай в том же темпе — ты на 22% продуктивнее прошлой недели.',      positive: true  },
    { text: 'Лучший день — вторник: 8 задач',                 detail: 'Вторник стабильно самый продуктивный день. Запланируй сложные задачи на вторник заранее.',                                             positive: true  },
    { text: 'Пик концентрации: 09:00–11:00',                  detail: 'В этот промежуток выполнено 40% задач за неделю. Береги эти часы для глубокой работы — не ставь встречи.',                            positive: true  },
    { text: 'Кодинг: стабильно 3 недели подряд',              detail: 'Ни одного пропуска за 3 недели. Серия продолжается — поддерживай хотя бы 1 сессию кодинга в день.',                                   positive: true  },
    { text: 'Фриланс: 3.2 ч (−8% к прошлой)',                detail: 'Небольшое снижение. Проверь, не вытесняет ли учёба фриланс-задачи — возможно, стоит сдвинуть их на вечер.',                           positive: false },
    { text: 'Чтение: 1.1 ч (цель — 3 ч в неделю)',           detail: 'Ты выполнил только 37% цели по чтению. Попробуй 20 минут чтения перед сном — это даст ~2.3 ч в неделю.',                              positive: false },
  ],
  '30': [
    { text: 'Учёба: 34 ч за месяц (+11% к прошлому)',         detail: 'Стабильный рост второй месяц подряд. Если сохранить темп, за квартал выйдет ~100 ч — личный рекорд.',                                positive: true  },
    { text: 'Самая продуктивная неделя — 2-я: 12 задач/день', detail: 'Неделя 2 выдалась особенно сильной. Проанализируй, что изменилось: режим, нагрузка, отдых — и повтори условия.',                      positive: true  },
    { text: 'Пик концентрации: 09:00–11:00',                  detail: 'Устойчивый паттерн уже второй месяц. Это твоё биологическое окно — защити его от встреч и уведомлений.',                              positive: true  },
    { text: 'Фриланс: 13 ч (−5% к прошлому месяцу)',         detail: 'Небольшое снижение. Если тенденция продолжится, за квартал потеряешь ~2 проекта. Стоит пересмотреть приоритеты.',                      positive: false },
    { text: 'Спорт: 8 сессий за месяц (цель — 12)',           detail: 'Выполнено 67% цели. Чаще всего пропуски в понедельник и пятницу — попробуй перенести тренировки на среду и воскресенье.',              positive: false },
    { text: 'Чтение: 4.4 ч (цель — 12 ч в месяц)',           detail: 'Всего 37% цели. Рекомендация: 30-минутные сессии утром вместо соцсетей дадут +10 ч в месяц.',                                          positive: false },
  ],
  '90': [
    { text: 'Учёба: 102 ч за квартал (+8% к прошлому)',       detail: 'Первый раз перевалил за 100 ч за квартал. Ты вышел на новый уровень — закрепи результат следующим кварталом.',                         positive: true  },
    { text: 'Выполнение в срок: 81% — стабильный рост',       detail: 'Рост с 74% до 81% за квартал. Основной вклад — уменьшение переноса задач на следующий день.',                                          positive: true  },
    { text: 'Кодинг: вырос с 4 до 6.6 ч/нед за 3 месяца',   detail: 'Прирост +65% за квартал. Если сохранишь темп, через полгода выйдешь на уровень junior-специалиста по времени практики.',               positive: true  },
    { text: 'Спорт: тенденция к снижению последние 4 недели', detail: 'Снижение на 30% за месяц. Обычно это сигнал перегрузки. Попробуй сократить продолжительность, но не частоту.',                         positive: false },
    { text: 'Чтение: 13 ч за квартал (цель — 36 ч)',          detail: 'Только 36% цели. Основная причина — вечерний экранный скролл. Попробуй «правило 1 главы» перед сном.',                                 positive: false },
    { text: 'Глубокая работа: −0.4 ч/день в последний месяц', detail: 'Снижение с 3.6 до 3.2 ч/день. Вероятно, растёт количество прерываний. Посмотри на распределение встреч и уведомлений.',              positive: false },
  ],
};

export function InsightsList({ period }: { period: Period }) {
  const items = INSIGHTS[period];
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <Icon icon={SparklesIcon} size={14} />
        <span className="t-h3">Инсайты</span>
        <span className="t-small muted" style={{ marginLeft: 'auto' }}>{items.length} наблюдений</span>
      </div>
      <ul className={styles.list}>
        {items.map((ins, i) => (
          <li
            key={i}
            className={`${styles.item} ${ins.positive ? styles.positive : styles.negative} ${expanded === i ? styles.open : ''}`}
            onClick={() => setExpanded(expanded === i ? null : i)}
            role="button"
            aria-expanded={expanded === i}
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(expanded === i ? null : i); } }}
          >
            <div className={styles.itemHeader}>
              <span className={styles.dot} />
              <span className="t-body-md">{ins.text}</span>
              <span className={styles.chevron}>+</span>
            </div>
            <div className={styles.detailOuter}>
              <p className={`t-small ${styles.detail}`}>{ins.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
