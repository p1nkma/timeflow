import { useState, useEffect, useRef } from 'react';
import { Icon, SparklesIcon } from '../../../shared/ui';
import styles from './AIInsightBlock.module.css';

type Period = '7' | '30' | '90';

interface AiReport {
  date: string;
  stats: string;
  summary: string;
  good: string;
  bad: string;
  advice: string;
}

const REPORTS: Record<Period, AiReport> = {
  '7': {
    date: '19 мая 2025',
    stats: '47/58 задач · 3.2 ч/день · пик вт 9–11 · фриланс −8%',
    summary: 'Эта неделя вышла плотной: ты сделал на 12% больше обычного, но ценой вечерних переработок. Учёба и кодинг в порядке, фриланс просел — давай разбираться.',
    good: 'Глубокая работа стабильна: 3.2 ч/день, пик во вторник 9–11 (8 задач). Учёба выросла на 22% — подготовка к коллоквиуму дала результат.',
    bad: 'Фриланс сместился на вечер после 20:00 — твоё наименее эффективное время (−40% к утренним показателям). 5 из 8 фриланс-задач сделаны после 20:00.',
    advice: 'Перенеси фриланс-блоки на утро вторника и четверга, с 9 до 11. Вечером оставь только лёгкое: чтение, план на завтра.',
  },
  '30': {
    date: '19 мая 2025',
    stats: '164/198 задач · 3.5 ч/день · спорт 8/12 · чтение 4.4 ч',
    summary: 'Месяц сильный: +8% задач к прошлому, лучшая неделя — 2-я (49 задач). Учёба растёт, но спорт и чтение уступают плану.',
    good: 'Кодинг и учёба стабильны три недели подряд. Пик продуктивности устойчив: утро вторника и среды дают 35% всех закрытых задач за месяц.',
    bad: 'Спорт выполнен только на 67% (8 из 12 сессий). Чтение — 37% плана (4.4 из 12 ч). Обе категории теряются в конце недели, когда накапливается усталость.',
    advice: 'Перенеси спорт с пятницы на среду. Пятница — твой самый слабый день по энергии, а среда стабильно продуктивна. Это добавит 2–3 сессии в месяц без лишних усилий.',
  },
  '90': {
    date: '19 мая 2025',
    stats: '470/580 задач · 3.3 ч/день · кодинг +65% · спорт −30%',
    summary: 'Лучший квартал за всё время: 102 ч учёбы, кодинг вырос на 65%. Ты выходишь на новый уровень — но спорт и чтение требуют внимания.',
    good: 'Кодинг: с 4 до 6.6 ч/нед за 3 месяца (+65%). Выполнение в срок выросло с 74% до 81%. 470 задач из 580 — личный рекорд по кварталу.',
    bad: 'Спорт снижается 4 недели подряд (−30%, 24 ч вместо плановых 32 ч). Чтение — 36% квартального плана (13 из 36 ч). Классическая картина перегрузки: когда приоритеты растут, тело и отдых уходят первыми.',
    advice: 'Не сокращай частоту спорта — сокращай длительность. 25-минутная тренировка 3 раза в неделю лучше, чем 60-минутная 1 раз. Сохранишь серию без перегрузки.',
  },
};

export function AIInsightBlock({ period }: { period: Period }) {
  const [loading, setLoading]   = useState(false);
  const [askOpen, setAskOpen]   = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer]     = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // сброс ответа и вопроса при смене периода
  useEffect(() => {
    setAnswer(null);
    setQuestion('');
    setAskOpen(false);
  }, [period]);

  function handleAsk() {
    if (!question.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setAnswer(`Демо-режим. В продакшне: ответ Claude на «${question.trim()}»`);
      setLoading(false);
      setQuestion('');
    }, 900);
  }

  function handleAskOpen() {
    setAskOpen(true);
    // фокус после анимации
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const report = REPORTS[period];

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>

        {/* ── статус + сводка ── */}
        <div className={styles.statusBar}>
          <Icon icon={SparklesIcon} size={14} />
          <span className={`t-xs ${styles.statusText}`}>ИИ-анализ · {report.date}</span>
        </div>

        <div className={styles.statsRow}>
          <span className={`t-xs ${styles.statsText}`}>{report.stats}</span>
        </div>

        {/* ── основной контент ── */}
        {loading ? (
          <div className={styles.skeleton}>
            <div className={`skel ${styles.skelLine}`} style={{ '--w': '92%' } as React.CSSProperties} />
            <div className={`skel ${styles.skelLine}`} style={{ '--w': '68%' } as React.CSSProperties} />
            <div className={`skel ${styles.skelLine} ${styles.skelGap}`} style={{ '--w': '80%' } as React.CSSProperties} />
            <div className={`skel ${styles.skelLine}`} style={{ '--w': '55%' } as React.CSSProperties} />
            <div className={`skel ${styles.skelLine} ${styles.skelGap}`} style={{ '--w': '75%' } as React.CSSProperties} />
            <div className={`skel ${styles.skelLine}`} style={{ '--w': '40%' } as React.CSSProperties} />
          </div>
        ) : (
          <>
            <div className={styles.divider} />
            <p className={`t-body ${styles.summary}`}>{report.summary}</p>

            <div className={styles.divider} />

            <div className={styles.section}>
              <span className={`t-xs ${styles.label} ${styles.labelGood}`}>Что пошло хорошо</span>
              <p className={`t-body-md ${styles.text}`}>{report.good}</p>
            </div>

            <div className={styles.divider} />

            <div className={styles.section}>
              <span className={`t-xs ${styles.label} ${styles.labelBad}`}>Что можно улучшить</span>
              <p className={`t-body-md ${styles.text}`}>{report.bad}</p>
            </div>

            <div className={styles.divider} />

            <div className={styles.adviceBox}>
              <div className={styles.adviceHead}>
                <span className={styles.sparkle}>✦</span>
                <span className={`t-xs ${styles.label}`}>Главное на следующую неделю</span>
              </div>
              <p className={`t-body-md ${styles.adviceText}`}>{report.advice}</p>
            </div>

            {answer && (
              <div className={styles.answerBox}>
                <span className={`t-xs ${styles.label}`}>Ответ ИИ</span>
                <p className={`t-body-md ${styles.text}`}>{answer}</p>
              </div>
            )}

            {/* ── вопрос ── */}
            <div className={styles.askArea}>
              {askOpen ? (
                <div className={styles.askInputWrap}>
                  <Icon icon={SparklesIcon} size={14} className={styles.askIcon} />
                  <input
                    ref={inputRef}
                    className={`t-body-md ${styles.askInput}`}
                    placeholder="Задай вопрос об этом периоде…"
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAsk();
                      if (e.key === 'Escape') { setAskOpen(false); setQuestion(''); }
                    }}
                  />
                  {question.trim() && (
                    <button
                      className={styles.askSend}
                      onClick={handleAsk}
                      disabled={loading}
                    >
                      Спросить
                    </button>
                  )}
                </div>
              ) : (
                <button className={styles.askToggle} onClick={handleAskOpen}>
                  <span className={styles.askToggleIcon}>
                    <Icon icon={SparklesIcon} size={14} />
                  </span>
                  <span>Спросить ИИ подробнее</span>
                  <span className={styles.askHint}>↵</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
