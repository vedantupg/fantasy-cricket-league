import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Chip, Skeleton, Stack, Typography, alpha } from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { subscribeLiveScorecard } from '../../services/liveScorecard';
import { TeamLogo } from '../../utils/teamLogos';
import type { LiveScorecardDoc, LiveScorecardMatch } from '../../types/database';
import colors from '../../theme/colors';
import {
  parseMatchMeta,
  formatScoreLine,
  getStatusKind,
  findTeamScore,
  selectForDisplay,
} from '../../utils/liveScorecardDisplay';
import type { StatusKind } from '../../utils/liveScorecardDisplay';

interface LiveScorecardStripProps {
  title?: string;
  sx?: object;
}

const STATUS_COLORS: Record<StatusKind, { fg: string; bg: string; border: string }> = {
  live: { fg: '#22c55e', bg: alpha('#22c55e', 0.14), border: alpha('#22c55e', 0.35) },
  completed: { fg: 'rgba(255,255,255,0.55)', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.14)' },
  upcoming: { fg: '#fb923c', bg: alpha('#fb923c', 0.14), border: alpha('#fb923c', 0.35) },
  cancelled: { fg: '#ef4444', bg: alpha('#ef4444', 0.14), border: alpha('#ef4444', 0.35) },
};

const STATUS_LABEL: Record<StatusKind, string> = {
  live: 'LIVE',
  completed: 'COMPLETED',
  upcoming: 'UPCOMING',
  cancelled: 'CANCELLED',
};

const StatusChip: React.FC<{ kind: StatusKind }> = ({ kind }) => {
  const c = STATUS_COLORS[kind];
  return (
    <Chip
      size="small"
      icon={
        kind === 'live' ? (
          <FiberManualRecordIcon
            sx={{
              fontSize: '10px !important',
              color: c.fg,
              animation: 'liveScorecardPulse 1.2s ease-in-out infinite',
              '@keyframes liveScorecardPulse': {
                '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                '50%': { opacity: 0.35, transform: 'scale(0.85)' },
              },
            }}
          />
        ) : undefined
      }
      label={STATUS_LABEL[kind]}
      sx={{
        height: 22,
        fontSize: '0.68rem',
        fontWeight: 700,
        letterSpacing: '0.08em',
        color: c.fg,
        bgcolor: c.bg,
        border: `1px solid ${c.border}`,
        '& .MuiChip-label': { px: 0.85 },
      }}
    />
  );
};

const MatchCard: React.FC<{ match: LiveScorecardMatch }> = ({ match }) => {
  const kind = getStatusKind(match);
  const team1 = match.teams[0];
  const team2 = match.teams[1];
  const { matchNumber, tournament } = parseMatchMeta(match.name);

  const score1 = team1 ? findTeamScore(match.score, team1.name) : null;
  const score2 = team2 ? findTeamScore(match.score, team2.name) : null;
  const hasAnyScore = match.score.length > 0;

  return (
    <Card sx={cardBaseSx}
    >
      <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
          <StatusChip kind={kind} />
          <Typography
            variant="caption"
            sx={{ color: alpha(colors.text.secondary, 0.6), fontWeight: 700, letterSpacing: '0.06em', fontSize: '0.65rem', visibility: tournament ? 'visible' : 'hidden' }}
          >
            {tournament ?? 'IPL'}
          </Typography>
        </Stack>
        <Typography
          variant="caption"
          sx={{ display: 'block', color: alpha(colors.text.secondary, 0.4), fontSize: '0.62rem', mb: 0.75, letterSpacing: '0.04em', visibility: matchNumber ? 'visible' : 'hidden' }}
        >
          {matchNumber ?? 'Match'}
        </Typography>

        {team1 && (
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 0.75 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, flex: 1 }}>
              <TeamLogo team={team1.name} size={26} />
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: colors.text.primary,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {team1.name}
              </Typography>
            </Stack>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                color: colors.text.primary,
                fontVariantNumeric: 'tabular-nums',
                minWidth: 78,
                textAlign: 'right',
              }}
            >
              {score1 ? formatScoreLine(score1) : hasAnyScore ? '-' : ''}
            </Typography>
          </Stack>
        )}

        {team2 && (
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 0.75 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, flex: 1 }}>
              <TeamLogo team={team2.name} size={26} />
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: colors.text.primary,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {team2.name}
              </Typography>
            </Stack>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                color: colors.text.primary,
                fontVariantNumeric: 'tabular-nums',
                minWidth: 78,
                textAlign: 'right',
              }}
            >
              {score2 ? formatScoreLine(score2) : hasAnyScore ? '-' : ''}
            </Typography>
          </Stack>
        )}

        {match.status && (
          <Typography
            sx={{
              display: 'block',
              mt: 1,
              pt: 1,
              borderTop: `1px solid ${colors.border.subtle}`,
              // Promote status to the result line when we have no detailed score (esp. for completed matches).
              fontSize: !hasAnyScore && kind === 'completed' ? '0.85rem' : '0.72rem',
              fontWeight: !hasAnyScore && kind === 'completed' ? 600 : 400,
              color:
                !hasAnyScore && kind === 'completed'
                  ? colors.text.primary
                  : alpha(colors.text.secondary, 0.75),
              lineHeight: 1.3,
            }}
          >
            {match.status}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

const cardBaseSx = {
  minWidth: { xs: 280, sm: 320 },
  maxWidth: { xs: 280, sm: 360 },
  flexShrink: 0,
  background: `linear-gradient(145deg, ${alpha(colors.blue.navy, 0.9)} 0%, ${alpha('#0A1929', 0.98)} 100%)`,
  border: `1px solid ${colors.border.default}`,
  borderRadius: 3,
};

const skeletonBg = alpha(colors.blue.electric, 0.08);

const SkeletonCard: React.FC = () => (
  <Card sx={cardBaseSx}>
    <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
        <Skeleton variant="rounded" width={64} height={22} sx={{ bgcolor: skeletonBg }} />
        <Skeleton variant="text" width={52} sx={{ bgcolor: skeletonBg }} />
      </Stack>
      {[0, 1].map((i) => (
        <Stack key={i} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 0.75 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Skeleton variant="circular" width={26} height={26} sx={{ bgcolor: skeletonBg }} />
            <Skeleton variant="text" width={120} sx={{ bgcolor: skeletonBg }} />
          </Stack>
          <Skeleton variant="text" width={60} sx={{ bgcolor: skeletonBg }} />
        </Stack>
      ))}
      <Skeleton variant="text" width="80%" sx={{ mt: 1, bgcolor: skeletonBg }} />
    </CardContent>
  </Card>
);

const LiveScorecardStrip: React.FC<LiveScorecardStripProps> = ({ title = 'Live Scores', sx }) => {
  const [scorecard, setScorecard] = useState<LiveScorecardDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeLiveScorecard((doc) => {
      setScorecard(doc);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const matches = selectForDisplay(scorecard?.matches || []);

  if (loading) {
    return (
      <Box sx={{ mt: 0, mb: { xs: 2, sm: 3 }, ...(sx || {}) }}>
        {title && (
          <Typography
            variant="overline"
            sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 700, letterSpacing: '0.12em', mb: 0.75, display: 'block' }}
          >
            {title}
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 1 }}>
          <SkeletonCard />
          <SkeletonCard />
        </Box>
      </Box>
    );
  }

  if (matches.length === 0) {
    // Hide entirely if no relevant matches — keeps the UI clean off-season.
    return null;
  }

  return (
    <Box sx={{ mt: 0, mb: { xs: 2, sm: 3 }, ...(sx || {}) }}>
      {title && (
        <Typography
          variant="overline"
          sx={{
            color: alpha(colors.text.secondary, 0.6),
            fontWeight: 700,
            letterSpacing: '0.12em',
            mb: 0.75,
            display: 'block',
          }}
        >
          {title}
        </Typography>
      )}
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          overflowX: 'auto',
          pb: 1,
          scrollSnapType: 'x mandatory',
          '&::-webkit-scrollbar': { height: 6 },
          '&::-webkit-scrollbar-thumb': { backgroundColor: alpha(colors.blue.electric, 0.3), borderRadius: 3 },
          '& > *': { scrollSnapAlign: 'start' },
        }}
      >
        {matches.map((match, i) => (
          <MatchCard key={match.id || `m-${i}`} match={match} />
        ))}
      </Box>
    </Box>
  );
};

export default LiveScorecardStrip;
