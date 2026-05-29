import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { getToken, clearToken } from '../../features/auth/token';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: headers => {
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

const baseQueryWithAuth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401) {
    clearToken();
    // Редирект на login — но не если уже там и не в TMA (там своя авторизация через initData)
    const path = window.location.pathname;
    const isTma = path.startsWith('/tma') || window.location.search.includes('tgWebAppData');
    if (!isTma && path !== '/login' && path !== '/register') {
      window.location.assign('/login');
    }
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Task', 'InboxItem', 'PlannerSettings', 'User', 'Category', 'EnergyZones'],
  endpoints: () => ({}),
});
