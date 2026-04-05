import React, { useEffect, useState } from 'react';
import { CHANGELOG, CURRENT_VERSION } from '../../config/changelog';

const SEEN_VERSION_KEY = 'fcl_seen_version';

const latest = CHANGELOG[0];

/**
 * One-time-per-version modal that announces new features to users.
 * Reads/writes `fcl_seen_version` in localStorage to determine visibility.
 */
export default function WhatsNewModal(): React.ReactElement | null {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(SEEN_VERSION_KEY);
    if (seen !== CURRENT_VERSION) setVisible(true);
  }, []);

  const dismiss = (): void => {
    localStorage.setItem(SEEN_VERSION_KEY, CURRENT_VERSION);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes whatsNewFadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={styles.overlay} role="dialog" aria-modal="true" aria-label="What's New">
        <div style={styles.card}>
          <div style={styles.header}>
            <div>
              <span style={styles.title}>What's New ✨</span>
              <span style={styles.versionBadge}>v{latest.version}</span>
            </div>
            <button style={styles.closeBtn} onClick={dismiss} aria-label="Close">
              ✕
            </button>
          </div>
          <p style={styles.dateLine}>{latest.date}</p>
          <ul style={styles.featureList}>
            {latest.features.map((feature, i) => (
              <li key={i} style={styles.featureItem}>
                <span style={styles.bullet}>▸</span>
                <span style={styles.featureText}>{feature}</span>
              </li>
            ))}
          </ul>
          <button style={styles.gotItBtn} onClick={dismiss}>
            Got it!
          </button>
        </div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 10001,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    background: 'linear-gradient(135deg, #0A1929 0%, #003E5C 100%)',
    border: '1px solid rgba(0,229,255,0.2)',
    borderRadius: 16,
    padding: '24px 20px',
    width: '100%',
    maxWidth: 340,
    boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
    animation: 'whatsNewFadeSlideUp 0.3s ease-out',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    color: '#00e5ff',
    fontFamily: "'Satoshi', sans-serif",
    fontWeight: 700,
    fontSize: 20,
    display: 'block',
  },
  versionBadge: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: "'Satoshi', sans-serif",
    fontSize: 12,
    fontWeight: 500,
    marginTop: 2,
    display: 'block',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 18,
    cursor: 'pointer',
    padding: '4px 6px',
    lineHeight: 1,
    flexShrink: 0,
  },
  dateLine: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: "'Satoshi', sans-serif",
    fontSize: 12,
    marginTop: 0,
    marginBottom: 20,
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 24px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  featureItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },
  bullet: {
    color: '#00e5ff',
    fontFamily: "'Satoshi', sans-serif",
    fontWeight: 700,
    fontSize: 14,
    flexShrink: 0,
    lineHeight: 1.5,
  },
  featureText: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: "'Satoshi', sans-serif",
    fontSize: 14,
    lineHeight: 1.5,
  },
  gotItBtn: {
    width: '100%',
    background: '#00e5ff',
    color: '#060D17',
    border: 'none',
    borderRadius: 10,
    padding: '12px 0',
    fontFamily: "'Satoshi', sans-serif",
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
  },
};
