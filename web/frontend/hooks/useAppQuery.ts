import { useAuthenticatedFetch } from './useAuthenticatedFetch';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions } from 'react-query';

type UseAppQueryType<T = unknown> = {
  url: string;
  fetchInit?: RequestInit;
  reactQueryOptions?: Omit<
    UseQueryOptions<T, T, T, string>,
    'queryKey' | 'queryFn'
  >;
};

/**
 * A hook for querying your custom app data.
 * @desc A thin wrapper around useAuthenticatedFetch and react-query's useQuery.
 *
 * @param {Object} options - The options for your query. Accepts 3 keys:
 *
 * 1. url: The URL to query. E.g: /api/widgets/1`
 * 2. fetchInit: The init options for fetch.  See: https://developer.mozilla.org/en-US/docs/Web/API/fetch#parameters
 * 3. reactQueryOptions: The options for `useQuery`. See: https://react-query.tanstack.com/reference/useQuery
 *
 * @returns Return value of useQuery.  See: https://react-query.tanstack.com/reference/useQuery.
 */
export const useAppQuery = <T = unknown>({
  url,
  fetchInit = {},
  reactQueryOptions,
}: UseAppQueryType<T>) => {
  const authenticatedFetch = useAuthenticatedFetch();
  const fetch = useMemo(
    () => async () => {
      const response = await authenticatedFetch(url, fetchInit);
      return response.json();
    },
    [url, JSON.stringify(fetchInit)]
  );

  return useQuery(url, fetch, {
    ...reactQueryOptions,
    refetchOnWindowFocus: false,
  });
};
