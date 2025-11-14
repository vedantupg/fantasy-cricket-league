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
  TableRow
} from '@mui/material';
import {
  ExpandMore,
  Groups
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { leagueService, squadService, userService } from '../services/firestore';
import AppHeader from '../components/common/AppHeader';
import LeagueNav from '../components/common/LeagueNav';
import type { League, LeagueSquad, User } from '../types/database';

interface SquadWithUser extends LeagueSquad {
  user?: User;
}

const ViewTeamsPage: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [league, setLeague] = useState<League | null>(null);
  const [squads, setSquads] = useState<SquadWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

          // Check if league has started
          const leagueStarted = new Date() > new Date(leagueData.startDate);
          if (!leagueStarted) {
            setError('Squad teams are not visible until the league starts.');
            return;
          }

          // Fetch user data for each squad
          const squadsWithUsers = await Promise.all(
            squadsData.map(async (squad) => {
              try {
                const user = await userService.getById(squad.userId);
                return { ...squad, user: user || undefined };
              } catch (err) {
                console.error(`Error fetching user ${squad.userId}:`, err);
                return { ...squad, user: undefined };
              }
            })
          );

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

    if (leagueId) {
      loadData();
    }
  }, [leagueId]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'batsman': return '🏏';
      case 'bowler': return '⚾';
      case 'allrounder': return '🌟';
      case 'wicketkeeper': return '🥅';
      default: return '👤';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'batsman': return 'primary';
      case 'bowler': return 'secondary';
      case 'allrounder': return 'success';
      case 'wicketkeeper': return 'warning';
      default: return 'default';
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
      
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* League Info */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Groups color="primary" />
              <Typography variant="h6" fontWeight="bold">
                {league?.name}
              </Typography>
              <Chip label={league?.format} />
              <Chip 
                label={`${squads.length} Teams`} 
                color="primary" 
                variant="outlined" 
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {league?.tournamentName} • Squad deadline: {new Date(league?.squadDeadline || '').toLocaleString()}
            </Typography>
          </CardContent>
        </Card>

        {/* Teams List */}
        {squads.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: 8 }}>
            <CardContent>
              <Groups sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                No Teams Submitted Yet
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Waiting for players to submit their squads...
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {squads.map((squad, index) => {
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
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={2} mb={2}>
                        <Avatar
                          src={squad.user?.profilePicUrl}
                          sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}
                        >
                          {squad.user?.displayName?.charAt(0) || squad.squadName.charAt(0)}
                        </Avatar>
                        <Box flex={1}>
                          <Typography variant="h6" fontWeight="bold">
                            {squad.squadName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {squad.user?.displayName} • Rank #{squad.rank || index + 1} • {squad.totalPoints} points
                          </Typography>
                        </Box>
                        {squad.isSubmitted && (
                          <Chip
                            label="Submitted"
                            color="success"
                            size="small"
                          />
                        )}
                      </Box>

                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Typography variant="subtitle2">
                            View Squad ({squad.players.length} players)
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 0 }}>
                          {/* Main Squad */}
                          <Box sx={{ mb: 2 }}>
                            <Box sx={{ bgcolor: 'primary.main', px: 2, py: 1 }}>
                              <Typography variant="subtitle2" color="white" fontWeight="bold">
                                Main Squad ({squadSize})
                              </Typography>
                            </Box>
                            <TableContainer>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Player</TableCell>
                                    <TableCell>Team</TableCell>
                                    <TableCell align="center">Picked</TableCell>
                                    <TableCell align="right">Points</TableCell>
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
                                        <TableCell>
                                          <Box display="flex" alignItems="center" gap={1}>
                                            <Typography variant="body2">
                                              {getRoleIcon(player.role)}
                                            </Typography>
                                            <Typography variant="body2" fontWeight="medium">
                                              {player.playerName}
                                            </Typography>
                                            {isCaptain && (
                                              <Chip label="C" size="small" color="warning" sx={{ fontSize: '0.7rem', height: 18, fontWeight: 'bold' }} />
                                            )}
                                            {isViceCaptain && (
                                              <Chip label="VC" size="small" color="info" sx={{ fontSize: '0.7rem', height: 18, fontWeight: 'bold' }} />
                                            )}
                                            {isXFactor && (
                                              <Chip label="X" size="small" color="secondary" sx={{ fontSize: '0.7rem', height: 18, fontWeight: 'bold' }} />
                                            )}
                                          </Box>
                                        </TableCell>
                                        <TableCell>
                                          <Typography variant="body2">
                                            {player.team}
                                          </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                          <Chip
                                            label={`${pickPercentage}%`}
                                            size="small"
                                            color={pickPercentage >= 75 ? 'error' : pickPercentage >= 50 ? 'warning' : 'success'}
                                            sx={{ fontWeight: 'bold', minWidth: 55 }}
                                          />
                                        </TableCell>
                                        <TableCell align="right">
                                          <Typography variant="body2" fontWeight="medium">
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
                              <Box sx={{ bgcolor: 'action.hover', px: 2, py: 1 }}>
                                <Typography variant="subtitle2" fontWeight="bold">
                                  Bench ({bench.length})
                                </Typography>
                              </Box>
                              <TableContainer>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Player</TableCell>
                                      <TableCell>Team</TableCell>
                                      <TableCell align="center">Picked</TableCell>
                                      <TableCell align="right">Points</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {bench.map((player, playerIndex) => {
                                      const pickPercentage = getPickPercentage(player.playerId);

                                      return (
                                        <TableRow key={playerIndex} sx={{ bgcolor: 'action.hover' }}>
                                          <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                              <Typography variant="body2">
                                                {getRoleIcon(player.role)}
                                              </Typography>
                                              <Typography variant="body2" fontWeight="medium">
                                                {player.playerName}
                                              </Typography>
                                            </Box>
                                          </TableCell>
                                          <TableCell>
                                            <Typography variant="body2">
                                              {player.team}
                                            </Typography>
                                          </TableCell>
                                          <TableCell align="center">
                                            <Chip
                                              label={`${pickPercentage}%`}
                                              size="small"
                                              color={pickPercentage >= 75 ? 'error' : pickPercentage >= 50 ? 'warning' : 'success'}
                                              sx={{ fontWeight: 'bold', minWidth: 55 }}
                                            />
                                          </TableCell>
                                          <TableCell align="right">
                                            <Typography variant="body2" fontWeight="medium">
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