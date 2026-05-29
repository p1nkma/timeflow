import { useEffect } from 'react';
import { useAppDispatch } from '../../app/hooks';
import { useGetTasksQuery, useGetInboxQuery, taskOutToTask, inboxOutToInboxItem, buildCatLookup } from './tasksApi';
import { useGetCategoriesQuery } from '../categories/categoriesApi';
import { useGetMeQuery, useUpdateMeMutation } from '../user';
import { setTaskItems } from '.';
import { setInboxItems } from '../inbox';
import { getToken } from '../auth/token';

export function useHydrateTasks() {
  const dispatch  = useAppDispatch();
  const isLoggedIn = !!getToken();

  const { data: cats    = [] } = useGetCategoriesQuery(undefined, { skip: !isLoggedIn });
  const { data: taskOuts = [] } = useGetTasksQuery({}, { skip: !isLoggedIn });
  const { data: inboxOuts = [] } = useGetInboxQuery(undefined, { skip: !isLoggedIn });
  const { data: me } = useGetMeQuery(undefined, { skip: !isLoggedIn });
  const [updateMe] = useUpdateMeMutation();

  // Sync browser timezone offset to backend once after login
  useEffect(() => {
    if (!me) return;
    const browserOffset = -new Date().getTimezoneOffset(); // browser returns negative for east
    if (me.utc_offset !== browserOffset) {
      updateMe({ utc_offset: browserOffset });
    }
  }, [me?.id]); // only on first load per user

  useEffect(() => {
    if (!isLoggedIn) return;
    const lookup = buildCatLookup(cats);
    dispatch(setTaskItems(taskOuts.map(t => taskOutToTask(t, lookup))));
  }, [taskOuts, cats, dispatch, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const lookup = buildCatLookup(cats);
    dispatch(setInboxItems(inboxOuts.map(t => inboxOutToInboxItem(t, lookup))));
  }, [inboxOuts, cats, dispatch, isLoggedIn]);
}
