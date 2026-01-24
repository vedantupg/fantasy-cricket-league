import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  TextField,
  Button,
} from '@mui/material';
import { EmojiEvents, TrendingUp, Sports, Save } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leagueService, squadService, leaderboardSnapshotService } from '../services/firestore';
import type { League, LeagueSquad } from '../types/database';
import AppHeader from '../components/common/AppHeader';

const PredictionsViewPage: React.FC = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
  const [squads, setSquads] = useState<LeagueSquad[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingSquads, setFetchingSquads] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bonusPoints, setBonusPoints] = useState<{ [squadId: string]: string }>({});
  const [savingAll, setSavingAll] = useState(false);

  const { user, userData } = useAuth();
  const navigate = useNavigate();

  // Redirect if not admin
  useEffect(() => {
    if (userData && !userData.isAdmin) {
      navigate('/');
    }
  }, [userData, navigate]);

  // Fetch all leagues
  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        setLoading(true);
        setError('');

        // Get all leagues (for admins, we'll show all)
        const allLeagues = await leagueService.getForUser(user!.uid);
        setLeagues(allLeagues);

        if (allLeagues.length > 0) {
          setSelectedLeagueId(allLeagues[0].id);
        }
      } catch (err: any) {
        console.error('Error fetching leagues:', err);
        setError(err.message || 'Failed to load leagues');
      } finally {
        setLoading(false);
      }
    };

    if (userData?.isAdmin) {
      fetchLeagues();
    }
  }, [user, userData]);

  // Fetch squads when league is selected
  useEffect(() => {
    const fetchSquads = async () => {
      if (!selectedLeagueId) return;

      try {
        setFetchingSquads(true);
        setError('');

        const leagueSquads = await squadService.getByLeague(selectedLeagueId);
        setSquads(leagueSquads);
      } catch (err: any) {
        console.error('Error fetching squads:', err);
        setError(err.message || 'Failed to load predictions');
      } finally {
        setFetchingSquads(false);
      }
    };

    fetchSquads();
  }, [selectedLeagueId]);

  // Function to save all bonus points and update leaderboard
  const handleSaveAllBonusPoints = async () => {
    if (!selectedLeagueId) {
      setError('No league selected');
      return;
    }

    try {
      setSavingAll(true);
      setError('');
      setSuccess('');

      // Collect all squads that have bonus points to update
      const updates: Promise<void>[] = [];
      const updatedSquads = [...squads];

      Object.entries(bonusPoints).forEach(([squadId, pointsStr]) => {
        const points = parseInt(pointsStr || '0');

        if (!isNaN(points) && points >= 0) {
          // Create update promise
          updates.push(
            squadService.update(squadId, {
              predictionBonusPoints: points,
            })
          );

          // Update local state
          const squadIndex = updatedSquads.findIndex(s => s.id === squadId);
          if (squadIndex !== -1) {
            updatedSquads[squadIndex] = {
              ...updatedSquads[squadIndex],
              predictionBonusPoints: points
            };
          }
        }
      });

      // Wait for all updates to complete
      if (updates.length > 0) {
        await Promise.all(updates);

        // Update local state
        setSquads(updatedSquads);

        // Clear all inputs
        setBonusPoints({});

        // Create new leaderboard snapshot with updated points
        await leaderboardSnapshotService.create(selectedLeagueId);

        setSuccess(`Successfully updated ${updates.length} squad(s) and refreshed the leaderboard!`);
      } else {
        setError('No valid bonus points to save');
      }
    } catch (err: any) {
      console.error('Error saving bonus points:', err);
      setError(err.message || 'Failed to save bonus points');
    } finally {
      setSavingAll(false);
    }
  };

  if (!userData?.isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <Box>
        <AppHeader />
        <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </Box>
    );
  }

  const selectedLeague = leagues.find(l => l.id === selectedLeagueId);
  const squadsWithPredictions = squads.filter(s => s.predictions && s.isSubmitted);

  return (
    <Box>
      <AppHeader />

      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3 } }}>
        {/* Header */}
        <Box mb={{ xs: 2, sm: 3, md: 4 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}>
            User Predictions Overview
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            View all predictions submitted by users for the selected league
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: { xs: 2, sm: 3 }, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: { xs: 2, sm: 3 }, fontSize: { xs: '0.875rem', sm: '1rem' } }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* League Selector */}
        <Card sx={{ mb: { xs: 2, sm: 3 } }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <FormControl fullWidth>
              <InputLabel sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Select League</InputLabel>
              <Select
                value={selectedLeagueId}
                label="Select League"
                onChange={(e) => setSelectedLeagueId(e.target.value)}
                sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
              >
                {leagues.map((league) => (
                  <MenuItem key={league.id} value={league.id} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                    {league.name} - {league.tournamentName} ({league.format})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedLeague && (
              <Box mt={{ xs: 1.5, sm: 2 }} display="flex" gap={{ xs: 1, sm: 2 }} flexWrap="wrap">
                <Chip
                  label={`${selectedLeague.participants.length} Participants`}
                  color="primary"
                  variant="outlined"
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, height: { xs: 28, sm: 32 } }}
                />
                <Chip
                  label={`${squadsWithPredictions.length} Predictions Submitted`}
                  color="success"
                  variant="outlined"
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, height: { xs: 28, sm: 32 } }}
                />
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Save All Button */}
        {squadsWithPredictions.length > 0 && (
          <Box sx={{ mb: { xs: 2, sm: 3 }, display: 'flex', justifyContent: { xs: 'stretch', sm: 'flex-end' } }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              fullWidth={{ xs: true, sm: false }}
              startIcon={savingAll ? <CircularProgress size={20} color="inherit" /> : <Save />}
              onClick={handleSaveAllBonusPoints}
              disabled={savingAll || Object.keys(bonusPoints).length === 0}
              sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, py: { xs: 1, sm: 1.5 } }}
            >
              {savingAll ? 'Saving & Updating...' : 'Save All & Update'}
            </Button>
          </Box>
        )}

        {/* Predictions Table */}
        {fetchingSquads ? (
          <Box display="flex" justifyContent="center" py={{ xs: 3, sm: 4 }}>
            <CircularProgress />
          </Box>
        ) : squadsWithPredictions.length === 0 ? (
          <Card>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography variant="body1" color="text.secondary" textAlign="center" py={{ xs: 3, sm: 4 }} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                No predictions submitted yet for this league
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <TableContainer component={Paper} elevation={2} sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: { xs: 600, sm: 650 } }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 }, display: { xs: 'none', sm: 'table-cell' } }}>#</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Squad Name</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>
                    <Box display="flex" alignItems="center" gap={{ xs: 0.5, sm: 1 }}>
                      <Sports sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                      <span>Top Run Scorer</span>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>
                    <Box display="flex" alignItems="center" gap={{ xs: 0.5, sm: 1 }}>
                      <TrendingUp sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                      <span>Top Wicket Taker</span>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>
                    <Box display="flex" alignItems="center" gap={{ xs: 0.5, sm: 1 }}>
                      <EmojiEvents sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                      <span>Winning Team</span>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Bonus Points</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 }, display: { xs: 'none', sm: 'table-cell' } }}>Total Points</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {squadsWithPredictions.map((squad, index) => (
                  <TableRow
                    key={squad.id}
                    sx={{
                      '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                      '&:hover': { bgcolor: 'action.selected' }
                    }}
                  >
                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 }, display: { xs: 'none', sm: 'table-cell' } }}>{index + 1}</TableCell>
                    <TableCell sx={{ px: { xs: 1, sm: 2 } }}>
                      <Typography variant="body2" fontWeight="600" color="primary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {squad.squadName}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ px: { xs: 1, sm: 2 } }}>
                      <Chip
                        label={squad.predictions?.topRunScorer || 'N/A'}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, height: { xs: 22, sm: 24 } }}
                      />
                    </TableCell>
                    <TableCell sx={{ px: { xs: 1, sm: 2 } }}>
                      <Chip
                        label={squad.predictions?.topWicketTaker || 'N/A'}
                        size="small"
                        color="secondary"
                        variant="outlined"
                        sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, height: { xs: 22, sm: 24 } }}
                      />
                    </TableCell>
                    <TableCell sx={{ px: { xs: 1, sm: 2 } }}>
                      <Chip
                        label={squad.predictions?.winningTeam || squad.predictions?.seriesScoreline || 'N/A'}
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, height: { xs: 22, sm: 24 } }}
                      />
                    </TableCell>
                    <TableCell sx={{ px: { xs: 1, sm: 2 } }}>
                      <Box>
                        <TextField
                          size="small"
                          type="number"
                          placeholder={squad.predictionBonusPoints ? `Current: ${squad.predictionBonusPoints}` : '0'}
                          value={bonusPoints[squad.id] || ''}
                          onChange={(e) => setBonusPoints({ ...bonusPoints, [squad.id]: e.target.value })}
                          sx={{ width: { xs: 90, sm: 120 } }}
                          inputProps={{ min: 0, step: 10, style: { fontSize: '0.875rem' } }}
                          label="Bonus Points"
                        />
                        {squad.predictionBonusPoints && squad.predictionBonusPoints > 0 && (
                          <Chip
                            label={`Current: +${squad.predictionBonusPoints}`}
                            size="small"
                            color="info"
                            sx={{ mt: 0.5, fontSize: { xs: '0.65rem', sm: '0.7rem' }, height: { xs: 18, sm: 20 } }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 }, display: { xs: 'none', sm: 'table-cell' } }}>
                      <Typography variant="body2" fontWeight="bold" color="text.primary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {((squad.totalPoints || 0) + (squad.predictionBonusPoints || 0)).toFixed(2)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Summary Statistics */}
        {squadsWithPredictions.length > 0 && (
          <Card sx={{ mt: { xs: 2, sm: 3 } }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                Summary
              </Typography>
              <Box display="flex" gap={{ xs: 2, sm: 3 }} flexWrap="wrap">
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Total Predictions
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                    {squadsWithPredictions.length}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Pending Submissions
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="warning.main" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                    {selectedLeague ? selectedLeague.participants.length - squadsWithPredictions.length : 0}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Submission Rate
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                    {selectedLeague
                      ? Math.round((squadsWithPredictions.length / selectedLeague.participants.length) * 100)
                      : 0}%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
      </Container>
    </Box>
  );
};

export default PredictionsViewPage;
