import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Divider
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

const MatchScheduleViewer: React.FC<MatchScheduleViewerProps> = ({
  matches,
  highlightMatchNumber
}) => {
  const groupedMatches = useMemo(() => groupMatchesByDate(matches), [matches]);

  const renderMatchCard = (match: ScheduleMatch) => {
    const details = formatMatchDetails(match);
    const isHighlighted = match.matchNumber === highlightMatchNumber;
    const isTBC = match.team1 === 'TBC' || match.team2 === 'TBC';

    return (
      <Card
        key={match.matchNumber}
        sx={{
          mb: 2,
          bgcolor: isHighlighted ? alpha(colors.blue.electric, 0.1) : '#1a2332',
          border: isHighlighted ? `2px solid ${colors.blue.electric}` : `1px solid ${colors.border.subtle}`,
          transition: 'all 0.3s ease',
          '&:hover': {
            bgcolor: isHighlighted ? alpha(colors.blue.electric, 0.15) : '#222b3d',
            transform: 'translateY(-2px)',
            boxShadow: isHighlighted ? colors.shadows.blue.md : 2
          }
        }}
      >
        <CardContent>
          {/* Match Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SportsCricket sx={{ color: colors.blue.electric, fontSize: 20 }} />
              <Typography variant="h6" fontWeight={600} fontSize="1rem">
                {details.title}
              </Typography>
            </Box>
            {isHighlighted && (
              <Chip
                label="Powerplay"
                size="small"
                sx={{
                  bgcolor: colors.orange.primary,
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.75rem'
                }}
              />
            )}
            {match.stage && !isHighlighted && (
              <Chip
                label={match.stage}
                size="small"
                sx={{
                  bgcolor: 'rgba(168, 85, 247, 0.2)', // Purple background with transparency
                  color: '#e9d5ff', // Light purple text for better contrast
                  border: '1.5px solid #a855f7', // Solid purple border
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  '&:hover': {
                    bgcolor: 'rgba(168, 85, 247, 0.3)',
                  }
                }}
              />
            )}
          </Box>

          {/* Teams */}
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="h6"
              fontWeight={700}
              fontSize="1.125rem"
              sx={{
                color: isTBC ? colors.text.secondary : colors.text.primary,
                opacity: isTBC ? 0.6 : 1
              }}
            >
              {details.teams}
            </Typography>
          </Box>

          <Divider sx={{ mb: 2, borderColor: colors.border.subtle }} />

          {/* Venue & Time */}
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <LocationOn sx={{ color: colors.grey[400], fontSize: 18, mt: 0.25 }} />
              <Typography variant="body2" color="text.secondary" fontSize="0.875rem">
                {details.venue}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <ScheduleIcon sx={{ color: colors.grey[400], fontSize: 18, mt: 0.25 }} />
              <Typography variant="body2" color="text.secondary" fontSize="0.875rem">
                {details.dateTime}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      {Array.from(groupedMatches.entries()).map(([date, dateMatches]) => (
        <Box key={date} sx={{ mb: 4 }}>
          {/* Date Header */}
          <Typography
            variant="h5"
            fontWeight={700}
            gutterBottom
            sx={{
              fontSize: '1.25rem',
              color: colors.blue.electric,
              mb: 2,
              pb: 1,
              borderBottom: `2px solid ${colors.border.default}`
            }}
          >
            {date}
          </Typography>

          {/* Matches for this date */}
          <Box>
            {dateMatches.map(match => renderMatchCard(match))}
          </Box>
        </Box>
      ))}

      {matches.length === 0 && (
        <Card sx={{ bgcolor: '#1a2332', border: `1px solid ${colors.border.subtle}` }}>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <SportsCricket sx={{ fontSize: 64, color: colors.grey[600], mb: 2 }} />
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
