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
import {
  ExpandMore,
  Groups,
  Search,
  Close
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leagueService, squadService, userService } from '../services/firestore';
import AppHeader from '../components/common/AppHeader';
import LeagueNav from '../components/common/LeagueNav';
import type { League, LeagueSquad, User } from '../types/database';

interface SquadWithUser extends LeagueSquad {
  user?: User;
}

const ViewTeamsPage: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user } = useAuth();
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

        const [leagueData, squadsData] = await Promise.all([
          leagueService.getById(leagueId),
          squadService.getByLeague(leagueId)
        ]);

        if (leagueData) {
          setLeague(leagueData);

          // Check if current user has submitted their squad
          const currentUserSquad = squadsData.find(squad => squad.userId === user?.uid);

          if (!currentUserSquad || !currentUserSquad.isSubmitted) {
            setError('You must submit your squad before viewing other participants.');
            return;
          }

          // Fetch user data for each squad
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
    switch (role) {
      case 'batsman': return '🏏';
      case 'bowler': return '⚾';
      case 'allrounder': return '🌟';
      case 'wicketkeeper': return '🥅';
      default: return '👤';
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

      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3 } }}>
        {/* League Info */}
        <Card sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={{ xs: 1, sm: 2 }} mb={2} flexWrap="wrap">
              <Groups color="primary" sx={{ fontSize: { xs: 20, sm: 24 } }} />
              <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                {league?.name}
              </Typography>
              <Chip label={league?.format} size="small" />
              <Chip
                label={`${squads.length} Teams`}
                color="primary"
                variant="outlined"
                size="small"
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
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
          <Card sx={{ mb: { xs: 2, sm: 3 } }}>
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
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Showing {filteredSquads.length} of {squads.length} teams
                </Typography>
              )}
            </CardContent>
          </Card>
        )}

        {/* Teams List */}
        {squads.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: { xs: 4, sm: 8 } }}>
            <CardContent>
              <Groups sx={{ fontSize: { xs: 60, sm: 80 }, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                No Teams Submitted Yet
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                Waiting for players to submit their squads...
              </Typography>
            </CardContent>
          </Card>
        ) : filteredSquads.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: { xs: 4, sm: 8 } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
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
                <Card>
                  <CardContent sx={{ p: { xs: 2, sm: 2, md: 3 } }}>
                    <Box display="flex" alignItems="center" gap={{ xs: 1.5, sm: 2 }}>
                      <Avatar
                        src={squad.user?.profilePicUrl}
                        sx={{
                          bgcolor: 'primary.main',
                          width: { xs: 48, sm: 56 },
                          height: { xs: 48, sm: 56 }
                        }}
                      >
                        {squad.user?.displayName?.charAt(0) || squad.squadName.charAt(0)}
                      </Avatar>
                      <Box flex={1} minWidth={0}>
                        <Typography variant="h6" fontWeight="bold" sx={{
                          fontSize: { xs: '1rem', sm: '1.1rem' },
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {squad.user?.displayName || 'Unknown Player'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {squad.squadName}
                        </Typography>
                      </Box>
                      {squad.isSubmitted && (
                        <Chip
                          label="Submitted"
                          color="success"
                          size="small"
                          sx={{ flexShrink: 0 }}
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          // After league starts: Show full team details
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            {filteredSquads.map((squad, index) => {
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
                  <Card>
                    <CardContent sx={{ p: { xs: 2, sm: 2, md: 3 } }}>
                      <Box display="flex" alignItems="center" gap={{ xs: 1.5, sm: 2 }} mb={2}>
                        <Avatar
                          src={squad.user?.profilePicUrl}
                          sx={{
                            bgcolor: 'primary.main',
                            width: { xs: 40, sm: 48 },
                            height: { xs: 40, sm: 48 }
                          }}
                        >
                          {squad.user?.displayName?.charAt(0) || squad.squadName.charAt(0)}
                        </Avatar>
                        <Box flex={1} minWidth={0}>
                          <Typography variant="h6" fontWeight="bold" sx={{
                            fontSize: { xs: '1rem', sm: '1.25rem' },
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {squad.squadName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {squad.user?.displayName} • Rank #{squad.rank || index + 1} • {(squad.totalPoints || 0) + (squad.predictionBonusPoints || 0)} points
                          </Typography>
                        </Box>
                        {squad.isSubmitted && (
                          <Chip
                            label="Submitted"
                            color="success"
                            size="small"
                            sx={{ flexShrink: 0 }}
                          />
                        )}
                      </Box>

                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Typography variant="subtitle2" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                            View Squad ({squad.players.length} players)
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 0 }}>
                          {/* Main Squad */}
                          <Box sx={{ mb: 2 }}>
                            <Box sx={{ bgcolor: 'primary.main', px: { xs: 1.5, sm: 2 }, py: 1 }}>
                              <Typography variant="subtitle2" color="white" fontWeight="bold" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                Main Squad ({squadSize})
                              </Typography>
                            </Box>
                            <TableContainer sx={{ overflowX: 'auto' }}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Player</TableCell>
                                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 }, display: { xs: 'none', sm: 'table-cell' } }}>Team</TableCell>
                                    <TableCell align="center" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Picked</TableCell>
                                    <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Pts</TableCell>
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
                                            <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                              {getRoleIcon(player.role)}
                                            </Typography>
                                            <Typography variant="body2" fontWeight="medium" sx={{
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
                                          <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                            {player.team}
                                          </Typography>
                                        </TableCell>
                                        <TableCell align="center" sx={{ px: { xs: 1, sm: 2 }, py: { xs: 1, sm: 1.5 } }}>
                                          <Chip
                                            label={`${pickPercentage}%`}
                                            size="small"
                                            color={pickPercentage >= 75 ? 'error' : pickPercentage >= 50 ? 'warning' : 'success'}
                                            sx={{ fontWeight: 'bold', minWidth: { xs: 45, sm: 55 }, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                                          />
                                        </TableCell>
                                        <TableCell align="right" sx={{ px: { xs: 1, sm: 2 }, py: { xs: 1, sm: 1.5 } }}>
                                          <Typography variant="body2" fontWeight="medium" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                            {player.points}
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
                              <Box sx={{ bgcolor: 'action.hover', px: { xs: 1.5, sm: 2 }, py: 1 }}>
                                <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  Bench ({bench.length})
                                </Typography>
                              </Box>
                              <TableContainer sx={{ overflowX: 'auto' }}>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Player</TableCell>
                                      <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 }, display: { xs: 'none', sm: 'table-cell' } }}>Team</TableCell>
                                      <TableCell align="center" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Picked</TableCell>
                                      <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Pts</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {bench.map((player, playerIndex) => {
                                      const pickPercentage = getPickPercentage(player.playerId);

                                      return (
                                        <TableRow key={playerIndex} sx={{ bgcolor: 'action.hover' }}>
                                          <TableCell sx={{ px: { xs: 1, sm: 2 }, py: { xs: 1, sm: 1.5 } }}>
                                            <Box display="flex" alignItems="center" gap={{ xs: 0.5, sm: 1 }} flexWrap="wrap">
                                              <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                {getRoleIcon(player.role)}
                                              </Typography>
                                              <Typography variant="body2" fontWeight="medium" sx={{
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
                                            <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                              {player.team}
                                            </Typography>
                                          </TableCell>
                                          <TableCell align="center" sx={{ px: { xs: 1, sm: 2 }, py: { xs: 1, sm: 1.5 } }}>
                                            <Chip
                                              label={`${pickPercentage}%`}
                                              size="small"
                                              color={pickPercentage >= 75 ? 'error' : pickPercentage >= 50 ? 'warning' : 'success'}
                                              sx={{ fontWeight: 'bold', minWidth: { xs: 45, sm: 55 }, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                                            />
                                          </TableCell>
                                          <TableCell align="right" sx={{ px: { xs: 1, sm: 2 }, py: { xs: 1, sm: 1.5 } }}>
                                            <Typography variant="body2" fontWeight="medium" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                              {player.points}
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
    </Box>
  );
};

export default ViewTeamsPage;