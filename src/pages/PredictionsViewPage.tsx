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
import { EmojiEvents, TrendingUp, Sports, FlashOn, Save } from '@mui/icons-material';
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

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box mb={4}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            User Predictions Overview
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View all predictions submitted by users for the selected league
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* League Selector */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <FormControl fullWidth>
              <InputLabel>Select League</InputLabel>
              <Select
                value={selectedLeagueId}
                label="Select League"
                onChange={(e) => setSelectedLeagueId(e.target.value)}
              >
                {leagues.map((league) => (
                  <MenuItem key={league.id} value={league.id}>
                    {league.name} - {league.tournamentName} ({league.format})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedLeague && (
              <Box mt={2} display="flex" gap={2} flexWrap="wrap">
                <Chip
                  label={`${selectedLeague.participants.length} Participants`}
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  label={`${squadsWithPredictions.length} Predictions Submitted`}
                  color="success"
                  variant="outlined"
                />
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Save All Button */}
        {squadsWithPredictions.length > 0 && (
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={savingAll ? <CircularProgress size={20} color="inherit" /> : <Save />}
              onClick={handleSaveAllBonusPoints}
              disabled={savingAll || Object.keys(bonusPoints).length === 0}
            >
              {savingAll ? 'Saving & Updating Leaderboard...' : 'Save All & Update Leaderboard'}
            </Button>
          </Box>
        )}

        {/* Predictions Table */}
        {fetchingSquads ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : squadsWithPredictions.length === 0 ? (
          <Card>
            <CardContent>
              <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
                No predictions submitted yet for this league
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <TableContainer component={Paper} elevation={2}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>#</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Squad Name</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Sports fontSize="small" />
                      Top Run Scorer
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <TrendingUp fontSize="small" />
                      Top Wicket Taker
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <EmojiEvents fontSize="small" />
                      Winning Team
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <FlashOn fontSize="small" />
                      Powerplay Match
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Bonus Points</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Total Points</TableCell>
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
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="600" color="primary">
                        {squad.squadName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={squad.predictions?.topRunScorer || 'N/A'}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={squad.predictions?.topWicketTaker || 'N/A'}
                        size="small"
                        color="secondary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={squad.predictions?.winningTeam || squad.predictions?.seriesScoreline || 'N/A'}
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={squad.powerplayMatchNumber ? `Match ${squad.powerplayMatchNumber}` : 'Not Selected'}
                        size="small"
                        color={squad.powerplayMatchNumber ? 'warning' : 'default'}
                        variant="outlined"
                        icon={squad.powerplayMatchNumber ? <FlashOn /> : undefined}
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <TextField
                          size="small"
                          type="number"
                          placeholder={squad.predictionBonusPoints ? `Current: ${squad.predictionBonusPoints}` : '0'}
                          value={bonusPoints[squad.id] || ''}
                          onChange={(e) => setBonusPoints({ ...bonusPoints, [squad.id]: e.target.value })}
                          sx={{ width: 120 }}
                          inputProps={{ min: 0, step: 10 }}
                          label="Bonus Points"
                        />
                        {squad.predictionBonusPoints && squad.predictionBonusPoints > 0 && (
                          <Chip
                            label={`Current: +${squad.predictionBonusPoints}`}
                            size="small"
                            color="info"
                            sx={{ mt: 0.5 }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold" color="text.primary">
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
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Summary
              </Typography>
              <Box display="flex" gap={3} flexWrap="wrap">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Predictions
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary">
                    {squadsWithPredictions.length}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Pending Submissions
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="warning.main">
                    {selectedLeague ? selectedLeague.participants.length - squadsWithPredictions.length : 0}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Submission Rate
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">
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
