import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  CircularProgress,
  Alert
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { leagueService } from '../services/firestore';
import AppHeader from '../components/common/AppHeader';
import LeagueNav from '../components/common/LeagueNav';
import LeagueRulesDisplay from '../components/league/LeagueRulesDisplay';
import type { League } from '../types/database';

const LeagueRulesPage: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadLeague = async () => {
      if (!leagueId) return;

      try {
        setLoading(true);
        const leagueData = await leagueService.getById(leagueId);

        if (leagueData) {
          setLeague(leagueData);
        } else {
          setError('League not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load league');
        console.error('Error loading league:', err);
      } finally {
        setLoading(false);
      }
    };

    if (leagueId) {
      loadLeague();
    }
  }, [leagueId]);

  if (loading) {
    return (
      <Box>
        <AppHeader />
        {leagueId && (
          <LeagueNav
            leagueName="Loading..."
            leagueId={leagueId}
            currentPage="Rules"
          />
        )}
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
          <CircularProgress size={60} />
        </Box>
      </Box>
    );
  }

  if (error || !league) {
    return (
      <Box>
        <AppHeader />
        {leagueId && league && (
          <LeagueNav
            leagueName={league.name}
            leagueId={leagueId}
            currentPage="Rules"
          />
        )}
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3, md: 4 } }}>
          <Alert severity="error">{error || 'League not found'}</Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <AppHeader />
      {leagueId && (
        <LeagueNav
          leagueName={league.name}
          leagueId={leagueId}
          currentPage="Rules"
        />
      )}

      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3, md: 4 } }}>
        <LeagueRulesDisplay league={league} />
      </Container>
    </Box>
  );
};

export default LeagueRulesPage;
