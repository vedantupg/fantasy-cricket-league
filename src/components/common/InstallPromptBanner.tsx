import React, { useEffect, useState } from 'react';

const DISMISSED_KEY = 'fcl-install-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches;
}

/** iOS Share icon SVG (box with arrow pointing up) */
function IosShareIcon(): React.ReactElement {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#00e5ff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'inline', verticalAlign: 'middle', marginBottom: 2 }}
      aria-hidden="true"
    >
      <path d="M8.684 7.316L12 4l3.316 3.316" />
      <line x1="12" y1="4" x2="12" y2="15" />
      <path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7" />
    </svg>
  );
}

/** Step-by-step modal shown when user taps the iOS banner */
function IosInstructionModal({ onClose }: { onClose: () => void }): React.ReactElement {
  const steps = [
    {
      num: 1,
      icon: <IosShareIcon />,
      text: (
        <>
          Tap the <strong style={{ color: '#00e5ff' }}>Share</strong> button{' '}
          <IosShareIcon /> at the bottom of Safari
        </>
      ),
    },
    {
      num: 2,
      icon: null,
      text: (
        <>
          Scroll down and tap{' '}
          <strong style={{ color: '#00e5ff' }}>"Add to Home Screen"</strong>
        </>
      ),
    },
    {
      num: 3,
      icon: null,
      text: (
        <>
          Tap <strong style={{ color: '#00e5ff' }}>"Add"</strong> in the top-right corner to confirm
        </>
      ),
    },
  ];

  return (
    <div style={modalStyles.overlay} role="dialog" aria-modal="true" aria-label="How to add to Home Screen">
      <div style={modalStyles.card}>
        <div style={modalStyles.header}>
          <span style={modalStyles.headerTitle}>Add to Home Screen</span>
          <button style={modalStyles.closeBtn} onClick={onClose} aria-label="Close instructions">
            ✕
          </button>
        </div>
        <p style={modalStyles.subheading}>
          Follow these steps in Safari to install FCL on your Home Screen:
        </p>
        <div style={modalStyles.stepsContainer}>
          {steps.map((step) => (
            <div key={step.num} style={modalStyles.step}>
              <div style={modalStyles.stepCircle}>{step.num}</div>
              <div style={modalStyles.stepText}>{step.text}</div>
            </div>
          ))}
        </div>
        <button style={modalStyles.gotItBtn} onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}

/**
 * Dismissible bottom banner that prompts users to install FCL as a PWA.
 * Handles Android (beforeinstallprompt) and iOS (step-by-step modal) separately.
 */
export default function InstallPromptBanner(): React.ReactElement | null {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    if (isIos()) {
      setShowIosHint(true);
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss(): void {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
    setShowIosModal(false);
  }

  async function handleInstall(): Promise<void> {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setVisible(false);
    setDeferredPrompt(null);
  }

  if (!visible) return null;

  return (
    <>
      {showIosModal && <IosInstructionModal onClose={() => setShowIosModal(false)} />}
      <div
        style={styles.banner}
        role="banner"
        aria-label="Install FCL app"
        onClick={showIosHint ? () => setShowIosModal(true) : undefined}
        tabIndex={showIosHint ? 0 : undefined}
        onKeyDown={showIosHint ? (e) => e.key === 'Enter' && setShowIosModal(true) : undefined}
      >
        <div style={styles.left}>
          <img src="/logo192.png" alt="FCL" style={styles.icon} />
          <div>
            <div style={styles.title}>Add FCL to your Home Screen</div>
            <div style={styles.subtitle}>
              {showIosHint ? 'Tap here for instructions' : 'Tap for quick access'}
            </div>
          </div>
        </div>
        <div style={styles.actions}>
          {showIosHint && (
            <span style={styles.chevron} aria-hidden="true">›</span>
          )}
          {!showIosHint && (
            <button
              style={styles.installBtn}
              onClick={(e) => { e.stopPropagation(); void handleInstall(); }}
            >
              Install
            </button>
          )}
          <button
            style={styles.dismissBtn}
            onClick={(e) => { e.stopPropagation(); dismiss(); }}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  banner: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'linear-gradient(135deg, #0A1929 0%, #003E5C 100%)',
    borderTop: '1px solid rgba(0, 229, 255, 0.25)',
    boxShadow: '0 -4px 24px rgba(0,0,0,0.5)',
    animation: 'slideUp 0.3s ease-out',
    gap: 12,
    cursor: 'pointer',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    flexShrink: 0,
  },
  title: {
    color: '#ffffff',
    fontFamily: "'Satoshi', sans-serif",
    fontWeight: 700,
    fontSize: 14,
    lineHeight: 1.3,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontFamily: "'Satoshi', sans-serif",
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: '#00e5ff',
    lineHeight: 1,
    fontWeight: 300,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  installBtn: {
    background: 'linear-gradient(135deg, #1E88E5, #00e5ff)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    fontFamily: "'Satoshi', sans-serif",
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  dismissBtn: {
    background: 'transparent',
    color: 'rgba(255,255,255,0.5)',
    border: 'none',
    padding: '4px 8px',
    fontSize: 16,
    cursor: 'pointer',
    lineHeight: 1,
  },
};

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 10000,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    background: '#0A1929',
    border: '1px solid rgba(0,229,255,0.15)',
    borderRadius: 16,
    padding: '24px 20px',
    width: '100%',
    maxWidth: 360,
    boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    color: '#ffffff',
    fontFamily: "'Satoshi', sans-serif",
    fontWeight: 700,
    fontSize: 18,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 18,
    cursor: 'pointer',
    padding: '4px 6px',
    lineHeight: 1,
  },
  subheading: {
    color: 'rgba(255,255,255,0.65)',
    fontFamily: "'Satoshi', sans-serif",
    fontSize: 13,
    marginBottom: 20,
    marginTop: 0,
    lineHeight: 1.5,
  },
  stepsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    marginBottom: 24,
  },
  step: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'rgba(0,229,255,0.15)',
    border: '1px solid rgba(0,229,255,0.4)',
    color: '#00e5ff',
    fontFamily: "'Satoshi', sans-serif",
    fontWeight: 700,
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepText: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: "'Satoshi', sans-serif",
    fontSize: 14,
    lineHeight: 1.5,
    paddingTop: 3,
  },
  gotItBtn: {
    width: '100%',
    background: 'linear-gradient(135deg, #1E88E5, #00e5ff)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '12px 0',
    fontFamily: "'Satoshi', sans-serif",
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
  },
};
