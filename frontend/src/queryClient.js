import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Drop cached catalog data when the user switches app site. */
export function clearCatalogQueries() {
  queryClient.removeQueries({ queryKey: ['makes'] });
  queryClient.removeQueries({ queryKey: ['models'] });
  queryClient.removeQueries({ queryKey: ['model-parts-all'] });
}
