import { useGetAnalyticsSummaryQuery } from '../../../features/analytics/analyticsApi';
import { useGetCategoriesQuery } from '../../../features/categories/categoriesApi';
import { CAT_COLORS } from '../../../shared/utils/categories';
import styles from './CategoryBreakdown.module.css';

type Period = '7' | '30' | '90';

function fmtHours(h: number): string {
  return h % 1 === 0 ? `${h}` : h.toFixed(1).replace('.', ',');
}

export function CategoryBreakdown({ period }: { period: Period }) {
  const days = Number(period);
  const { data: summary, isLoading } = useGetAnalyticsSummaryQuery(days);
  const { data: cats = [] } = useGetCategoriesQuery();

  const catById = new Map(cats.map(c => [c.id, c]));

  const rows = summary
    ? Object.entries(summary.category_breakdown)
        .map(([catId, minutes]) => {
          const cat = catById.get(catId);
          return {
            key:   cat?.key ?? catId,
            name:  cat?.name ?? catId,
            color: CAT_COLORS[cat?.key ?? ''] ?? (cat?.color ?? '#8E96A6'),
            hours: Math.round(minutes / 6) / 10,
          };
        })
        .sort((a, b) => b.hours - a.hours)
    : [];

  const totalHours   = Math.round(rows.reduce((s, d) => s + d.hours, 0) * 10) / 10;
  const maxHours     = rows.length > 0 ? Math.max(...rows.map(d => d.hours)) : 1;
  const periodLabel  = period === '7' ? '7 дней' : period === '30' ? '30 дней' : '90 дней';

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className="t-h3">Время по категориям</span>
        <span className="t-small muted">{fmtHours(totalHours)} ч за {periodLabel}</span>
      </div>

      {isLoading && (
        <div className={styles.bars}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={styles.barRow}>
              <div className={styles.barLeft}>
                <span className={`skel ${styles.dot}`} style={{ background: 'var(--color-bg-tertiary)' }} />
                <span className={`skel t-small ${styles.barLabel}`} style={{ width: 60, height: 14, borderRadius: 4, display: 'inline-block' }} />
              </div>
              <div className={styles.barTrack} style={{ background: 'var(--color-bg-tertiary)' }}>
                <div className={styles.barFill} style={{ width: '100%', transform: `scaleX(${0.3 + i * 0.15})`, background: 'var(--color-bg-elevated)' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && rows.length === 0 && (
        <p className="t-body muted" style={{ padding: '16px 0' }}>Нет данных за этот период</p>
      )}

      {!isLoading && rows.length > 0 && (
        <div className={styles.bars}>
          {rows.map(d => {
            const pct = totalHours > 0 ? Math.round((d.hours / totalHours) * 100) : 0;
            return (
              <div key={d.key} className={styles.barRow}>
                <div className={styles.barLeft}>
                  <span className={styles.dot} style={{ background: d.color }} />
                  <span className={`t-small ${styles.barLabel}`}>{d.name}</span>
                </div>
                <div
                  className={styles.barTrack}
                  style={{ background: `${d.color}18` }}
                >
                  <div
                    className={styles.barFill}
                    style={{
                      width: '100%',
                      transform: `scaleX(${maxHours > 0 ? d.hours / maxHours : 0})`,
                      background: d.color,
                    }}
                  />
                </div>
                <span className={styles.barMeta}>
                  <span className={styles.metaPct}>{pct}%</span>
                  <span className={styles.metaHours}>{fmtHours(d.hours)} ч</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
