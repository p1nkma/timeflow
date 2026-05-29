import { useState, useEffect, useRef } from 'react';
import { Icon, SparklesIcon } from '../../../shared/ui';
import { useGetAnalyticsSummaryQuery } from '../../../features/analytics/analyticsApi';
import { useAskAnalyticsMutation, useGetInsightQuery } from '../../../features/ai/aiApi';
import styles from './AIInsightBlock.module.css';

type Period = '7' | '30' | '90';

const PERIOD_LABEL: Record<Period, string> = {
  '7':  'следующую неделю',
  '30': 'следующий месяц',
  '90': 'следующий квартал',
};

export function AIInsightBlock({ period }: { period: Period }) {
  const [askOpen, setAskOpen]   = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer]     = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const days = Number(period);
  const { data: summary } = useGetAnalyticsSummaryQuery(days);
  const { data: insight, isLoading: insightLoading, isError } = useGetInsightQuery(days);
  const [askAnalytics, { isLoading: askLoading }] = useAskAnalyticsMutation();

  const statsText = summary
    ? `${summary.completed_tasks}/${summary.total_tasks} задач · ${summary.completion_rate}% выполнено`
    : '…';

  const today = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    setAnswer(null);
    setQuestion('');
    setAskOpen(false);
  }, [period]);

  async function handleAsk() {
    const q = question.trim();
    if (!q) return;
    setAnswer(null);
    try {
      const res = await askAnalytics({ question: q, days }).unwrap();
      setAnswer(res.answer);
      setQuestion('');
    } catch {
      setAnswer('Не удалось получить ответ. Попробуй ещё раз.');
    }
  }

  function handleAskOpen() {
    setAskOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const loading = insightLoading;

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>

        <div className={styles.statusBar}>
          <Icon icon={SparklesIcon} size={14} />
          <span className={`t-xs ${styles.statusText}`}>ИИ-анализ · {today}</span>
        </div>

        <div className={styles.statsRow}>
          <span className={`t-xs ${styles.statsText}`}>{statsText}</span>
        </div>

        {loading ? (
          <div className={styles.skeleton}>
            <div className={`skel ${styles.skelLine}`} style={{ '--w': '92%' } as React.CSSProperties} />
            <div className={`skel ${styles.skelLine}`} style={{ '--w': '68%' } as React.CSSProperties} />
            <div className={`skel ${styles.skelLine} ${styles.skelGap}`} style={{ '--w': '80%' } as React.CSSProperties} />
            <div className={`skel ${styles.skelLine}`} style={{ '--w': '55%' } as React.CSSProperties} />
            <div className={`skel ${styles.skelLine} ${styles.skelGap}`} style={{ '--w': '75%' } as React.CSSProperties} />
            <div className={`skel ${styles.skelLine}`} style={{ '--w': '40%' } as React.CSSProperties} />
          </div>
        ) : isError || !insight ? (
          <div className={styles.skeleton}>
            <p className="t-body muted" style={{ padding: '16px 0' }}>
              Не удалось загрузить анализ. Попробуй позже.
            </p>
          </div>
        ) : (
          <>
            <div className={styles.divider} />
            <p className={`t-body ${styles.summary}`}>{insight.summary}</p>

            {insight.good && (
              <>
                <div className={styles.divider} />
                <div className={styles.section}>
                  <span className={`t-xs ${styles.label} ${styles.labelGood}`}>Что пошло хорошо</span>
                  <p className={`t-body-md ${styles.text}`}>{insight.good}</p>
                </div>
              </>
            )}

            {insight.bad && (
              <>
                <div className={styles.divider} />
                <div className={styles.section}>
                  <span className={`t-xs ${styles.label} ${styles.labelBad}`}>Что можно улучшить</span>
                  <p className={`t-body-md ${styles.text}`}>{insight.bad}</p>
                </div>
              </>
            )}

            {insight.advice && (
              <>
                <div className={styles.divider} />
                <div className={styles.adviceBox}>
                  <div className={styles.adviceHead}>
                    <span className={styles.sparkle}>✦</span>
                    <span className={`t-xs ${styles.label}`}>Главное на {PERIOD_LABEL[period]}</span>
                  </div>
                  <p className={`t-body-md ${styles.adviceText}`}>{insight.advice}</p>
                </div>
              </>
            )}

            {answer && (
              <div className={styles.answerBox}>
                <span className={`t-xs ${styles.label}`}>Ответ ИИ</span>
                <p className={`t-body-md ${styles.text}`}>{answer}</p>
              </div>
            )}

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
                      disabled={askLoading}
                    >
                      {askLoading ? '…' : 'Спросить'}
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
