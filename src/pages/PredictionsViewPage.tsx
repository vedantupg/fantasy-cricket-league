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
  Avatar,
} from '@mui/material';
import { EmojiEvents, TrendingUp, Sports } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leagueService, squadService } from '../services/firestore';
import type { League, LeagueSquad } from '../types/database';
import AppHeader from '../components/common/AppHeader';

const PredictionsViewPage: React.FC = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
  const [squads, setSquads] = useState<LeagueSquad[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingSquads, setFetchingSquads] = useState(false);
  const [error, setError] = useState('');

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
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>User</TableCell>
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
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
                          {squad.userId.slice(0, 2).toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" fontWeight="medium">
                          User {squad.userId.slice(0, 8)}
                        </Typography>
                      </Box>
                    </TableCell>
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
                      <Typography variant="body2" fontWeight="bold" color="text.primary">
                        {squad.totalPoints.toFixed(2)}
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
