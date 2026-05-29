import { baseApi } from '../../app/api/baseApi';

export interface AnalyticsSummary {
  days: number;
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  category_breakdown: Record<string, number>; // category_id → minutes
}

export interface DailyEntry {
  date: string;
  total: number;
  completed: number;
}

export interface AnalyticsReport {
  period: 'week' | 'month';
  days: DailyEntry[];
  categories: Record<string, { name: string; color: string }>;
}

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getAnalyticsSummary: builder.query<AnalyticsSummary, number>({
      query: days => `/analytics/summary?days=${days}`,
    }),
    getAnalyticsReport: builder.query<AnalyticsReport, 'week' | 'month'>({
      query: period => `/analytics/report?period=${period}`,
    }),
  }),
});

export const { useGetAnalyticsSummaryQuery, useGetAnalyticsReportQuery } = analyticsApi;
