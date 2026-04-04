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

/**
 * Dismissible bottom banner that prompts users to install FCL as a PWA.
 * Handles Android (beforeinstallprompt) and iOS (instructional nudge) separately.
 */
export default function InstallPromptBanner(): React.ReactElement | null {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
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
    <div style={styles.banner} role="banner" aria-label="Install FCL app">
      <div style={styles.left}>
        <img src="/logo192.png" alt="FCL" style={styles.icon} />
        <div>
          <div style={styles.title}>Add FCL to your Home Screen</div>
          {showIosHint ? (
            <div style={styles.subtitle}>
              Tap&nbsp;
              <span style={styles.shareIcon} aria-label="share">⬆</span>
              &nbsp;then <strong>Add to Home Screen</strong>
            </div>
          ) : (
            <div style={styles.subtitle}>Tap for quick access</div>
          )}
        </div>
      </div>
      <div style={styles.actions}>
        {!showIosHint && (
          <button style={styles.installBtn} onClick={handleInstall}>
            Install
          </button>
        )}
        <button style={styles.dismissBtn} onClick={dismiss} aria-label="Dismiss">
          ✕
        </button>
      </div>
    </div>
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
  shareIcon: {
    fontSize: 13,
    color: '#00e5ff',
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
