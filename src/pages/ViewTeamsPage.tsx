import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  CircularProgress,
  Alert,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  IconButton
} from '@mui/material';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';
import {
  ExpandMore,
  Groups,
  Search,
  Close,
  Lock,
  TrackChanges,
  SportsCricket,
  Bolt,
  EmojiEvents,
  Person,
  Star,
  SportsBaseball,
  GolfCourse,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import { useAuth } from '../contexts/AuthContext';
import colors from '../theme/colors';
import { leagueService, squadService, userService } from '../services/firestore';
import AppHeader from '../components/common/AppHeader';
import LeagueNav from '../components/common/LeagueNav';
import LeagueAssistant from '../components/LeagueAssistant';
import type { League, LeagueSquad, User } from '../types/database';
import { TeamLogo } from '../utils/teamLogos';

const CricketCapIcon = (props: SvgIconProps) => (
  <SvgIcon viewBox="0 0 24 24" {...props}>
    <path d="M4 14 C4 8.477 7.582 5 12 5 C16.418 5 20 8.477 20 14 Z" />
    <rect x="2" y="14" width="20" height="2.5" rx="1.25" />
    <path d="M2 14.5 Q0 15.5 1 17 L3 16.5 Z" />
  </SvgIcon>
);

interface SquadWithUser extends LeagueSquad {
  user?: User;
}

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
    top: 0, left: 0, right: 0,
    height: '1px',
    background: `linear-gradient(90deg, transparent, ${alpha(colors.blue.electric, 0.6)}, transparent)`,
  }
};

const ViewTeamsPage: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [league, setLeague] = useState<League | null>(null);
  const [squads, setSquads] = useState<SquadWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!leagueId) return;

      try {
        setLoading(true);
        setError('');

        const [leagueData, allSquadsData] = await Promise.all([
          leagueService.getById(leagueId),
          squadService.getByLeague(leagueId)
        ]);

        if (leagueData) {
          setLeague(leagueData);

          // Only work with submitted squads
          const squadsData = allSquadsData.filter(s => s.isSubmitted);

          // Check if current user has submitted their squad
          const currentUserSquad = squadsData.find(squad => squad.userId === user?.uid);

          if (!currentUserSquad) {
            setError('You must submit your squad before viewing other participants.');
            return;
          }

          // Fetch user data for each submitted squad
          const squadsWithUsers = await Promise.all(
            squadsData.map(async (squad) => {
              try {
                const userData = await userService.getById(squad.userId);
                console.log('User data for', squad.userId, ':', userData);
                return { ...squad, user: userData || undefined };
              } catch (err) {
                console.error(`Error fetching user ${squad.userId}:`, err);
                return { ...squad, user: undefined };
              }
            })
          );

          console.log('Squads with users:', squadsWithUsers);
          setSquads(squadsWithUsers);
        } else {
          setError('League not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load teams');
        console.error('Error loading teams:', err);
      } finally {
        setLoading(false);
      }
    };

    if (leagueId && user) {
      loadData();
    }
  }, [leagueId, user]);

  const getRoleIcon = (role: string) => {
    const iconSx = { fontSize: '1rem' };
    switch (role) {
      case 'batsman': return <SportsCricket sx={{ ...iconSx, color: 'primary.main' }} />;
      case 'bowler': return <SportsBaseball sx={{ ...iconSx, color: 'text.secondary' }} />;
      case 'allrounder': return <Star sx={{ ...iconSx, color: 'warning.main' }} />;
      case 'wicketkeeper': return <GolfCourse sx={{ ...iconSx, color: 'success.main' }} />;
      default: return <Person sx={{ ...iconSx, color: 'text.disabled' }} />;
    }
  };

  // Calculate pick percentage for each player across all squads (only main squad, not bench)
  const getPickPercentage = (playerId: string): number => {
    if (squads.length === 0 || !league) return 0;
    const squadSize = league.squadSize;
    const teamsWithPlayer = squads.filter(squad => {
      // Only check main squad players (first squadSize players)
      const mainSquadPlayers = squad.players.slice(0, squadSize);
      return mainSquadPlayers.some(p => p.playerId === playerId);
    }).length;
    return Math.round((teamsWithPlayer / squads.length) * 100);
  };

  if (loading) {
    return (
      <Box>
        <AppHeader />
        {leagueId && (
          <LeagueNav
            leagueName="Loading..."
            leagueId={leagueId}
            currentPage="Teams"
          />
        )}
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
          <CircularProgress size={60} />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <AppHeader />
        {leagueId && league && (
          <LeagueNav
            leagueName={league.name}
            leagueId={leagueId}
            currentPage="Teams"
          />
        )}
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </Box>
    );
  }

  // Check if league has started
  const leagueStarted = league ? new Date() > new Date(league.startDate) : false;

  // Filter squads based on search query
  const filteredSquads = squads.filter(squad => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    const userName = squad.user?.displayName?.toLowerCase() || '';
    const squadName = squad.squadName.toLowerCase();

    // Search in squad players (only if league has started)
    if (leagueStarted) {
      const hasPlayerMatch = squad.players.some(player =>
        player.playerName.toLowerCase().includes(query) ||
        player.team.toLowerCase().includes(query)
      );
      return userName.includes(query) || squadName.includes(query) || hasPlayerMatch;
    }

    return userName.includes(query) || squadName.includes(query);
  });

  return (
    <Box>
      <AppHeader />
      {league && leagueId && (
        <LeagueNav
          leagueName={league.name}
          leagueId={leagueId}
          currentPage="Teams"
        />
      )}

      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3 }, pb: { xs: '88px', md: 4 } }}>
        {/* Page Header */}
        <Box sx={{
          position: 'relative', pl: 3, py: 2, mb: 4,
          '&::before': {
            content: '""', position: 'absolute',
            left: 0, top: 0, bottom: 0, width: '4px', borderRadius: '4px',
            background: `linear-gradient(180deg, ${colors.blue.electric}, ${alpha(colors.blue.electric, 0.2)})`,
          }
        }}>
          <Typography variant="h4" fontWeight={800} sx={{
            letterSpacing: '-0.02em',
            background: `linear-gradient(90deg, ${colors.text.primary} 60%, ${colors.blue.light})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Teams
          </Typography>
          <Typography variant="body2" sx={{ color: alpha(colors.text.secondary, 0.6), mt: 0.4 }}>
            {league?.tournamentName} • {league?.format} Format
          </Typography>
        </Box>

        {/* League Info */}
        <Card sx={{ mb: { xs: 2, sm: 3, md: 4 }, ...cardSx }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={{ xs: 1, sm: 2 }} mb={2} flexWrap="wrap">
              <Groups sx={{ fontSize: { xs: 20, sm: 24 }, color: colors.blue.light }} />
              <Typography variant="h6" sx={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                {league?.name}
              </Typography>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.5, py: 0.25, borderRadius: 2, border: `1px solid ${alpha(colors.orange.primary, 0.5)}`, bgcolor: alpha(colors.orange.primary, 0.08) }}>
                <Typography variant="caption" sx={{ color: colors.orange.primary, fontWeight: 600, fontSize: '0.75rem' }}>
                  {league?.format}
                </Typography>
              </Box>
              <Chip
                label={`${squads.length} Teams`}
                color="primary"
                variant="outlined"
                size="small"
                sx={{ borderColor: colors.blue.electric, color: colors.blue.electric }}
              />
            </Box>
            <Typography variant="body2" sx={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 400, fontSize: { xs: '0.75rem', sm: '0.875rem' }, color: 'text.secondary', opacity: 0.8 }}>
              {league?.tournamentName} • Squad deadline: {new Date(league?.squadDeadline || '').toLocaleString()}
            </Typography>
            {!leagueStarted && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Team details will be visible once the league starts on {new Date(league?.startDate || '').toLocaleString()}
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Search Bar */}
        {squads.length > 0 && (
          <Card sx={{ mb: { xs: 2, sm: 3 }, ...cardSx }}>
            <CardContent>
              <TextField
                fullWidth
                placeholder={leagueStarted ? "Search by team name, user, player, or team..." : "Search by team name or user..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchQuery('')}>
                        <Close fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              {searchQuery && (
                <Typography variant="caption" sx={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 400, mt: 1, display: 'block', color: alpha(colors.text.secondary, 0.6) }}>
                  Showing {filteredSquads.length} of {squads.length} teams
                </Typography>
              )}
            </CardContent>
          </Card>
        )}

        {/* Teams List */}
        {squads.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: { xs: 4, sm: 8 }, ...cardSx }}>
            <CardContent>
              <Groups sx={{ fontSize: { xs: 60, sm: 80 }, color: alpha(colors.text.secondary, 0.3), mb: 2 }} />
              <Typography variant="h5" gutterBottom sx={{
                fontFamily: "'Satoshi', sans-serif", fontWeight: 600, fontSize: { xs: '1.25rem', sm: '1.5rem' },
                background: `linear-gradient(90deg, ${colors.text.primary} 60%, ${colors.blue.light})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                No Teams Submitted Yet
              </Typography>
              <Typography variant="body1" sx={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 400, fontSize: { xs: '0.875rem', sm: '1rem' }, color: 'text.secondary' }}>
                Waiting for players to submit their squads...
              </Typography>
            </CardContent>
          </Card>
        ) : filteredSquads.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: { xs: 4, sm: 8 }, ...cardSx }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{
                fontFamily: "'Satoshi', sans-serif", fontWeight: 600,
                background: `linear-gradient(90deg, ${colors.text.primary} 60%, ${colors.blue.light})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                No teams found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your search query
              </Typography>
            </CardContent>
          </Card>
        ) : !leagueStarted ? (
          // Before league starts: Show only participant names and profile pictures
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            {filteredSquads.map((squad, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={squad.id}>
                <Card sx={{ ...cardSx, transition: 'transform 0.2s ease, box-shadow 0.2s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 24px 64px rgba(0,0,0,0.5)` } }}>
                  <CardContent sx={{ p: { xs: 2, sm: 2, md: 3 } }}>
                    <Box display="flex" alignItems="center" gap={{ xs: 1.5, sm: 2 }}>
                      <Avatar
                        src={squad.user?.profilePicUrl}
                        onClick={() => squad.user?.uid && navigate(`/user/${squad.user.uid}`)}
                        sx={{
                          background: `linear-gradient(135deg, ${colors.blue.deep}, ${colors.blue.electric})`,
                          boxShadow: `0 0 0 2px ${alpha(colors.blue.electric, 0.2)}`,
                          width: { xs: 48, sm: 56 },
                          height: { xs: 48, sm: 56 },
                          cursor: squad.user?.uid ? 'pointer' : 'default',
                          transition: 'box-shadow 0.2s',
                          '&:hover': squad.user?.uid ? { boxShadow: `0 0 0 3px ${alpha(colors.blue.electric, 0.5)}` } : {},
                        }}
                      >
                        {squad.user?.displayName?.charAt(0) || squad.squadName.charAt(0)}
                      </Avatar>
                      <Box flex={1} minWidth={0}>
                        <Typography variant="h6" sx={{
                          fontFamily: "'Satoshi', sans-serif",
                          fontWeight: 700,
                          fontSize: { xs: '1rem', sm: '1.1rem' },
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {squad.user?.displayName || 'Unknown Player'}
                        </Typography>
                        <Typography variant="body2" sx={{
                          fontFamily: "'Satoshi', sans-serif",
                          fontWeight: 400,
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          color: 'text.secondary',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {squad.squadName}
                        </Typography>
                      </Box>
                      <Box display="flex" flexDirection="column" alignItems="flex-end" gap={0.5} flexShrink={0}>
                        {squad.isSubmitted && (
                          <Chip
                            label="Submitted"
                            color="success"
                            size="small"
                            sx={{ bgcolor: alpha(colors.green.primary, 0.15), color: colors.green.light, borderColor: alpha(colors.green.primary, 0.4), border: '1px solid', fontSize: '0.65rem' }}
                          />
                        )}
                        {squad.user?.uid && (
                          <Chip
                            label="View Profile"
                            size="small"
                            onClick={() => navigate(`/user/${squad.user!.uid}`)}
                            sx={{ fontSize: '0.62rem', fontWeight: 600, cursor: 'pointer', bgcolor: alpha(colors.blue.electric, 0.1), color: colors.blue.light, border: `1px solid ${alpha(colors.blue.electric, 0.3)}`, '&:hover': { bgcolor: alpha(colors.blue.electric, 0.2) } }}
                          />
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          // After league starts: Show full team details
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            {filteredSquads.map((squad) => {
              const squadSize = league?.squadSize || 11;

              // Sort function to order by role: batsman -> allrounder -> wicketkeeper -> bowler
              const sortByRole = (players: typeof squad.players) => {
                const roleOrder: { [key: string]: number } = {
                  'batsman': 1,
                  'allrounder': 2,
                  'wicketkeeper': 3,
                  'bowler': 4
                };
                return [...players].sort((a, b) => {
                  const orderA = roleOrder[a.role] || 999;
                  const orderB = roleOrder[b.role] || 999;
                  return orderA - orderB;
                });
              };

              const mainSquad = sortByRole(squad.players.slice(0, squadSize));
              const bench = sortByRole(squad.players.slice(squadSize));

              return (
                <Grid size={{ xs: 12, lg: 6 }} key={squad.id}>
                  <Card sx={{ ...cardSx, transition: 'transform 0.2s ease, box-shadow 0.2s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 24px 64px rgba(0,0,0,0.5)` } }}>
                    <CardContent sx={{ p: { xs: 2, sm: 2, md: 3 } }}>
                      <Box display="flex" alignItems="center" gap={{ xs: 1.5, sm: 2 }} mb={2}>
                        <Avatar
                          src={squad.user?.profilePicUrl}
                          onClick={() => squad.user?.uid && navigate(`/user/${squad.user.uid}`)}
                          sx={{
                            background: `linear-gradient(135deg, ${colors.blue.deep}, ${colors.blue.electric})`,
                            boxShadow: `0 0 0 2px ${alpha(colors.blue.electric, 0.2)}`,
                            width: { xs: 40, sm: 48 },
                            height: { xs: 40, sm: 48 },
                            cursor: squad.user?.uid ? 'pointer' : 'default',
                            transition: 'box-shadow 0.2s',
                            '&:hover': squad.user?.uid ? { boxShadow: `0 0 0 3px ${alpha(colors.blue.electric, 0.5)}` } : {},
                          }}
                        >
                          {squad.user?.displayName?.charAt(0) || squad.squadName.charAt(0)}
                        </Avatar>
                        <Box flex={1} minWidth={0}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="h6" sx={{
                              fontFamily: "'Satoshi', sans-serif",
                              fontWeight: 700,
                              fontSize: { xs: '1rem', sm: '1.125rem' },
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {squad.squadName}
                            </Typography>
                            {squad.user?.uid && (
                              <Chip
                                label="Profile"
                                size="small"
                                onClick={() => navigate(`/user/${squad.user!.uid}`)}
                                sx={{ fontSize: '0.58rem', fontWeight: 600, cursor: 'pointer', height: 18, bgcolor: alpha(colors.blue.electric, 0.1), color: colors.blue.light, border: `1px solid ${alpha(colors.blue.electric, 0.3)}`, '& .MuiChip-label': { px: 0.75 }, '&:hover': { bgcolor: alpha(colors.blue.electric, 0.2) }, flexShrink: 0 }}
                              />
                            )}
                          </Box>
                          <Typography variant="body2" sx={{
                            fontFamily: "'Satoshi', sans-serif",
                            fontWeight: 400,
                            fontSize: { xs: '0.6875rem', sm: '0.8125rem' },
                            color: alpha(colors.text.secondary, 0.55),
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {squad.user?.displayName} • Rank #{squad.rank ?? '—'} • {((squad.totalPoints || 0) + (squad.predictionBonusPoints || 0)).toFixed(2)} pts
                          </Typography>
                        </Box>
                      </Box>

                      {/* Hidden Player Section */}
                      {league?.hiddenPlayerEnabled && squad.hiddenPlayerId && (
                        <Box sx={{
                          mb: 2,
                          p: { xs: 1.5, sm: 1.75 },
                          bgcolor: alpha(colors.gold, 0.04),
                          border: '1px solid',
                          borderColor: alpha(colors.gold, 0.25),
                          borderRadius: 1.5,
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                            <Lock sx={{ fontSize: '0.875rem', color: 'warning.main' }} />
                            <Typography variant="caption" sx={{
                              fontFamily: "'Satoshi', sans-serif",
                              fontWeight: 600,
                              fontSize: { xs: '0.6875rem', sm: '0.75rem' },
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                              color: 'warning.main',
                            }}>
                              12th Hidden Player
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                            {squad.userId === user?.uid ? (
                              /* Own squad — show actual name */
                              <Typography variant="body2" sx={{
                                fontFamily: "'Satoshi', sans-serif",
                                fontWeight: 600,
                                color: 'warning.main',
                                fontSize: '0.875rem',
                              }}>
                                {squad.hiddenPlayerName}
                              </Typography>
                            ) : (
                              /* Peer squad — mask name, show gamified mystery badge */
                              <Box sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.5,
                                px: 1,
                                py: 0.25,
                                borderRadius: 1,
                                background: 'linear-gradient(90deg, rgba(255,215,0,0.12), rgba(255,140,0,0.08))',
                                border: '1px solid rgba(255,215,0,0.3)',
                              }}>
                                <Lock sx={{ fontSize: '0.875rem', color: 'warning.light' }} />
                                <Typography variant="body2" sx={{
                                  fontFamily: "'Satoshi', sans-serif",
                                  fontWeight: 700,
                                  background: 'linear-gradient(90deg, #FFD700, #FF8C00)',
                                  backgroundClip: 'text',
                                  WebkitBackgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent',
                                  letterSpacing: '0.08em',
                                  fontStyle: 'normal',
                                }}>
                                  ???
                                </Typography>
                              </Box>
                            )}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {squad.hiddenPlayerTeam && <TeamLogo team={squad.hiddenPlayerTeam} size={14} />}
                              <Typography variant="caption" sx={{
                                fontFamily: "'Satoshi', sans-serif",
                                fontSize: { xs: '0.6875rem', sm: '0.75rem' },
                                color: alpha(colors.text.primary, 0.6),
                              }}>
                                {squad.userId === user?.uid
                                  ? `${squad.hiddenPlayerTeam}`
                                  : squad.hiddenPlayerTeam}
                              </Typography>
                            </Box>
                            {squad.hiddenPlayerPoints !== undefined && squad.hiddenPlayerPoints > 0 && (
                              <Chip label={`+${squad.hiddenPlayerPoints} pts`} size="small" color="warning" variant="outlined" />
                            )}
                          </Box>
                        </Box>
                      )}

                      {/* Predictions and Powerplay Info */}
                      {(squad.predictions || squad.powerplayMatchNumber) && (
                        <Box sx={{ mb: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'stretch' }}>
                          {squad.predictions && (
                            <Box sx={{
                              flex: 1,
                              minWidth: { xs: '100%', sm: '300px' },
                              bgcolor: alpha(colors.text.primary, 0.04),
                              border: '1px solid',
                              borderColor: colors.border.subtle,
                              borderRadius: 1.5,
                              p: { xs: 1.5, sm: 1.75 }
                            }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                                <TrackChanges sx={{ fontSize: '0.875rem', color: colors.blue.electric }} />
                                <Typography variant="caption" sx={{
                                  fontFamily: "'Satoshi', sans-serif",
                                  fontWeight: 600,
                                  fontSize: { xs: '0.6875rem', sm: '0.75rem' },
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.08em',
                                  color: colors.blue.electric,
                                }}>
                                  Predictions
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                  <CricketCapIcon sx={{ fontSize: '1rem', color: '#FF9800', flexShrink: 0 }} />
                                  <Typography variant="body2" sx={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 500, fontSize: { xs: '0.8125rem', sm: '0.875rem' } }}>
                                    {squad.predictions.topRunScorer}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                  <CricketCapIcon sx={{ fontSize: '1rem', color: '#9C27B0', flexShrink: 0 }} />
                                  <Typography variant="body2" sx={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 500, fontSize: { xs: '0.8125rem', sm: '0.875rem' } }}>
                                    {squad.predictions.topWicketTaker}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                  <EmojiEvents sx={{ fontSize: '0.875rem', color: 'warning.main', flexShrink: 0 }} />
                                  <Typography variant="body2" sx={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 500, fontSize: { xs: '0.8125rem', sm: '0.875rem' } }}>
                                    {squad.predictions.winningTeam}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          )}
                          {squad.powerplayMatchNumber && (
                            <Box sx={{
                              flex: squad.predictions ? '0 0 auto' : 1,
                              minWidth: { xs: '100%', sm: '160px' },
                              bgcolor: alpha(colors.warning.primary, 0.04),
                              border: '1px solid',
                              borderColor: alpha(colors.warning.primary, 0.25),
                              borderRadius: 1.5,
                              p: { xs: 1.5, sm: 1.75 },
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center'
                            }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                                <Bolt sx={{ fontSize: '0.875rem', color: 'warning.main' }} />
                                <Typography variant="caption" sx={{
                                  fontFamily: "'Satoshi', sans-serif",
                                  fontWeight: 600,
                                  fontSize: { xs: '0.6875rem', sm: '0.75rem' },
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.08em',
                                  color: 'warning.main',
                                }}>
                                  Powerplay
                                </Typography>
                              </Box>
                              <Typography variant="body2" sx={{
                                fontFamily: "'Bebas Neue', cursive",
                                fontSize: { xs: '1rem', sm: '1.125rem' },
                                letterSpacing: '0.04em',
                                color: 'warning.main',
                              }}>
                                Match {squad.powerplayMatchNumber}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      )}

                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Typography variant="subtitle2" sx={{
                            fontFamily: "'Satoshi', sans-serif",
                            fontWeight: 500,
                            fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                          }}>
                            View Squad ({squad.players.length} players)
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 0 }}>
                          {/* Main Squad */}
                          <Box sx={{ mb: 2 }}>
                            <Box sx={{ bgcolor: colors.blue.electric, px: { xs: 1.5, sm: 2 }, py: 1 }}>
                              <Typography variant="subtitle2" color="white" sx={{
                                fontFamily: "'Satoshi', sans-serif",
                                fontWeight: 600,
                                fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                              }}>
                                Main Squad ({squadSize})
                              </Typography>
                            </Box>
                            <TableContainer sx={{ overflowX: 'auto' }}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell sx={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 500, fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Player</TableCell>
                                    <TableCell sx={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 500, fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 }, display: { xs: 'none', sm: 'table-cell' } }}>Team</TableCell>
                                    <TableCell align="center" sx={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 500, fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Picked</TableCell>
                                    <TableCell align="right" sx={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 500, fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Pts</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {mainSquad.map((player, playerIndex) => {
                                    const isCaptain = squad.captainId === player.playerId;
                                    const isViceCaptain = squad.viceCaptainId === player.playerId;
                                    const isXFactor = squad.xFactorId === player.playerId;
                                    const pickPercentage = getPickPercentage(player.playerId);

                                    return (
                                      <TableRow key={playerIndex}>
                                        <TableCell sx={{ px: { xs: 1, sm: 2 }, py: { xs: 1, sm: 1.5 } }}>
                                          <Box display="flex" alignItems="center" gap={{ xs: 0.5, sm: 1 }} flexWrap="wrap">
                                            {getRoleIcon(player.role)}
                                            <Typography variant="body2" sx={{
                                              fontFamily: "'Satoshi', sans-serif",
                                              fontWeight: 500,
                                              fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                              whiteSpace: 'nowrap',
                                              maxWidth: { xs: '100px', sm: '200px' }
                                            }}>
                                              {player.playerName}
                                            </Typography>
                                            {isCaptain && (
                                              <Chip label="C" size="small" color="warning" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, height: { xs: 16, sm: 18 }, fontWeight: 'bold' }} />
                                            )}
                                            {isViceCaptain && (
                                              <Chip label="VC" size="small" color="info" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, height: { xs: 16, sm: 18 }, fontWeight: 'bold' }} />
                                            )}
                                            {isXFactor && (
                                              <Chip label="X" size="small" color="secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, height: { xs: 16, sm: 18 }, fontWeight: 'bold' }} />
                                            )}
                                          </Box>
                                        </TableCell>
                                        <TableCell sx={{ px: { xs: 1, sm: 2 }, py: { xs: 1, sm: 1.5 }, display: { xs: 'none', sm: 'table-cell' } }}>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <TeamLogo team={player.team} size={16} />
                                            <Typography variant="body2" sx={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 400, fontSize: { xs: '0.75rem', sm: '0.875rem' }, opacity: 0.75 }}>
                                              {player.team}
                                            </Typography>
                                          </Box>
                                        </TableCell>
                                        <TableCell align="center" sx={{ px: { xs: 1, sm: 2 }, py: { xs: 1, sm: 1.5 } }}>
                                          <Chip
                                            label={`${pickPercentage}%`}
                                            size="small"
                                            color={pickPercentage >= 75 ? 'error' : pickPercentage >= 50 ? 'warning' : 'success'}
                                            sx={{ fontFamily: "'Bebas Neue', cursive", letterSpacing: '0.04em', minWidth: { xs: 45, sm: 55 }, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                                          />
                                        </TableCell>
                                        <TableCell align="right" sx={{ px: { xs: 1, sm: 2 }, py: { xs: 1, sm: 1.5 } }}>
                                          <Typography variant="body2" sx={{ fontFamily: "'Bebas Neue', cursive", fontSize: { xs: '0.875rem', sm: '1rem' }, letterSpacing: '0.04em' }}>
                                            {(player.points ?? 0).toFixed(2)}
                                          </Typography>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </Box>

                          {/* Bench */}
                          {bench.length > 0 && (
                            <Box>
                              <Box sx={{ bgcolor: alpha(colors.text.primary, 0.06), px: { xs: 1.5, sm: 2 }, py: 1 }}>
                                <Typography variant="subtitle2" sx={{
                                  fontFamily: "'Satoshi', sans-serif",
                                  fontWeight: 600,
                                  fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                                  color: colors.text.secondary,
                                }}>
                                  Bench ({bench.length})
                                </Typography>
                              </Box>
                              <TableContainer sx={{ overflowX: 'auto' }}>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 500, fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Player</TableCell>
                                      <TableCell sx={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 500, fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 }, display: { xs: 'none', sm: 'table-cell' } }}>Team</TableCell>
                                      <TableCell align="center" sx={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 500, fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Picked</TableCell>
                                      <TableCell align="right" sx={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 500, fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Pts</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {bench.map((player, playerIndex) => {
                                      const pickPercentage = getPickPercentage(player.playerId);

                                      return (
                                        <TableRow key={playerIndex} sx={{ bgcolor: 'action.hover' }}>
                                          <TableCell sx={{ px: { xs: 1, sm: 2 }, py: { xs: 1, sm: 1.5 } }}>
                                            <Box display="flex" alignItems="center" gap={{ xs: 0.5, sm: 1 }} flexWrap="wrap">
                                              {getRoleIcon(player.role)}
                                              <Typography variant="body2" sx={{
                                                fontFamily: "'Satoshi', sans-serif",
                                                fontWeight: 500,
                                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                maxWidth: { xs: '100px', sm: '200px' }
                                              }}>
                                                {player.playerName}
                                              </Typography>
                                            </Box>
                                          </TableCell>
                                          <TableCell sx={{ px: { xs: 1, sm: 2 }, py: { xs: 1, sm: 1.5 }, display: { xs: 'none', sm: 'table-cell' } }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                              <TeamLogo team={player.team} size={16} />
                                              <Typography variant="body2" sx={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 400, fontSize: { xs: '0.75rem', sm: '0.875rem' }, opacity: 0.75 }}>
                                                {player.team}
                                              </Typography>
                                            </Box>
                                          </TableCell>
                                          <TableCell align="center" sx={{ px: { xs: 1, sm: 2 }, py: { xs: 1, sm: 1.5 } }}>
                                            <Chip
                                              label={`${pickPercentage}%`}
                                              size="small"
                                              color={pickPercentage >= 75 ? 'error' : pickPercentage >= 50 ? 'warning' : 'success'}
                                              sx={{ fontFamily: "'Bebas Neue', cursive", letterSpacing: '0.04em', minWidth: { xs: 45, sm: 55 }, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                                            />
                                          </TableCell>
                                          <TableCell align="right" sx={{ px: { xs: 1, sm: 2 }, py: { xs: 1, sm: 1.5 } }}>
                                            <Typography variant="body2" sx={{ fontFamily: "'Bebas Neue', cursive", fontSize: { xs: '0.875rem', sm: '1rem' }, letterSpacing: '0.04em' }}>
                                              {(player.points ?? 0).toFixed(2)}
                                            </Typography>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Box>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Container>
      <LeagueAssistant leagueId={leagueId} />
    </Box>
  );
};

export default ViewTeamsPage;