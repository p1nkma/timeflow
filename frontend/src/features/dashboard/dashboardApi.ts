import { baseApi } from '../../app/api/baseApi';
import type { TaskOut } from '../tasks/tasksApi';

export interface DashboardSummary {
  total: number;
  completed: number;
  completion_rate: number;
}

export interface DashboardData {
  date: string;
  tasks: TaskOut[];
  summary: DashboardSummary;
  streak: { current: number; longest: number };
}

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getDashboard: builder.query<DashboardData, void>({
      query: () => '/dashboard',
      providesTags: ['Task'],
    }),
  }),
});

export const { useGetDashboardQuery } = dashboardApi;
