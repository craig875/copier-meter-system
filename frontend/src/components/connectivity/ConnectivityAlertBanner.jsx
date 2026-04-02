import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { connectivityApi } from '../../services/api';

function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // Audio not supported or blocked
  }
}

export default function ConnectivityAlertBanner({ enabled, branch }) {
  const prevAffectedRef = useRef(null);

  const { data } = useQuery({
    queryKey: ['connectivity', 'summary', branch],
    queryFn: () => connectivityApi.getSummary(branch),
    enabled: !!enabled,
    refetchInterval: 30000,
    staleTime: 0,
    retry: false,
  });

  const down = data?.down ?? 0;
  const dnsFailure = data?.dnsFailure ?? 0;
  const affectedCount = down + dnsFailure;

  useEffect(() => {
    if (data === undefined) return;
    const prev = prevAffectedRef.current;
    prevAffectedRef.current = affectedCount;
    if (prev !== null && prev === 0 && affectedCount > 0) {
      playAlertSound();
    }
  }, [affectedCount, data]);

  if (affectedCount === 0) return null;

  return (
    <div
      className="flex items-center justify-center gap-3 px-4 py-2.5 bg-red-600 text-white text-sm font-medium"
      role="alert"
    >
      <AlertTriangle className="h-5 w-5 flex-shrink-0" aria-hidden />
      <span>
        {affectedCount} link{affectedCount !== 1 ? 's' : ''} down
      </span>
      <Link
        to="/connectivity?status=down"
        className="underline font-semibold hover:no-underline focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-red-600 rounded"
      >
        View Connectivity
      </Link>
    </div>
  );
}
