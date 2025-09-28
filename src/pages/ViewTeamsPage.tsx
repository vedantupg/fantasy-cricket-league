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
  Paper
} from '@mui/material';
import {
  ExpandMore,
  Person,
  Groups,
  Star
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leagueService, squadService } from '../services/firestore';
import AppHeader from '../components/common/AppHeader';
import type { League, LeagueSquad } from '../types/database';

const ViewTeamsPage: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user } = useAuth();
  const [league, setLeague] = useState<League | null>(null);
  const [squads, setSquads] = useState<LeagueSquad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (leagueId) {
      loadData();
    }
  }, [leagueId]);

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
        
        // Check if squad deadline has passed
        const deadlinePassed = new Date() > new Date(leagueData.squadDeadline);
        if (!deadlinePassed) {
          setError('Squad teams are not visible until the registration deadline passes.');
          return;
        }
        
        setSquads(squadsData);
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

  if (loading) {
    return (
      <Box>
        <AppHeader 
          title="League Teams"
          showBack={true}
          backPath={`/leagues/${leagueId}`}
        />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
          <CircularProgress size={60} />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <AppHeader 
          title="League Teams"
          showBack={true}
          backPath={`/leagues/${leagueId}`}
        />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <AppHeader 
        title={`${league?.name} - Teams`}
        subtitle="View all submitted squads"
        showBack={true}
        backPath={`/leagues/${leagueId}`}
      />
      
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
            {squads.map((squad, index) => (
              <Grid size={{ xs: 12, lg: 6 }} key={squad.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {squad.squadName.charAt(0)}
                      </Avatar>
                      <Box flex={1}>
                        <Typography variant="h6" fontWeight="bold">
                          {squad.squadName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Rank #{squad.rank || index + 1} • {squad.totalPoints} points
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
                      <AccordionDetails>
                        <TableContainer component={Paper} variant="outlined">
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Player</TableCell>
                                <TableCell>Team</TableCell>
                                <TableCell>Role</TableCell>
                                <TableCell align="right">Points</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {squad.players.map((player, playerIndex) => (
                                <TableRow key={playerIndex}>
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
                                  <TableCell>
                                    <Chip 
                                      label={player.role.replace('keeper', '')} 
                                      size="small"
                                      color={getRoleColor(player.role) as any}
                                      variant="outlined"
                                    />
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2" fontWeight="medium">
                                      {player.points}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </AccordionDetails>
                    </Accordion>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default ViewTeamsPage;