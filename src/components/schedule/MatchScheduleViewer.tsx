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

interface MatchScheduleViewerProps {
  matches: ScheduleMatch[];
  highlightMatchNumber?: number; // Highlight a specific match (e.g., selected powerplay match)
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
  highlightMatchNumber
}) => {
  const groupedMatches = useMemo(() => groupMatchesByDate(matches), [matches]);

  const renderMatchCard = (match: ScheduleMatch) => {
    const details = formatMatchDetails(match);
    const isHighlighted = match.matchNumber === highlightMatchNumber;
    const isTBC = match.team1 === 'TBC' || match.team2 === 'TBC';

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
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: isHighlighted
              ? `0 12px 40px rgba(0,0,0,0.4), ${colors.shadows.blue.lg}`
              : `0 12px 40px rgba(0,0,0,0.4)`,
            border: isHighlighted
              ? `1px solid ${colors.border.strong}`
              : `1px solid ${alpha(colors.blue.electric, 0.4)}`,
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

          {/* Teams — styled "vs" layout */}
          <Box sx={{ mb: 2 }}>
            {team2 ? (
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
                  sx={{
                    color: alpha(colors.text.secondary, 0.5),
                    fontWeight: 500,
                    fontSize: '0.8rem',
                    px: 0.25,
                  }}
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
