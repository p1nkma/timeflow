export { addCategory, removeCategory, updateCategory } from './model/categoriesSlice';
export { default as categoriesReducer } from './model/categoriesSlice';
export {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  type CategoryOut,
} from './categoriesApi';
