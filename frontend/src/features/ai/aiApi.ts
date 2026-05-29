import { baseApi } from '../../app/api/baseApi';
import type { TaskOut } from '../tasks/tasksApi';

export interface AiTip {
  tip: string;
  date: string;
}

export interface PlanRequest {
  date: string; // ISO YYYY-MM-DD
  duration_overrides?: Record<string, number>; // task_id → minutes
}

export interface EstimateDurationsRequest {
  task_ids: string[];
}

export interface DurationEstimate {
  task_id: string;
  minutes: number;
  based_on: string;
}

export interface EstimateDurationsResponse {
  estimates: DurationEstimate[];
}

export interface AskRequest {
  question: string;
  days: number;
}

export interface AskResponse {
  answer: string;
}

export interface InsightResponse {
  days: number;
  summary: string;
  good: string;
  bad: string;
  advice: string;
}

export const aiApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getAiTip: builder.query<AiTip, void>({
      query: () => '/ai/tip',
    }),
    generatePlan: builder.mutation<TaskOut[], PlanRequest>({
      query: body => ({ url: '/ai/plan', method: 'POST', body }),
      invalidatesTags: ['Task'],
    }),
    estimateDurations: builder.mutation<EstimateDurationsResponse, EstimateDurationsRequest>({
      query: body => ({ url: '/ai/estimate-durations', method: 'POST', body }),
    }),
    askAnalytics: builder.mutation<AskResponse, AskRequest>({
      query: body => ({ url: '/ai/ask', method: 'POST', body }),
    }),
    getInsight: builder.query<InsightResponse, number>({
      query: days => `/ai/insight?days=${days}`,
    }),
  }),
});

export const {
  useGetAiTipQuery,
  useGeneratePlanMutation,
  useEstimateDurationsMutation,
  useAskAnalyticsMutation,
  useGetInsightQuery,
} = aiApi;
