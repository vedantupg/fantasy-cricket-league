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
  CircularProgress
} from '@mui/material';
import { SportsCricket } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leagueService } from '../services/firestore';
import { isValidLeagueCode } from '../utils/leagueCode';
import AppHeader from '../components/common/AppHeader';
import type { League } from '../types/database';

const JoinLeaguePage: React.FC = () => {
  const [leagueCode, setLeagueCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [foundLeague, setFoundLeague] = useState<League | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  
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
      <AppHeader 
        title="Join League"
        subtitle="Enter a league code to join"
        showBack={true}
        backPath="/dashboard"
        backLabel="Back to My Leagues"
      />
      
      <Container maxWidth="sm" sx={{ py: 4 }}>

      <Card>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <SportsCricket sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          
          <Typography variant="h5" gutterBottom>
            Enter League Code
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={3}>
            Get the league code from your league admin
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
              setFoundLeague(null);
              setError('');
            }}
            placeholder="e.g., ABC123"
            inputProps={{ maxLength: 6 }}
            sx={{ mb: 3 }}
          />

          {!foundLeague ? (
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
          ) : (
            <Box>
              <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {foundLeague.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {foundLeague.tournamentName} • {foundLeague.format}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {foundLeague.participants.length}/{foundLeague.maxParticipants} participants
                </Typography>
              </Card>
              
              <Box display="flex" gap={2}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setFoundLeague(null);
                    setLeagueCode('');
                  }}
                  sx={{ flex: 1 }}
                >
                  Search Again
                </Button>
                <Button
                  variant="contained"
                  onClick={handleJoinLeague}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : undefined}
                  sx={{ flex: 1 }}
                >
                  {loading ? 'Joining...' : 'Join League'}
                </Button>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
      </Container>
    </Box>
  );
};

export default JoinLeaguePage;