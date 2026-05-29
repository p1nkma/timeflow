import { baseApi } from '../../app/api/baseApi';

export interface CategoryOut {
  id: string;
  key: string;
  name: string;
  color: string;
  is_system: boolean;
}

export interface CategoryCreate {
  key: string;
  name: string;
  color: string;
}

export interface CategoryUpdate {
  name?: string;
  color?: string;
}

export const categoriesApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getCategories: builder.query<CategoryOut[], void>({
      query: () => '/categories',
      providesTags: ['Category'],
    }),
    createCategory: builder.mutation<CategoryOut, CategoryCreate>({
      query: body => ({ url: '/categories', method: 'POST', body }),
      invalidatesTags: ['Category'],
    }),
    updateCategory: builder.mutation<CategoryOut, { id: string; data: CategoryUpdate }>({
      query: ({ id, data }) => ({ url: `/categories/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Category'],
    }),
    deleteCategory: builder.mutation<void, string>({
      query: id => ({ url: `/categories/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Category'],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoriesApi;
