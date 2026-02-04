import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@mui/material';
import { ArrowBack, Upload, Preview } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leagueService } from '../services/firestore';
import AppHeader from '../components/common/AppHeader';
import LeagueNav from '../components/common/LeagueNav';
import MatchScheduleViewer from '../components/schedule/MatchScheduleViewer';
import { parseMatchSchedule } from '../utils/scheduleParser';
import type { League, ScheduleMatch } from '../types/database';
import colors from '../theme/colors';
import { alpha } from '@mui/material';

const ScheduleUploadPage: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scheduleText, setScheduleText] = useState('');
  const [parsedMatches, setParsedMatches] = useState<ScheduleMatch[]>([]);
  const [parseError, setParseError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = league && user && (league.creatorId === user.uid || league.adminIds.includes(user.uid));

  useEffect(() => {
    const loadLeague = async () => {
      if (!leagueId) return;

      try {
        setLoading(true);
        const leagueData = await leagueService.getById(leagueId);

        if (!leagueData) {
          setError('League not found');
          return;
        }

        if (!isAdmin && leagueData.creatorId !== user?.uid && !leagueData.adminIds.includes(user?.uid || '')) {
          setError('You do not have permission to access this page');
          return;
        }

        setLeague(leagueData);

        // Pre-populate with existing schedule if any
        if (leagueData.matchSchedule && leagueData.matchSchedule.length > 0) {
          setParsedMatches(leagueData.matchSchedule);
          setShowPreview(true);
        }
      } catch (err: any) {
        setError('Failed to load league');
        console.error('Error loading league:', err);
      } finally {
        setLoading(false);
      }
    };

    if (leagueId) {
      loadLeague();
    }
  }, [leagueId, user, isAdmin]);

  const handleParseSchedule = () => {
    try {
      setParseError('');
      const matches = parseMatchSchedule(scheduleText);

      if (matches.length === 0) {
        setParseError('No matches found in the provided text. Please check the format.');
        return;
      }

      setParsedMatches(matches);
      setShowPreview(true);
    } catch (err: any) {
      setParseError(`Failed to parse schedule: ${err.message}`);
      setParsedMatches([]);
      setShowPreview(false);
    }
  };

  const handleUpload = async () => {
    if (!leagueId || parsedMatches.length === 0) return;

    try {
      setUploading(true);
      setError('');

      await leagueService.update(leagueId, {
        matchSchedule: parsedMatches
      });

      setUploadSuccess(true);
      setTimeout(() => {
        navigate(`/leagues/${leagueId}/schedule`);
      }, 2000);
    } catch (err: any) {
      setError(`Failed to upload schedule: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error || !league || !isAdmin) {
    return (
      <Box>
        <AppHeader />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error">{error || 'Access denied'}</Alert>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/leagues')} sx={{ mt: 2 }}>
            Back to Leagues
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <AppHeader />
      <LeagueNav
        leagueName={league.name}
        leagueId={leagueId!}
        currentPage="Upload Schedule"
      />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(`/leagues/${leagueId}/schedule`)}
            sx={{ mb: 2 }}
          >
            Back to Schedule
          </Button>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Upload Match Schedule
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {league.name} • {league.tournamentName}
          </Typography>
        </Box>

        {uploadSuccess && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Schedule uploaded successfully! Redirecting...
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Instructions */}
        <Card sx={{ mb: 3, bgcolor: '#1a2332', border: `1px solid ${colors.border.subtle}` }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              How to Upload Schedule
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Paste the match schedule text in the format below. Each match should include:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="1. Date header (e.g., 'Sat, Feb 7 2026')"
                  primaryTypographyProps={{ fontSize: '0.875rem' }}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="2. Match description with venue (e.g., '1st Match, Group A • Colombo, Sinhalese Sports Club')"
                  primaryTypographyProps={{ fontSize: '0.875rem' }}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="3. Team names (team1 slug, Team1 name, team2 slug, Team2 name)"
                  primaryTypographyProps={{ fontSize: '0.875rem' }}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="4. Date and timing information"
                  primaryTypographyProps={{ fontSize: '0.875rem' }}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>

        {/* Input Field */}
        <Card sx={{ mb: 3, bgcolor: '#1a2332', border: `1px solid ${colors.border.subtle}` }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Paste Schedule Text
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={15}
              value={scheduleText}
              onChange={(e) => setScheduleText(e.target.value)}
              placeholder="Paste the match schedule text here..."
              variant="outlined"
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  bgcolor: alpha(colors.background.default, 0.5),
                  fontFamily: 'monospace',
                  fontSize: '0.875rem'
                }
              }}
            />
            {parseError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {parseError}
              </Alert>
            )}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<Preview />}
                onClick={handleParseSchedule}
                disabled={!scheduleText.trim()}
                sx={{
                  bgcolor: colors.blue.electric,
                  color: 'white',
                  fontWeight: 600,
                  '&:hover': {
                    bgcolor: colors.blue.deep
                  }
                }}
              >
                Parse & Preview
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setScheduleText('');
                  setParsedMatches([]);
                  setShowPreview(false);
                  setParseError('');
                }}
                sx={{
                  borderColor: colors.grey[500],
                  color: colors.grey[400]
                }}
              >
                Clear
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Preview */}
        {showPreview && parsedMatches.length > 0 && (
          <Box>
            <Card sx={{ mb: 3, bgcolor: '#1a2332', border: `1px solid ${colors.border.subtle}` }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Preview
                    </Typography>
                    <Chip
                      label={`${parsedMatches.length} matches found`}
                      size="small"
                      sx={{
                        bgcolor: colors.success.primary,
                        color: 'white',
                        fontWeight: 600
                      }}
                    />
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<Upload />}
                    onClick={handleUpload}
                    disabled={uploading || uploadSuccess}
                    sx={{
                      bgcolor: colors.orange.primary,
                      color: 'white',
                      fontWeight: 600,
                      px: 3,
                      py: 1.25,
                      '&:hover': {
                        bgcolor: colors.orange.dark,
                        boxShadow: colors.shadows.orange.md
                      }
                    }}
                  >
                    {uploading ? 'Uploading...' : 'Upload Schedule'}
                  </Button>
                </Box>
              </CardContent>
            </Card>

            <MatchScheduleViewer matches={parsedMatches} />
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default ScheduleUploadPage;
