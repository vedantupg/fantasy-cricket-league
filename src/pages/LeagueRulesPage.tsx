import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  CircularProgress,
  Alert,
  Typography,
  Card,
  CardContent
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { leagueService } from '../services/firestore';
import AppHeader from '../components/common/AppHeader';
import LeagueNav from '../components/common/LeagueNav';
import LeagueRulesDisplay from '../components/league/LeagueRulesDisplay';
import LeagueAssistant from '../components/LeagueAssistant';
import type { League } from '../types/database';
import colors from '../theme/colors';
import { alpha } from '@mui/material/styles';

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
            League Rules
          </Typography>
          <Typography variant="body2" sx={{ color: alpha(colors.text.secondary, 0.6), mt: 0.4 }}>
            {league.tournamentName} • {league.format} Format
          </Typography>
        </Box>
        <Card sx={cardSx}>
          <CardContent>
            <LeagueRulesDisplay league={league} />
          </CardContent>
        </Card>
      </Container>
      <LeagueAssistant leagueId={leagueId} />
    </Box>
  );
};

export default LeagueRulesPage;
