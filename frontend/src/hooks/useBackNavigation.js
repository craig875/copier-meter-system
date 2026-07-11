import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { resolveBackTargetForLocation } from '../utils/navigationFrom';

/**
 * Layout (and any shared back control): go to state.from or route fallback.
 */
export function useBackNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const backTo = resolveBackTargetForLocation(location);

  const goBack = useCallback(() => {
    navigate(backTo);
  }, [navigate, backTo]);

  return { backTo, goBack };
}
