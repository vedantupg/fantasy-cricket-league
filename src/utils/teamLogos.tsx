/**
 * IPL team logo CDN URLs.
 * Source: IPL official scores CDN (stable, used in production).
 * Format: PNG, ~80x80px, transparent background.
 */

import React from 'react';
import { Box } from '@mui/material';

export const IPL_TEAM_LOGOS: Record<string, string> = {
  CSK:  'https://scores.iplt20.com/ipl/teamlogos/CSK.png',
  MI:   'https://scores.iplt20.com/ipl/teamlogos/MI.png',
  RCB:  'https://scores.iplt20.com/ipl/teamlogos/RCB.png',
  KKR:  'https://scores.iplt20.com/ipl/teamlogos/KKR.png',
  DC:   'https://scores.iplt20.com/ipl/teamlogos/DC.png',
  RR:   'https://scores.iplt20.com/ipl/teamlogos/RR.png',
  PBKS: 'https://scores.iplt20.com/ipl/teamlogos/PBKS.png',
  GT:   'https://scores.iplt20.com/ipl/teamlogos/GT.png',
  LSG:  'https://scores.iplt20.com/ipl/teamlogos/LSG.png',
  SRH:  'https://scores.iplt20.com/ipl/teamlogos/SRH.png',
  // Aliases
  KXIP: 'https://scores.iplt20.com/ipl/teamlogos/PBKS.png',
  PWI:  'https://scores.iplt20.com/ipl/teamlogos/PBKS.png',
};

/**
 * Returns logo URL for a team abbreviation, or null if unknown.
 * Case-insensitive lookup.
 */
export function getTeamLogo(team: string): string | null {
  return IPL_TEAM_LOGOS[team?.toUpperCase()] ?? null;
}

export interface TeamLogoProps {
  team: string;
  size?: number;
  style?: React.CSSProperties;
}

/**
 * Renders an IPL team logo image. Returns null if the team is unknown.
 * Hides itself gracefully on CDN error via onError handler.
 */
export const TeamLogo: React.FC<TeamLogoProps> = ({ team, size = 24, style }) => {
  const url = getTeamLogo(team);
  if (!url) return null;
  return (
    <Box
      component="img"
      src={url}
      alt={team}
      sx={{
        width: size,
        height: size,
        objectFit: 'contain',
        flexShrink: 0,
        borderRadius: '50%',
        ...style,
      }}
      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
};
