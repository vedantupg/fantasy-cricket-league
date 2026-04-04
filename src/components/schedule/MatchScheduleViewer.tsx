import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack
} from '@mui/material';
import {
  SportsCricket,
  LocationOn,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import type { ScheduleMatch } from '../../types/database';
import { groupMatchesByDate, formatMatchDetails } from '../../utils/scheduleParser';
import colors from '../../theme/colors';
import { alpha } from '@mui/material';
import { getTeamColors } from '../../utils/teamLogos';

interface MatchScheduleViewerProps {
  matches: ScheduleMatch[];
  highlightMatchNumber?: number; // Highlight a specific match (e.g., selected powerplay match)
  tournamentName?: string;
}

const cardSx = {
  background: `linear-gradient(145deg, ${alpha(colors.blue.navy, 0.95)} 0%, ${alpha('#0A1929', 0.98)} 100%)`,
  border: `1px solid ${colors.border.default}`,
  borderRadius: 3,
  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  position: 'relative' as const,
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: `linear-gradient(90deg, transparent, ${alpha(colors.blue.electric, 0.6)}, transparent)`,
  },
};

const MatchScheduleViewer: React.FC<MatchScheduleViewerProps> = ({
  matches,
  highlightMatchNumber,
  tournamentName,
}) => {
  const groupedMatches = useMemo(() => groupMatchesByDate(matches), [matches]);

  const renderMatchCard = (match: ScheduleMatch) => {
    const details = formatMatchDetails(match);
    const isHighlighted = match.matchNumber === highlightMatchNumber;
    const isTBC = match.team1 === 'TBC' || match.team2 === 'TBC';

    const isIPL = tournamentName?.toLowerCase().includes('ipl');
    const t1Colors = isIPL && !isTBC ? getTeamColors(match.team1) : null;
    const t2Colors = isIPL && !isTBC ? getTeamColors(match.team2) : null;
    const teamGradientBg = t1Colors && t2Colors
      ? `linear-gradient(90deg,
          ${alpha(t1Colors[0], 0.38)} 0%,
          ${alpha(t1Colors[0], 0.18)} 28%,
          ${alpha('#0A1929', 0.92)} 42%,
          ${alpha('#0A1929', 0.92)} 58%,
          ${alpha(t2Colors[0], 0.18)} 72%,
          ${alpha(t2Colors[0], 0.38)} 100%)`
      : null;

    const highlightedCardSx = isHighlighted
      ? {
          ...cardSx,
          border: `1px solid ${colors.border.strong}`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.3), ${colors.shadows.blue.md}`,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${alpha(colors.blue.electric, 0.8)}, transparent)`,
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '3px',
            height: '100%',
            background: `linear-gradient(180deg, ${colors.orange.primary}, ${colors.orange.dark})`,
            borderRadius: '3px 0 0 3px',
          },
        }
      : cardSx;

    // Split teams for styled "vs" layout
    const teamParts = details.teams.split(' vs ');
    const team1 = teamParts[0] ?? details.teams;
    const team2 = teamParts[1] ?? null;

    return (
      <Card
        key={match.matchNumber}
        sx={{
          mb: 2,
          ...highlightedCardSx,
          ...(teamGradientBg && { background: teamGradientBg }),
          ...(t1Colors && t2Colors && {
            border: `1px solid ${alpha('#ffffff', 0.1)}`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.45),
              -3px 0 18px ${alpha(t1Colors[0], 0.2)},
              3px 0 18px ${alpha(t2Colors[0], 0.2)}`,
          }),
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            ...(t1Colors && t2Colors
              ? {
                  boxShadow: `0 16px 48px rgba(0,0,0,0.55),
                    -6px 0 28px ${alpha(t1Colors[0], 0.35)},
                    6px 0 28px ${alpha(t2Colors[0], 0.35)}`,
                  border: `1px solid ${alpha('#ffffff', 0.16)}`,
                }
              : {
                  boxShadow: isHighlighted
                    ? `0 12px 40px rgba(0,0,0,0.4), ${colors.shadows.blue.lg}`
                    : `0 12px 40px rgba(0,0,0,0.4)`,
                  border: isHighlighted
                    ? `1px solid ${colors.border.strong}`
                    : `1px solid ${alpha(colors.blue.electric, 0.4)}`,
                }),
          },
        }}
      >
        <CardContent sx={{ pl: isHighlighted ? 3 : 2.5 }}>
          {/* Match Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Match number badge */}
              <Chip
                label={`M${match.matchNumber}`}
                size="small"
                sx={{
                  bgcolor: alpha(colors.blue.electric, 0.12),
                  color: colors.blue.light,
                  fontFamily: "'Bebas Neue', 'Satoshi', cursive",
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  height: 22,
                  border: `1px solid ${alpha(colors.blue.electric, 0.25)}`,
                }}
              />
              <Typography variant="h6" fontWeight={700} fontSize="1rem">
                {details.title}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              {isHighlighted && (
                <Chip
                  label="Powerplay"
                  size="small"
                  sx={{
                    bgcolor: alpha(colors.orange.primary, 0.15),
                    color: colors.orange.light,
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    border: `1px solid ${alpha(colors.orange.primary, 0.4)}`,
                  }}
                />
              )}
              {match.stage && (
                <Chip
                  label={match.stage}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(168, 85, 247, 0.2)',
                    color: '#e9d5ff',
                    border: '1.5px solid #a855f7',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    '&:hover': {
                      bgcolor: 'rgba(168, 85, 247, 0.3)',
                    },
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Teams layout */}
          <Box sx={{ mb: 2 }}>
            {team2 && t1Colors && t2Colors ? (
              /* ── IPL Arena Clash Layout ── */
              <Box
                sx={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'stretch',
                  minHeight: 72,
                  borderRadius: 2,
                  overflow: 'hidden',
                  // Hard color border split: left half team1 color, right half team2 color
                  border: `1.5px solid transparent`,
                  backgroundClip: 'padding-box',
                  outline: `1.5px solid transparent`,
                  boxShadow: `inset 0 0 0 1.5px ${alpha('#ffffff', 0.08)},
                    -4px 0 12px ${alpha(t1Colors[0], 0.25)},
                    4px 0 12px ${alpha(t2Colors[0], 0.25)}`,
                }}
              >
                {/* Left panel — team 1 */}
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    px: 2.5,
                    py: 1.5,
                    background: `linear-gradient(110deg, ${alpha(t1Colors[0], 0.52)} 0%, ${alpha(t1Colors[0], 0.28)} 55%, ${alpha(t1Colors[0], 0.06)} 100%)`,
                    position: 'relative',
                    // Top edge accent
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0, left: 0, right: 0,
                      height: '2px',
                      background: `linear-gradient(90deg, ${t1Colors[0]} 0%, ${alpha(t1Colors[0], 0.2)} 100%)`,
                    },
                    // Bottom edge accent
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: 0, left: 0,
                      width: '70%',
                      height: '1.5px',
                      background: `linear-gradient(90deg, ${alpha(t1Colors[0], 0.7)}, transparent)`,
                    },
                  }}
                >
                  <Typography
                    fontWeight={900}
                    sx={{
                      fontSize: { xs: '0.95rem', sm: '1.1rem' },
                      color: '#ffffff',
                      textShadow: `0 0 24px ${alpha(t1Colors[0], 0.9)}, 0 2px 8px rgba(0,0,0,0.8)`,
                      letterSpacing: '-0.01em',
                      lineHeight: 1.2,
                      maxWidth: '88%',
                    }}
                  >
                    {team1}
                  </Typography>
                </Box>

                {/* ── CLASH ZONE ── full-height collision area at centre */}

                {/* Layer 1 — wide colour bleed from each side meeting at centre */}
                <Box sx={{
                  position: 'absolute', left: '50%', top: 0, bottom: 0,
                  width: '110px', transform: 'translateX(-50%)',
                  zIndex: 2,
                  background: `linear-gradient(90deg,
                    transparent 0%,
                    ${alpha(t1Colors[0], 0.18)} 20%,
                    ${alpha(t1Colors[0], 0.32)} 42%,
                    ${alpha(t2Colors[0], 0.32)} 58%,
                    ${alpha(t2Colors[0], 0.18)} 80%,
                    transparent 100%)`,
                }} />

                {/* Layer 2 — angled slash (skewed box) cutting through centre */}
                <Box sx={{
                  position: 'absolute', left: '50%', top: '-10%', bottom: '-10%',
                  width: '28px', transform: 'translateX(-50%) skewX(-12deg)',
                  zIndex: 3,
                  background: `linear-gradient(180deg,
                    ${alpha(t1Colors[0], 0.55)} 0%,
                    ${alpha(t1Colors[0], 0.35)} 30%,
                    ${alpha(t2Colors[0], 0.35)} 70%,
                    ${alpha(t2Colors[0], 0.55)} 100%)`,
                  backdropFilter: 'blur(2px)',
                }} />

                {/* Layer 3 — bright hard seam line down the exact centre */}
                <Box sx={{
                  position: 'absolute', left: '50%', top: 0, bottom: 0,
                  width: '2px', transform: 'translateX(-50%)',
                  zIndex: 4,
                  background: `linear-gradient(180deg,
                    transparent 0%,
                    ${t1Colors[0]} 15%,
                    #ffffff 48%, #ffffff 52%,
                    ${t2Colors[0]} 85%,
                    transparent 100%)`,
                  boxShadow: `0 0 8px 2px ${alpha(t1Colors[0], 0.5)}, 0 0 8px 2px ${alpha(t2Colors[0], 0.5)}`,
                }} />

                {/* Layer 4 — large ambient glow burst at the collision point */}
                <Box sx={{
                  position: 'absolute', left: '50%', top: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 3,
                  width: '140px', height: '140px',
                  borderRadius: '50%',
                  background: `radial-gradient(ellipse at center,
                    ${alpha('#ffffff', 0.07)} 0%,
                    ${alpha(t1Colors[0], 0.18)} 25%,
                    ${alpha(t2Colors[0], 0.18)} 50%,
                    transparent 72%)`,
                  filter: 'blur(8px)',
                  pointerEvents: 'none',
                }} />

                {/* Layer 5 — VS shield */}
                <Box sx={{
                  position: 'absolute', left: '50%', top: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 20,
                  width: 52, height: 52,
                  // Shield shape: flat top, pointed bottom
                  clipPath: 'polygon(8% 0%, 92% 0%, 100% 20%, 100% 65%, 50% 100%, 0% 65%, 0% 20%)',
                  background: `linear-gradient(170deg,
                    ${t1Colors[0]} 0%,
                    ${alpha(t1Colors[0], 0.85)} 30%,
                    #071420 48%,
                    ${alpha(t2Colors[0], 0.85)} 70%,
                    ${t2Colors[0]} 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  // Inner highlight rim
                  '&::before': {
                    content: '""',
                    position: 'absolute', inset: '2px',
                    clipPath: 'polygon(8% 0%, 92% 0%, 100% 20%, 100% 65%, 50% 100%, 0% 65%, 0% 20%)',
                    background: `linear-gradient(170deg, ${alpha('#ffffff', 0.15)} 0%, transparent 60%)`,
                  },
                }}>
                  <Typography sx={{
                    fontFamily: "'Bebas Neue', 'Impact', 'Arial Black', sans-serif",
                    fontWeight: 900,
                    fontSize: '1.05rem',
                    letterSpacing: '0.1em',
                    color: '#ffffff',
                    lineHeight: 1,
                    userSelect: 'none',
                    position: 'relative', zIndex: 1,
                    textShadow: `0 0 12px rgba(255,255,255,0.6), 0 2px 6px rgba(0,0,0,0.95)`,
                    mt: '-4px', // optically centre in the shield
                  }}>
                    VS
                  </Typography>
                </Box>

                {/* Layer 6 — shield outer glow halo */}
                <Box sx={{
                  position: 'absolute', left: '50%', top: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 19,
                  width: 70, height: 70, borderRadius: '50%',
                  background: `radial-gradient(circle,
                    ${alpha('#ffffff', 0.12)} 0%,
                    ${alpha(t1Colors[0], 0.25)} 35%,
                    ${alpha(t2Colors[0], 0.25)} 65%,
                    transparent 100%)`,
                  filter: 'blur(5px)',
                  pointerEvents: 'none',
                }} />

                {/* Right panel — team 2 */}
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    px: 2.5,
                    py: 1.5,
                    background: `linear-gradient(250deg, ${alpha(t2Colors[0], 0.52)} 0%, ${alpha(t2Colors[0], 0.28)} 55%, ${alpha(t2Colors[0], 0.06)} 100%)`,
                    position: 'relative',
                    // Top edge accent
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0, left: 0, right: 0,
                      height: '2px',
                      background: `linear-gradient(270deg, ${t2Colors[0]} 0%, ${alpha(t2Colors[0], 0.2)} 100%)`,
                    },
                    // Bottom edge accent
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: 0, right: 0,
                      width: '70%',
                      height: '1.5px',
                      background: `linear-gradient(270deg, ${alpha(t2Colors[0], 0.7)}, transparent)`,
                    },
                  }}
                >
                  <Typography
                    fontWeight={900}
                    sx={{
                      fontSize: { xs: '0.95rem', sm: '1.1rem' },
                      color: '#ffffff',
                      textShadow: `0 0 24px ${alpha(t2Colors[0], 0.9)}, 0 2px 8px rgba(0,0,0,0.8)`,
                      letterSpacing: '-0.01em',
                      lineHeight: 1.2,
                      textAlign: 'right',
                      maxWidth: '88%',
                    }}
                  >
                    {team2}
                  </Typography>
                </Box>
              </Box>
            ) : team2 ? (
              /* ── Default vs layout (non-IPL or TBC) ── */
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="h6"
                  fontWeight={800}
                  fontSize="1.125rem"
                  sx={{
                    color: isTBC ? alpha(colors.text.secondary, 0.4) : colors.text.primary,
                    fontStyle: isTBC ? 'italic' : 'normal',
                  }}
                >
                  {team1}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: alpha(colors.text.secondary, 0.5), fontWeight: 500, fontSize: '0.8rem', px: 0.25 }}
                >
                  vs
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight={800}
                  fontSize="1.125rem"
                  sx={{
                    color: isTBC ? alpha(colors.text.secondary, 0.4) : colors.text.primary,
                    fontStyle: isTBC ? 'italic' : 'normal',
                  }}
                >
                  {team2}
                </Typography>
              </Box>
            ) : (
              <Typography
                variant="h6"
                fontWeight={800}
                fontSize="1.125rem"
                sx={{
                  color: isTBC ? alpha(colors.text.secondary, 0.4) : colors.text.primary,
                  fontStyle: isTBC ? 'italic' : 'normal',
                }}
              >
                {details.teams}
              </Typography>
            )}
          </Box>

          {/* Venue & Time — subtle background box, blue-tinted icons */}
          <Box
            sx={{
              bgcolor: alpha(colors.blue.electric, 0.04),
              borderRadius: 1.5,
              px: 1.5,
              py: 1,
            }}
          >
            <Stack spacing={0.75}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <LocationOn sx={{ color: alpha(colors.blue.electric, 0.6), fontSize: 18, mt: 0.25 }} />
                <Typography variant="body2" fontSize="0.875rem" sx={{ color: alpha(colors.text.secondary, 0.8) }}>
                  {details.venue}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <ScheduleIcon sx={{ color: alpha(colors.blue.electric, 0.6), fontSize: 18, mt: 0.25 }} />
                <Typography variant="body2" fontSize="0.875rem" sx={{ color: alpha(colors.text.secondary, 0.8) }}>
                  {details.dateTime}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      {Array.from(groupedMatches.entries()).map(([date, dateMatches]) => (
        <Box key={date} sx={{ mb: 4 }}>
          {/* Date Group Header — left-accent bar pattern */}
          <Box
            sx={{
              position: 'relative',
              pl: 2.5,
              py: 1,
              mb: 2,
              '&::before': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                width: '3px',
                height: '70%',
                background: `linear-gradient(180deg, ${colors.blue.electric}, ${colors.blue.light})`,
                borderRadius: '2px',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{
                  fontSize: '1.1rem',
                  background: `linear-gradient(90deg, ${colors.text.primary} 60%, ${colors.blue.light})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {date}
              </Typography>
              <Chip
                label={`${dateMatches.length} match${dateMatches.length !== 1 ? 'es' : ''}`}
                size="small"
                sx={{
                  bgcolor: alpha(colors.blue.electric, 0.12),
                  color: colors.blue.light,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  height: 20,
                  border: `1px solid ${alpha(colors.blue.electric, 0.2)}`,
                }}
              />
            </Box>
          </Box>

          {/* Matches for this date */}
          <Box>
            {dateMatches.map(match => renderMatchCard(match))}
          </Box>
        </Box>
      ))}

      {matches.length === 0 && (
        <Card sx={{ ...cardSx }}>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <SportsCricket sx={{ fontSize: 64, color: colors.blue.electric, mb: 2, opacity: 0.7 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Schedule Available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The match schedule hasn't been uploaded yet.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default MatchScheduleViewer;
