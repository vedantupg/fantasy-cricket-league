import React, { useEffect, useRef, useState } from 'react';

const THRESHOLD = 64;
const MAX_PULL = 100;
const DAMPING = 0.4;

type Phase = 'idle' | 'pulling' | 'ready';

/**
 * Global pull-to-refresh gesture handler for PWA mobile use.
 * Uses touch events (not native overscroll) since overscroll-behavior: none is set globally.
 * On release past threshold, triggers window.location.reload().
 */
const PullToRefresh: React.FC = () => {
  const pulling = useRef(false);
  const startY = useRef(0);
  const pullDistance = useRef(0);
  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        pulling.current = true;
        startY.current = e.touches[0].clientY;
        pullDistance.current = 0;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current) return;

      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        pulling.current = false;
        setPhase('idle');
        document.body.style.transition = '';
        document.body.style.transform = '';
        return;
      }

      if (e.cancelable) e.preventDefault();

      const clamped = Math.min(delta * DAMPING, MAX_PULL);
      pullDistance.current = clamped;
      document.body.style.transition = 'none';
      document.body.style.transform = `translateY(${clamped}px)`;

      setPhase(clamped >= THRESHOLD * DAMPING ? 'ready' : 'pulling');
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;

      if (pullDistance.current >= THRESHOLD * DAMPING) {
        window.location.reload();
      } else {
        document.body.style.transition = 'transform 0.3s ease';
        document.body.style.transform = '';
        setPhase('idle');
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  if (phase === 'idle') return null;

  return (
    <>
      <style>{`
        @keyframes ptr-spin {
          from { transform: translateX(-50%) rotate(0deg); }
          to   { transform: translateX(-50%) rotate(360deg); }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          pointerEvents: 'none',
        }}
      >
        {/* Rotating arc spinner */}
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          style={{
            animation: phase === 'ready' ? 'ptr-spin 0.7s linear infinite' : undefined,
            transform: phase === 'ready' ? undefined : 'translateX(-50%)',
            left: phase === 'ready' ? undefined : '50%',
            position: phase === 'ready' ? undefined : 'relative',
          }}
        >
          {/* Background track */}
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="#0A1929"
            strokeWidth="3"
          />
          {/* Cyan arc */}
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="#00e5ff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="60 34"
            strokeDashoffset="15"
            transform="rotate(-90 18 18)"
            opacity={phase === 'ready' ? 1 : 0.5}
          />
        </svg>
        {phase === 'ready' && (
          <span
            style={{
              color: '#00e5ff',
              fontSize: 11,
              fontFamily: "'Satoshi', sans-serif",
              fontWeight: 600,
              letterSpacing: '0.05em',
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
            }}
          >
            Refreshing…
          </span>
        )}
      </div>
    </>
  );
};

export default PullToRefresh;
