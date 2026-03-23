import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TeamLogo, getTeamLogo } from '../../utils/teamLogos';

describe('teamLogos utils', () => {
  it('returns logo URL for known teams (case-insensitive)', () => {
    expect(getTeamLogo('csk')).toContain('/CSK.png');
    expect(getTeamLogo('MI')).toContain('/MI.png');
  });

  it('returns null for unknown teams', () => {
    expect(getTeamLogo('UNKNOWN_TEAM')).toBeNull();
  });

  it('renders team logo image for known team', () => {
    render(<TeamLogo team="RR" size={30} />);

    const img = screen.getByRole('img', { name: 'RR' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', expect.stringContaining('/RR.png'));
  });

  it('renders nothing for unknown team', () => {
    const { container } = render(<TeamLogo team="UNKNOWN_TEAM" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('hides the image when loading fails', () => {
    render(<TeamLogo team="GT" />);
    const img = screen.getByRole('img', { name: 'GT' });

    fireEvent.error(img);

    expect(img).toHaveStyle({ display: 'none' });
  });
});
