import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Fab,
  Alert,
  LinearProgress,
} from '@mui/material';
import Skeleton from '@mui/material/Skeleton';
import {
  SportsCricket,
  Add,
  People,
  Schedule,
  PersonAdd,
  ContentCopy,
  Groups,
  Share,
  Bolt,
  SwapHoriz,
  CompareArrows,
  AutoAwesome,
  TrendingUp,
  TrendingDown,
  Remove,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { leagueService, squadService } from '../services/firestore';
import AppHeader from '../components/common/AppHeader';
import type { League, LeagueSquad } from '../types/database';
import colors from '../theme/colors';
import { alpha } from '@mui/material';

interface LeagueWithSquad {
  league: League;
  squad: LeagueSquad | null;
}

const LeagueListPage: React.FC = () => {
  const [leaguesWithSquads, setLeaguesWithSquads] = useState<LeagueWithSquad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const pullStartY = useRef(0);

  const { user, userData } = useAuth();
  const navigate = useNavigate();

  const loadLeagues = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userLeagues = await leagueService.getForUser(user.uid);

      const leaguesWithSquadData = await Promise.all(
        userLeagues.map(async (league) => {
          try {
            const squad = await squadService.getByUserAndLeague(user.uid, league.id);
            return { league, squad };
          } catch (err) {
            console.error(`Error fetching squad for league ${league.id}:`, err);
            return { league, squad: null };
          }
        })
      );

      // Sort: most recently created (joined) leagues first
      leaguesWithSquadData.sort((a, b) => {
        const aTime = new Date(a.league.createdAt).getTime();
        const bTime = new Date(b.league.createdAt).getTime();
        return bTime - aTime;
      });

      setLeaguesWithSquads(leaguesWithSquadData);
    } catch (err: any) {
      setError('Failed to load leagues');
      console.error('Error loading leagues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeagues();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePullStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) pullStartY.current = e.touches[0].clientY;
  };

  const handlePullEnd = async (e: React.TouchEvent) => {
    const dy = e.changedTouches[0].clientY - pullStartY.current;
    if (dy > 70 && window.scrollY === 0) {
      window.navigator?.vibrate?.(8);
      setRefreshing(true);
      await loadLeagues();
      setRefreshing(false);
    }
  };

  const getSmartStatus = (league: League, squad: LeagueSquad | null) => {
    const now = new Date();
    const deadlinePassed = now > new Date(league.squadDeadline);
    const leagueStarted = now > new Date(league.startDate);

    // Check if league has ended (using endDate if available, otherwise fall back to status)
    const leagueEnded = league.endDate ? now > new Date(league.endDate) : league.status === 'completed';

    // League is completed (ended)
    if (leagueEnded) {
      return {
        label: 'Completed',
        color: 'default' as const,
        icon: ''
      };
    }

    // League is in progress (started but not ended)
    if (leagueStarted && !leagueEnded) {
      return {
        label: 'In Progress',
        color: 'success' as const,
        icon: ''
      };
    }

    // Deadline passed but user didn't submit
    if (deadlinePassed && !squad?.isSubmitted) {
      return {
        label: 'Missed Deadline',
        color: 'error' as const,
        icon: ''
      };
    }

    // User submitted their squad
    if (squad?.isSubmitted) {
      return {
        label: 'Squad Submitted',
        color: 'success' as const,
        icon: ''
      };
    }

    // Deadline approaching - need to submit
    if (!deadlinePassed) {
      const hoursLeft = Math.floor((new Date(league.squadDeadline).getTime() - now.getTime()) / (1000 * 60 * 60));
      if (hoursLeft < 24) {
        return {
          label: `Submit Squad (${hoursLeft}h left)`,
          color: 'error' as const,
          icon: ''
        };
      }
      return {
        label: 'Submit Squad',
        color: 'warning' as const,
        icon: ''
      };
    }

    // Default fallback
    return {
      label: league.status.replace('_', ' '),
      color: 'default' as const,
      icon: ''
    };
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleCopyInviteLink = async (code: string) => {
    try {
      const url = `${window.location.origin}/invite/${code}`;
      await navigator.clipboard.writeText(url);
      setCopiedInvite(code);
      setTimeout(() => setCopiedInvite(null), 2000);
    } catch (err) {
      console.error('Failed to copy invite link:', err);
    }
  };

  const hasLeagueStarted = (startDate: Date) => {
    return new Date() > new Date(startDate);
  };

  // Shared card style — matches LeagueDashboardPage
  const cardSx = {
    background: `linear-gradient(145deg, ${alpha(colors.blue.navy, 0.95)} 0%, ${alpha('#0A1929', 0.98)} 100%)`,
    border: `1px solid ${colors.border.default}`,
    borderRadius: 4,
    boxShadow: `0 20px 60px rgba(0,0,0,0.4)`,
    overflow: 'hidden',
    position: 'relative' as const,
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '1px',
      background: `linear-gradient(90deg, transparent, ${alpha(colors.blue.electric, 0.6)}, transparent)`,
    }
  };

  return (
    <Box
      onTouchStart={handlePullStart}
      onTouchEnd={handlePullEnd}
    >
      <AppHeader />

      {refreshing && <LinearProgress sx={{ position: 'sticky', top: 0, zIndex: 1200 }} />}

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Page Header */}
        <Box
          mb={4}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={2}
        >
          <Box
            sx={{
              position: 'relative',
              pl: 3,
              py: 1,
              '&::before': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '4px',
                borderRadius: '4px',
                background: `linear-gradient(180deg, ${colors.blue.electric}, ${alpha(colors.blue.electric, 0.2)})`,
              }
            }}
          >
            <Typography
              variant="h4"
              fontWeight={800}
              sx={{
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                background: `linear-gradient(90deg, ${colors.text.primary} 60%, ${colors.blue.light})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              My Leagues
            </Typography>
            <Typography variant="body2" sx={{ color: alpha(colors.text.secondary, 0.6), mt: 0.4, letterSpacing: '0.01em' }}>
              Manage your fantasy cricket leagues and squads
            </Typography>
          </Box>

          <Box display="flex" gap={1.5} flexWrap="wrap" alignItems="center">
            {userData?.isAdmin && (
              <>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => navigate('/leagues/create')}
                  sx={{
                    fontWeight: 600,
                    px: 2.5,
                    py: 1,
                    bgcolor: colors.blue.electric,
                    boxShadow: `0 4px 14px ${alpha(colors.blue.electric, 0.35)}`,
                    '&:hover': {
                      bgcolor: colors.blue.deep,
                      boxShadow: `0 6px 18px ${alpha(colors.blue.electric, 0.5)}`,
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  Create League
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PersonAdd />}
                  onClick={() => navigate('/leagues/join')}
                  sx={{
                    fontWeight: 600,
                    px: 2.5,
                    py: 1,
                    borderColor: colors.orange.primary,
                    color: colors.orange.primary,
                    '&:hover': {
                      borderColor: colors.orange.light,
                      bgcolor: alpha(colors.orange.primary, 0.08),
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  Join League
                </Button>
                <Button
                  variant="text"
                  startIcon={<Groups />}
                  onClick={() => navigate('/admin/player-pools')}
                  sx={{
                    color: alpha(colors.text.secondary, 0.6),
                    fontWeight: 500,
                    px: 2,
                    py: 1,
                    '&:hover': {
                      color: colors.text.secondary,
                      bgcolor: alpha(colors.text.secondary, 0.06),
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  Player Pools
                </Button>
              </>
            )}
            {!userData?.isAdmin && (
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                onClick={() => navigate('/leagues/join')}
                sx={{
                  fontWeight: 600,
                  px: 2.5,
                  py: 1,
                  bgcolor: colors.blue.electric,
                  boxShadow: `0 4px 14px ${alpha(colors.blue.electric, 0.35)}`,
                  '&:hover': {
                    bgcolor: colors.blue.deep,
                    boxShadow: `0 6px 18px ${alpha(colors.blue.electric, 0.5)}`,
                    transform: 'translateY(-1px)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                Join League
              </Button>
            )}
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Leagues Grid */}
        {loading && (
          <Box sx={{ px: 2 }}>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} variant="rounded" height={88} sx={{ mb: 1.5, bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 2 }} />
            ))}
          </Box>
        )}

        {!loading && leaguesWithSquads.length === 0 ? (
          <Card sx={{ ...cardSx, textAlign: 'center', py: 8 }}>
            <CardContent>
              <SportsCricket sx={{ fontSize: 80, color: alpha(colors.text.secondary, 0.3), mb: 2 }} />
              <Typography variant="h5" fontWeight={700} gutterBottom sx={{
                background: `linear-gradient(90deg, ${colors.text.primary} 60%, ${colors.blue.light})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                No Leagues Yet
              </Typography>
              <Typography variant="body2" sx={{ color: alpha(colors.text.secondary, 0.5), mb: 3 }}>
                {userData?.isAdmin ? 'Create your first league or join an existing one to get started!' : 'Join a league to get started!'}
              </Typography>
              <Box display="flex" gap={2} justifyContent="center">
                {userData?.isAdmin && (
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => navigate('/leagues/create')}
                    sx={{
                      bgcolor: colors.blue.electric,
                      fontWeight: 600,
                      '&:hover': { bgcolor: colors.blue.deep },
                    }}
                  >
                    Create League
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<PersonAdd />}
                  onClick={() => navigate('/leagues/join')}
                  sx={{
                    borderColor: colors.orange.primary,
                    color: colors.orange.primary,
                    fontWeight: 600,
                    '&:hover': { borderColor: colors.orange.light, bgcolor: alpha(colors.orange.primary, 0.08) },
                  }}
                >
                  Join League
                </Button>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {leaguesWithSquads.map(({ league, squad }) => {
              const status = getSmartStatus(league, squad);
              const dotColor = status.color === 'success' ? colors.success.primary
                : status.color === 'warning' ? colors.warning.primary
                : status.color === 'error' ? colors.error.primary
                : colors.grey[500];
              const isInProgress = status.color === 'success' && status.label.includes('In Progress');

              return (
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={league.id}>
                  <Card
                    sx={{
                      ...cardSx,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        border: `1px solid ${alpha(colors.blue.electric, 0.4)}`,
                        boxShadow: `0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px ${alpha(colors.blue.electric, 0.15)}`,
                      },
                    }}
                    onClick={() => navigate(`/leagues/${league.id}`)}
                  >
                    <CardContent sx={{ flex: 1, p: 2.5 }}>
                      {/* League name + status badge */}
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5} gap={1}>
                        <Typography
                          variant="h6"
                          fontWeight={700}
                          noWrap
                          sx={{
                            flex: 1,
                            fontFamily: '"Montserrat", sans-serif',
                            fontSize: '1.05rem',
                            letterSpacing: '-0.01em',
                            color: colors.text.primary,
                          }}
                        >
                          {league.name}
                        </Typography>
                        {/* Dot + pill status badge */}
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 1,
                            py: 0.3,
                            borderRadius: 1.5,
                            border: `1px solid ${alpha(dotColor, 0.4)}`,
                            bgcolor: alpha(dotColor, 0.08),
                            flexShrink: 0,
                          }}
                        >
                          <Box
                            sx={{
                              width: 5,
                              height: 5,
                              borderRadius: '50%',
                              bgcolor: dotColor,
                              ...(isInProgress && {
                                boxShadow: `0 0 5px ${dotColor}`,
                                animation: 'pulse 2s infinite',
                                '@keyframes pulse': {
                                  '0%, 100%': { opacity: 1 },
                                  '50%': { opacity: 0.4 },
                                }
                              })
                            }}
                          />
                          <Typography variant="caption" sx={{ color: dotColor, fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.04em' }}>
                            {status.label}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Tournament + Format — side by side chips */}
                      <Box display="flex" gap={0.75} mb={1.5} flexWrap="wrap" alignItems="center">
                        <Box sx={{ display: 'inline-flex', px: 1, py: 0.2, borderRadius: 1, border: `1px solid ${alpha(colors.text.secondary, 0.15)}`, bgcolor: alpha(colors.text.secondary, 0.04) }}>
                          <Typography sx={{ fontSize: '0.63rem', fontWeight: 600, color: alpha(colors.text.secondary, 0.5), letterSpacing: '0.03em' }}>
                            {league.tournamentName}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'inline-flex', px: 1, py: 0.2, borderRadius: 1, border: `1px solid ${alpha(colors.orange.primary, 0.5)}`, bgcolor: alpha(colors.orange.primary, 0.08) }}>
                          <Typography sx={{ fontSize: '0.63rem', fontWeight: 700, color: colors.orange.light, letterSpacing: '0.06em' }}>
                            {league.format}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Premium Features */}
                      {(() => {
                        const features = [
                          league.powerplayEnabled && { icon: <Bolt sx={{ fontSize: 13 }} />, label: 'PP', enabled: !!league.ppActivationEnabled, color: '#F59E0B' },
                          league.transferTypes?.flexibleTransfers?.enabled && { icon: <SwapHoriz sx={{ fontSize: 13 }} />, label: 'Flex', enabled: !!league.flexibleChangesEnabled, color: '#a855f7' },
                          league.transferTypes?.benchTransfers?.enabled && { icon: <CompareArrows sx={{ fontSize: 13 }} />, label: 'Bench', enabled: !!league.benchChangesEnabled, color: '#22d3ee' },
                          league.transferTypes?.wildcardTransfers?.enabled && { icon: <AutoAwesome sx={{ fontSize: 13 }} />, label: 'Wild', enabled: !!league.wildcardChangesEnabled, color: '#f43f5e', premium: true },
                        ].filter(Boolean) as { icon: React.ReactNode; label: string; enabled: boolean; color: string; premium?: boolean }[];
                        if (features.length === 0) return null;
                        return (
                          <Box
                            display="flex"
                            alignItems="center"
                            gap={0}
                            mb={1.5}
                            sx={{
                              bgcolor: alpha(colors.text.primary, 0.03),
                              border: `1px solid ${alpha(colors.text.primary, 0.07)}`,
                              borderRadius: 1.5,
                              px: 1.25,
                              py: 0.6,
                              width: 'fit-content',
                            }}
                          >
                            {features.map((f, i) => (
                              <React.Fragment key={f.label}>
                                {i > 0 && (
                                  <Box sx={{ width: '1px', height: 12, bgcolor: alpha(colors.text.primary, 0.1), mx: 1.25 }} />
                                )}
                                <Box
                                  display="flex"
                                  alignItems="center"
                                  gap={0.5}
                                  sx={f.premium && f.enabled ? {
                                    filter: 'drop-shadow(0 0 4px rgba(255,215,0,0.55))',
                                  } : {
                                    color: f.enabled ? f.color : alpha(colors.text.primary, 0.22),
                                    opacity: f.enabled ? 1 : 0.55,
                                    filter: f.enabled ? 'none' : 'grayscale(1)',
                                  }}
                                >
                                  <Box sx={f.premium && f.enabled ? { color: '#FFD700', display: 'flex' } : { display: 'flex' }}>
                                    {f.icon}
                                  </Box>
                                  <Typography sx={f.premium && f.enabled ? {
                                    fontSize: '0.6875rem',
                                    fontWeight: 700,
                                    letterSpacing: '0.02em',
                                    lineHeight: 1,
                                    background: 'linear-gradient(135deg, #FFD700, #FF8C00)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                  } : {
                                    fontSize: '0.6875rem',
                                    fontWeight: f.enabled ? 600 : 400,
                                    color: 'inherit',
                                    letterSpacing: '0.02em',
                                    lineHeight: 1,
                                  }}>
                                    {f.label}
                                  </Typography>
                                </Box>
                              </React.Fragment>
                            ))}
                          </Box>
                        );
                      })()}

                      {/* Stats row — rank+points when squad exists, else league meta */}
                      {(() => {
                        const sq = squad;
                        if (sq?.rank) {
                          const rankChange = sq.rankChange ?? (sq.previousRank && sq.rank ? sq.previousRank - sq.rank : null);
                          const RankArrow = rankChange == null ? null
                            : rankChange > 0 ? <TrendingUp sx={{ fontSize: 12, color: '#22c55e' }} />
                            : rankChange < 0 ? <TrendingDown sx={{ fontSize: 12, color: '#ef4444' }} />
                            : <Remove sx={{ fontSize: 12, color: alpha('#fff', 0.3) }} />;
                          return (
                            <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                              {/* Rank badge */}
                              <Box display="flex" alignItems="center" gap={0.5} sx={{
                                bgcolor: alpha(colors.orange.primary, 0.1),
                                border: `1px solid ${alpha(colors.orange.primary, 0.3)}`,
                                borderRadius: 1,
                                px: 0.75,
                                py: 0.2,
                              }}>
                                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: colors.orange.primary, fontVariantNumeric: 'tabular-nums' }}>
                                  #{sq.rank}
                                </Typography>
                                {RankArrow}
                              </Box>
                              <Box sx={{ width: '1px', height: 12, bgcolor: colors.border.subtle }} />
                              {/* Points */}
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: colors.text.primary, fontVariantNumeric: 'tabular-nums' }}>
                                  {sq.totalPoints ?? 0}
                                </Typography>
                                <Typography sx={{ fontSize: '0.65rem', color: alpha(colors.text.secondary, 0.45) }}>pts</Typography>
                              </Box>
                              <Box sx={{ width: '1px', height: 12, bgcolor: colors.border.subtle }} />
                              {/* Participants */}
                              <Box display="flex" alignItems="center" gap={0.5} sx={{ opacity: 0.55 }}>
                                <People sx={{ fontSize: 13, color: colors.blue.light }} />
                                <Typography fontSize="0.7rem" sx={{ color: colors.text.secondary, fontVariantNumeric: 'tabular-nums' }}>
                                  {league.participants.length}<span style={{ opacity: 0.5 }}>/{league.maxParticipants}</span>
                                </Typography>
                              </Box>
                            </Box>
                          );
                        }
                        return (
                          <Box display="flex" alignItems="center" gap={2} mb={1.5} sx={{ opacity: 0.65 }}>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <People sx={{ fontSize: 13, color: colors.blue.light }} />
                              <Typography fontSize="0.7rem" sx={{ color: colors.text.secondary, fontVariantNumeric: 'tabular-nums' }}>
                                {league.participants.length}<span style={{ opacity: 0.5 }}>/{league.maxParticipants}</span>
                              </Typography>
                            </Box>
                            <Box sx={{ width: '1px', height: 12, bgcolor: colors.border.subtle }} />
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <Schedule sx={{ fontSize: 13, color: colors.blue.light }} />
                              <Typography fontSize="0.7rem" sx={{ color: colors.text.secondary }}>
                                {new Date(league.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </Typography>
                            </Box>
                            <Box sx={{ width: '1px', height: 12, bgcolor: colors.border.subtle }} />
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <SwapHoriz sx={{ fontSize: 13, color: colors.blue.light }} />
                              <Typography fontSize="0.7rem" sx={{ color: colors.text.secondary }}>
                                {league.maxTransfers}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })()}

                      {/* League Code + Invite — compact secondary row */}
                      <Box display="flex" gap={0.75} alignItems="center" mt={0.5}>
                        <Box display="flex" alignItems="center" gap={0.75} flex={1} sx={{
                          border: `1px solid ${colors.border.subtle}`,
                          borderRadius: 1,
                          px: 1, py: '3px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          '&:hover': { bgcolor: alpha(colors.blue.electric, 0.05) },
                        }} onClick={(e) => { e.stopPropagation(); handleCopyCode(league.code); }}>
                          <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', color: alpha(colors.text.primary, 0.55), fontFamily: 'monospace' }}>
                            {league.code}
                          </Typography>
                          <ContentCopy sx={{ ml: 'auto', fontSize: 12, color: copiedCode === league.code ? colors.success.primary : alpha(colors.text.secondary, 0.3) }} />
                          {copiedCode === league.code && (
                            <Typography sx={{ fontSize: '0.62rem', color: colors.success.primary, whiteSpace: 'nowrap' }}>Copied!</Typography>
                          )}
                        </Box>
                        <Box display="flex" alignItems="center" gap={0.5} sx={{
                          border: `1px solid ${colors.border.subtle}`,
                          borderRadius: 1,
                          px: 1, py: '3px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          '&:hover': { bgcolor: alpha(colors.blue.electric, 0.05) },
                        }} onClick={(e) => { e.stopPropagation(); handleCopyInviteLink(league.code); }} title="Copy invite link">
                          <Share sx={{ fontSize: 13, color: copiedInvite === league.code ? colors.success.primary : alpha(colors.text.secondary, 0.3) }} />
                          {copiedInvite === league.code && (
                            <Typography sx={{ fontSize: '0.62rem', color: colors.success.primary, whiteSpace: 'nowrap' }}>Copied!</Typography>
                          )}
                        </Box>
                      </Box>
                    </CardContent>

                    <CardActions sx={{ px: 2, pb: 2, pt: 1, gap: 0.75, borderTop: `1px solid ${colors.border.subtle}` }}>
                      {/* Manage Squad — primary CTA */}
                      <Button
                        variant="contained"
                        size="small"
                        onClick={(e) => { e.stopPropagation(); navigate(`/leagues/${league.id}/squad`); }}
                        sx={{
                          bgcolor: colors.blue.electric,
                          fontWeight: 600,
                          px: 1.75,
                          py: 0.5,
                          fontSize: '0.75rem',
                          whiteSpace: 'nowrap',
                          boxShadow: `0 2px 8px ${alpha(colors.blue.electric, 0.3)}`,
                          '&:hover': { bgcolor: colors.blue.deep, boxShadow: `0 4px 12px ${alpha(colors.blue.electric, 0.45)}`, transform: 'translateY(-1px)' },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        Manage Squad
                      </Button>
                      {/* Leaderboard */}
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={(e) => { e.stopPropagation(); navigate(`/leagues/${league.id}/leaderboard`); }}
                        sx={{
                          borderColor: alpha(colors.orange.primary, 0.6),
                          color: colors.orange.primary,
                          fontWeight: 600,
                          px: 1.25,
                          py: 0.5,
                          fontSize: '0.75rem',
                          '&:hover': { borderColor: colors.orange.light, bgcolor: alpha(colors.orange.primary, 0.08), transform: 'translateY(-1px)' },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        Standings
                      </Button>
                      {/* Teams */}
                      {hasLeagueStarted(league.startDate) && (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={(e) => { e.stopPropagation(); navigate(`/leagues/${league.id}/teams`); }}
                          sx={{
                            borderColor: alpha(colors.blue.electric, 0.35),
                            color: alpha(colors.blue.light, 0.8),
                            fontWeight: 600,
                            px: 1.25,
                            py: 0.5,
                            fontSize: '0.75rem',
                            '&:hover': { borderColor: colors.blue.electric, bgcolor: alpha(colors.blue.electric, 0.08), transform: 'translateY(-1px)' },
                            transition: 'all 0.2s ease',
                          }}
                        >
                          Teams
                        </Button>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* Floating Action Button for Mobile - Admin Only */}
        {userData?.isAdmin && (
          <Fab
            color="primary"
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              display: { xs: 'flex', md: 'none' }
            }}
            onClick={() => navigate('/leagues/create')}
          >
            <Add />
          </Fab>
        )}
      </Container>
    </Box>
  );
};

export default LeagueListPage;