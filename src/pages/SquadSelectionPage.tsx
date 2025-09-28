import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  SportsCricket,
  ArrowBack
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppHeader from '../components/common/AppHeader';

const SquadSelectionPage: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const quickActions = (
    <Button
      variant="outlined"
      onClick={() => navigate(`/leagues/${leagueId}`)}
    >
      ← Back to League
    </Button>
  );

  useEffect(() => {
    // TODO: Load squad data
    setTimeout(() => setLoading(false), 1000);
  }, [leagueId]);

  if (loading) {
    return (
      <Box>
        <AppHeader 
          title="Squad Selection"
          subtitle="Pick your 11 players for the tournament"
          actions={quickActions}
        />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
          <CircularProgress size={60} />
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <AppHeader 
        title="Squad Selection"
        subtitle="Pick your 11 players for the tournament"
        actions={quickActions}
      />
      <Container maxWidth="lg" sx={{ py: 4 }}>

      <Card>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <SportsCricket sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Squad Selection Coming Soon
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This feature is under development. You'll be able to select your 11 players here.
          </Typography>
        </CardContent>
      </Card>
      </Container>
    </Box>
  );
};

export default SquadSelectionPage;