import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  Grid,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ArrowBack, EmojiEvents, Public } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { leagueService, playerPoolService, leaderboardSnapshotService } from '../services/firestore';
import type { PlayerPool, StandingEntry } from '../types/database';
import { colors } from '../theme/colors';

interface GlobalStanding extends StandingEntry {
  leagueName: string;
  leagueId: string;
  globalRank: number;
}

/** Distinct hue for each league — cycles through a palette */
const LEAGUE_PALETTE = [
  { bg: 'rgba(30,136,229,0.25)', color: '#90CAF9' },
  { bg: 'rgba(156,39,176,0.25)', color: '#E040FB' },
  { bg: 'rgba(255,152,0,0.25)',  color: '#FFB300' },
  { bg: 'rgba(0,200,83,0.25)',   color: '#00E676' },
  { bg: 'rgba(244,67,54,0.25)',  color: '#FF5252' },
  { bg: 'rgba(0,229,255,0.25)',  color: '#00E5FF' },
  { bg: 'rgba(255,235,59,0.25)', color: '#FFEE58' },
];

const cardSx = {
  background: 'rgba(255,255,255,0.055)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 2,
  position: 'relative' as const,
  overflow: 'hidden' as const,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
  },
};

const GlobalLeaderboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [pools, setPools] = useState<PlayerPool[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState('');
  const [standings, setStandings] = useState<GlobalStanding[]>([]);
  const [loadingPools, setLoadingPools] = useState(true);
  const [loadingStandings, setLoadingStandings] = useState(false);
  const [error, setError] = useState('');

  // Map leagueId → palette index for consistent colours
  const [leagueColorMap, setLeagueColorMap] = useState<Record<string, number>>({});

  useEffect(() => {
    playerPoolService.getAll()
      .then(p => {
        setPools(p);
        if (p.length > 0) setSelectedPoolId(p[0].id);
      })
      .catch(() => setError('Failed to load player pools'))
      .finally(() => setLoadingPools(false));
  }, []);

  useEffect(() => {
    if (!selectedPoolId) return;
    const fetch = async () => {
      setLoadingStandings(true);
      setError('');
      setStandings([]);
      try {
        const leagues = await leagueService.getByPlayerPool(selectedPoolId);
        if (leagues.length === 0) {
          setStandings([]);
          return;
        }

        // Assign colours per league
        const colorMap: Record<string, number> = {};
        leagues.forEach((l, i) => { colorMap[l.id] = i % LEAGUE_PALETTE.length; });
        setLeagueColorMap(colorMap);

        // Fetch latest snapshot per league in parallel
        const snapshots = await Promise.all(
          leagues.map(l => leaderboardSnapshotService.getLatest(l.id).then(snap => ({ snap, league: l })))
        );

        // Flatten standings
        const flat: Omit<GlobalStanding, 'globalRank'>[] = [];
        for (const { snap, league } of snapshots) {
          if (!snap) continue;
          for (const entry of snap.standings) {
            flat.push({ ...entry, leagueName: league.name, leagueId: league.id });
          }
        }

        // Sort by totalPoints desc, assign global rank
        flat.sort((a, b) => b.totalPoints - a.totalPoints);
        const ranked: GlobalStanding[] = flat.map((e, i) => ({ ...e, globalRank: i + 1 }));
        setStandings(ranked);
      } catch (err: any) {
        setError(err.message || 'Failed to load standings');
      } finally {
        setLoadingStandings(false);
      }
    };
    fetch();
  }, [selectedPoolId]);

  const getRankColor = (rank: number) => {
    if (rank === 1) return colors.gold;
    if (rank === 2) return colors.silver;
    if (rank === 3) return colors.bronze;
    return 'rgba(255,255,255,0.6)';
  };

  const podium = standings.slice(0, 5);
  const rest = standings.slice(5);

  return (
    <Box sx={{ minHeight: '100vh', background: "radial-gradient(ellipse at top, rgba(30,136,229,0.08) 0%, transparent 60%), #060D17", color: 'white', fontFamily: "'Satoshi', sans-serif" }}>
      {/* Header */}
      <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)', px: { xs: 2, sm: 3 }, py: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/admin')}
          sx={{ color: 'rgba(255,255,255,0.6)', fontFamily: "'Satoshi', sans-serif", minWidth: 0 }}
        >
          Admin
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Public sx={{ color: colors.blue.electric, fontSize: '1.25rem' }} />
          <Typography variant="h6" sx={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: { xs: '1rem', sm: '1.125rem' } }}>
            Global Leaderboard
          </Typography>
        </Box>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
        {/* Pool Selector */}
        <Card sx={{ ...cardSx, mb: 3, borderTop: `2px solid ${alpha(colors.blue.electric, 0.4)}` }}>
          <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Typography variant="body2" sx={{ fontFamily: "'Satoshi', sans-serif", color: 'rgba(255,255,255,0.5)', mb: 1.5, fontSize: '0.8125rem' }}>
              Select a player pool to view all squads across every league that uses it.
            </Typography>
            {loadingPools ? (
              <CircularProgress size={24} />
            ) : (
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontFamily: "'Satoshi', sans-serif" }}>Player Pool</InputLabel>
                <Select
                  value={selectedPoolId}
                  label="Player Pool"
                  onChange={e => setSelectedPoolId(e.target.value)}
                  sx={{ fontFamily: "'Satoshi', sans-serif" }}
                >
                  {pools.map(p => (
                    <MenuItem key={p.id} value={p.id} sx={{ fontFamily: "'Satoshi', sans-serif" }}>
                      {p.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </CardContent>
        </Card>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loadingStandings && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {!loadingStandings && standings.length === 0 && selectedPoolId && !error && (
          <Alert severity="info">No standings found for this player pool.</Alert>
        )}

        {standings.length > 0 && (
          <>
            {/* Top 5 Podium */}
            <Card sx={{ ...cardSx, mb: 3, borderTop: `2px solid ${alpha(colors.gold, 0.4)}`, boxShadow: '0 4px 20px rgba(255,215,0,0.08)' }}>
              <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <EmojiEvents sx={{ color: colors.gold, fontSize: '1.25rem' }} />
                  <Typography variant="h6" sx={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: '1rem' }}>
                    Top 5
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'Satoshi', sans-serif" }}>
                    across all leagues
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {podium.map(entry => {
                    const palette = LEAGUE_PALETTE[leagueColorMap[entry.leagueId] ?? 0];
                    const rankBorder = entry.globalRank === 1 ? '3px solid #FFD700' : entry.globalRank === 2 ? '3px solid #C0C0C0' : entry.globalRank === 3 ? '3px solid #CD7F32' : undefined;
                    return (
                      <Box
                        key={`${entry.leagueId}-${entry.squadId}`}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          p: 1.5,
                          borderRadius: 1.5,
                          bgcolor: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderLeft: rankBorder,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                          transition: 'all 0.2s ease',
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', transform: 'translateY(-1px)' },
                        }}
                      >
                        <Typography sx={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: '1.125rem', color: getRankColor(entry.globalRank), minWidth: 28, textAlign: 'center' }}>
                          {entry.globalRank === 1 ? '🥇' : entry.globalRank === 2 ? '🥈' : entry.globalRank === 3 ? '🥉' : `#${entry.globalRank}`}
                        </Typography>
                        <Avatar
                          src={entry.profilePicUrl}
                          sx={{ width: 36, height: 36, bgcolor: colors.blue.navy, fontSize: '0.875rem', flexShrink: 0 }}
                        >
                          {entry.displayName?.[0]?.toUpperCase()}
                        </Avatar>
                        <Box flex={1} minWidth={0}>
                          <Typography variant="body2" sx={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.squadName}
                          </Typography>
                          <Typography variant="caption" sx={{ fontFamily: "'Satoshi', sans-serif", color: 'rgba(255,255,255,0.5)', fontSize: '0.6875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.displayName}
                          </Typography>
                        </Box>
                        <Chip
                          label={entry.leagueName}
                          size="small"
                          sx={{ height: 20, fontSize: '0.625rem', fontWeight: 600, bgcolor: palette.bg, color: palette.color, fontFamily: "'Satoshi', sans-serif", maxWidth: 100, flexShrink: 0 }}
                        />
                        <Typography sx={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: '1.125rem', color: '#64B5F6', minWidth: 52, textAlign: 'right', flexShrink: 0 }}>
                          {entry.totalPoints.toLocaleString()}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>

            {/* Ranks 6+ */}
            {rest.length > 0 && (
              <Card sx={cardSx}>
                <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                  <Typography variant="h6" sx={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: '1rem', mb: 2 }}>
                    All Squads
                    <Chip label={standings.length} size="small" sx={{ ml: 1, height: 20, fontSize: '0.6875rem', fontWeight: 700, bgcolor: 'rgba(255,255,255,0.1)' }} />
                  </Typography>
                  <Grid container spacing={1}>
                    {rest.map(entry => {
                      const palette = LEAGUE_PALETTE[leagueColorMap[entry.leagueId] ?? 0];
                      return (
                        <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={`${entry.leagueId}-${entry.squadId}`}>
                          <Box
                            sx={{
                              p: 1.25,
                              borderRadius: 1.5,
                              bgcolor: 'rgba(255,255,255,0.07)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                              height: '100%',
                              transition: 'all 0.2s ease',
                              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' },
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography sx={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: '0.875rem', color: 'rgba(255,255,255,0.55)' }}>
                                #{entry.globalRank}
                              </Typography>
                              <Typography sx={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: '0.875rem', color: '#90CAF9' }}>
                                {entry.totalPoints.toLocaleString()}
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mb: 0.25 }}>
                              {entry.squadName}
                            </Typography>
                            <Typography variant="caption" sx={{ fontFamily: "'Satoshi', sans-serif", color: 'rgba(255,255,255,0.45)', fontSize: '0.625rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mb: 0.75 }}>
                              {entry.displayName}
                            </Typography>
                            <Chip
                              label={entry.leagueName}
                              size="small"
                              sx={{ height: 16, fontSize: '0.55rem', fontWeight: 600, bgcolor: palette.bg, color: palette.color, fontFamily: "'Satoshi', sans-serif", maxWidth: '100%' }}
                            />
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </Container>
    </Box>
  );
};

export default GlobalLeaderboardPage;
