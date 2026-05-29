import { baseApi } from '../../app/api/baseApi';

export interface TelegramStatus {
  connected: boolean;
  telegram_id?: number;
  notifications_enabled?: boolean;
  connected_at?: string | null;
}

export interface TelegramAuthLink {
  url: string;
  expires_in: number;
}

export interface GoogleStatus {
  connected: boolean;
  expires_at?: string;
}

export const integrationsApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getTelegramStatus: builder.query<TelegramStatus, void>({
      query: () => '/telegram/status',
      providesTags: ['User'],
    }),
    getTelegramAuthLink: builder.query<TelegramAuthLink, void>({
      query: () => '/telegram/auth',
    }),
    setTelegramNotifications: builder.mutation<{ notifications_enabled: boolean }, boolean>({
      query: enabled => ({ url: `/telegram/status?enabled=${enabled}`, method: 'PUT' }),
      invalidatesTags: ['User'],
    }),
    disconnectTelegram: builder.mutation<void, void>({
      query: () => ({ url: '/telegram/status', method: 'DELETE' }),
      invalidatesTags: ['User'],
    }),
    getGoogleStatus: builder.query<GoogleStatus, void>({
      query: () => '/integrations/google/status',
      providesTags: ['User'],
    }),
    getGoogleAuthUrl: builder.query<{ url: string }, void>({
      query: () => '/integrations/google/auth',
    }),
    syncGoogleCalendar: builder.mutation<unknown[], void>({
      query: () => ({ url: '/integrations/google/sync', method: 'POST' }),
      invalidatesTags: ['Task'],
    }),
    disconnectGoogle: builder.mutation<void, void>({
      query: () => ({ url: '/integrations/google/status', method: 'DELETE' }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useGetTelegramStatusQuery,
  useLazyGetTelegramAuthLinkQuery,
  useSetTelegramNotificationsMutation,
  useDisconnectTelegramMutation,
  useGetGoogleStatusQuery,
  useLazyGetGoogleAuthUrlQuery,
  useSyncGoogleCalendarMutation,
  useDisconnectGoogleMutation,
} = integrationsApi;
