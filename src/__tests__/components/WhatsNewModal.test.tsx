// @ts-nocheck
/**
 * Unit Tests: WhatsNewModal — localStorage-driven visibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WhatsNewModal from '../../components/common/WhatsNewModal';
import { CHANGELOG, CURRENT_VERSION } from '../../config/changelog';

const SEEN_VERSION_KEY = 'fcl_seen_version';

describe('WhatsNewModal', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders null when localStorage has the current version already stored', () => {
    localStorage.setItem(SEEN_VERSION_KEY, CURRENT_VERSION);
    render(<WhatsNewModal />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders modal when localStorage has no version stored', () => {
    render(<WhatsNewModal />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders modal when localStorage has an old version stored', () => {
    localStorage.setItem(SEEN_VERSION_KEY, '0.0.1');
    render(<WhatsNewModal />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('clicking "Got it!" sets localStorage to CURRENT_VERSION and hides modal', () => {
    render(<WhatsNewModal />);
    fireEvent.click(screen.getByText('Got it!'));
    expect(localStorage.getItem(SEEN_VERSION_KEY)).toBe(CURRENT_VERSION);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('clicking close button (✕) dismisses modal', () => {
    render(<WhatsNewModal />);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('modal displays feature list from CHANGELOG[0]', () => {
    render(<WhatsNewModal />);
    const latest = CHANGELOG[0];
    for (const feature of latest.features) {
      expect(screen.getByText(feature)).toBeInTheDocument();
    }
  });

  it('modal is accessible (role="dialog", aria-modal, aria-label)', () => {
    render(<WhatsNewModal />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', "What's New");
  });
});
