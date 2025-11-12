import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Collapse
} from '@mui/material';
import { SportsCricket, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leagueService } from '../services/firestore';
import { isValidLeagueCode } from '../utils/leagueCode';
import AppHeader from '../components/common/AppHeader';
import LeagueRulesDisplay from '../components/league/LeagueRulesDisplay';
import type { League } from '../types/database';

const JoinLeaguePage: React.FC = () => {
  const [leagueCode, setLeagueCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [foundLeague, setFoundLeague] = useState<League | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showRules, setShowRules] = useState(true);

  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSearchLeague = async () => {
    if (!leagueCode.trim()) return;

    if (!isValidLeagueCode(leagueCode.toUpperCase())) {
      setError('Please enter a valid 6-character league code');
      return;
    }

    try {
      setSearchLoading(true);
      setError('');
      setFoundLeague(null);
      
      const league = await leagueService.getByCode(leagueCode);
      
      if (league) {
        setFoundLeague(league);
      } else {
        setError('No leagues found for this code');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search for league');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleJoinLeague = async () => {
    if (!user || !foundLeague) return;

    try {
      setLoading(true);
      setError('');
      
      await leagueService.joinLeague(foundLeague.id, user.uid);
      
      // Navigate to league page
      navigate(`/leagues/${foundLeague.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to join league');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <AppHeader />

      <Container maxWidth={foundLeague ? "lg" : "sm"} sx={{ py: 4 }}>
        {!foundLeague ? (
          <Card>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <SportsCricket sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />

              <Typography variant="h4" fontWeight="bold" gutterBottom>
                Join League
              </Typography>
              <Typography variant="body1" color="text.secondary" mb={3}>
                Enter a league code to join
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <TextField
                fullWidth
                label="League Code"
                value={leagueCode}
                onChange={(e) => {
                  setLeagueCode(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="e.g., ABC123"
                inputProps={{ maxLength: 6 }}
                sx={{ mb: 3 }}
              />

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleSearchLeague}
                disabled={searchLoading || !leagueCode.trim()}
                startIcon={searchLoading ? <CircularProgress size={20} /> : undefined}
              >
                {searchLoading ? 'Searching...' : 'Search League'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Box>
            {/* League Header with Join Actions */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
                  <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                      {foundLeague.name}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {foundLeague.tournamentName} • {foundLeague.format}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      {foundLeague.participants.length}/{foundLeague.maxParticipants} participants
                    </Typography>
                  </Box>
                  <Box display="flex" gap={2}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setFoundLeague(null);
                        setLeagueCode('');
                        setShowRules(true);
                      }}
                    >
                      Search Again
                    </Button>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={handleJoinLeague}
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} color="inherit" /> : undefined}
                    >
                      {loading ? 'Joining...' : 'Join League'}
                    </Button>
                  </Box>
                </Box>

                {error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* League Rules Toggle */}
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setShowRules(!showRules)}
              endIcon={showRules ? <ExpandLess /> : <ExpandMore />}
              sx={{ mb: 2 }}
            >
              {showRules ? 'Hide League Rules' : 'Show League Rules'}
            </Button>

            {/* League Rules Details */}
            <Collapse in={showRules}>
              <LeagueRulesDisplay league={foundLeague} />
            </Collapse>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default JoinLeaguePage;