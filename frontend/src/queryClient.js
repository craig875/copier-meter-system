import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Drop cached site-scoped data when the user switches app site. */
export function clearSiteScopedQueries() {
  queryClient.removeQueries({ queryKey: ['makes'] });
  queryClient.removeQueries({ queryKey: ['models'] });
  queryClient.removeQueries({ queryKey: ['model-parts-all'] });
  queryClient.removeQueries({ queryKey: ['machines'] });
  queryClient.removeQueries({ queryKey: ['customers'] });
  queryClient.removeQueries({ queryKey: ['customer'] });
}

/** @deprecated Use clearSiteScopedQueries */
export function clearCatalogQueries() {
  clearSiteScopedQueries();
}
