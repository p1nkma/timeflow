import { baseApi } from '../../app/api/baseApi';
import { setToken } from './token';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface TelegramAuthPayload {
  init_data: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    login: builder.mutation<TokenResponse, LoginPayload>({
      query: body => ({ url: '/auth/login', method: 'POST', body }),
      async onQueryStarted(_arg, { queryFulfilled }) {
        const { data } = await queryFulfilled;
        setToken(data.access_token);
      },
    }),
    register: builder.mutation<unknown, RegisterPayload>({
      query: body => ({ url: '/auth/register', method: 'POST', body }),
    }),
    telegramAuth: builder.mutation<TokenResponse, TelegramAuthPayload>({
      query: body => ({ url: '/auth/telegram', method: 'POST', body }),
      async onQueryStarted(_arg, { queryFulfilled }) {
        const { data } = await queryFulfilled;
        setToken(data.access_token);
      },
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation, useTelegramAuthMutation } = authApi;
