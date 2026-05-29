import { baseApi } from '../../app/api/baseApi';

export type Role = 'user' | 'admin';
export type Theme = 'light' | 'dark';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  theme: Theme;
  chronotype: 'lark' | 'pigeon' | 'owl';
  work_start: number;
  work_end: number;
  utc_offset: number;
  created_at: string;
}

export interface UserUpdatePayload {
  full_name?: string;
  theme?: Theme;
  chronotype?: 'lark' | 'pigeon' | 'owl';
  work_start?: number;
  work_end?: number;
  utc_offset?: number;
}

export type EnergyZoneKind = 'peak' | 'recovery' | 'trough' | 'dip';

export interface EnergyZone {
  start_min: number;
  end_min: number;
  kind: EnergyZoneKind;
  source: 'chronotype' | 'history';
}

export interface EnergyZonesResponse {
  chronotype: 'lark' | 'pigeon' | 'owl';
  zones: EnergyZone[];
}

export const usersApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getMe: builder.query<User, void>({
      query: () => '/users/me',
      providesTags: ['User'],
    }),
    updateMe: builder.mutation<User, UserUpdatePayload>({
      query: body => ({ url: '/users/me', method: 'PUT', body }),
      invalidatesTags: ['User', 'EnergyZones'],
    }),
    getEnergyZones: builder.query<EnergyZonesResponse, void>({
      query: () => '/me/energy-zones',
      providesTags: ['EnergyZones'],
    }),
  }),
});

export const { useGetMeQuery, useUpdateMeMutation, useGetEnergyZonesQuery } = usersApi;

export function userInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
