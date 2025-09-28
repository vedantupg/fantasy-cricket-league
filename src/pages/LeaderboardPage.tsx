import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowBack, EmojiEvents, TrendingUp, TrendingDown } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import AppHeader from '../components/common/AppHeader';

const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { leagueId } = useParams<{ leagueId: string }>();
  
  const quickActions = (
    <Button
      variant="outlined"
      onClick={() => navigate(leagueId ? `/leagues/${leagueId}` : '/dashboard')}
    >
      ← {leagueId ? 'Back to League' : 'Back to My Leagues'}
    </Button>
  );
  const [selectedLeague, setSelectedLeague] = useState('global');

  const leaderboardData = [
    { rank: 1, name: 'CricketKing', points: 2847, change: '+5', team: 'Mumbai Mavericks', avatar: 'C' },
    { rank: 2, name: 'BoundaryHunter', points: 2793, change: '+2', team: 'Delhi Dominators', avatar: 'B' },
    { rank: 3, name: 'SixerMaster', points: 2756, change: '-1', team: 'Chennai Champions', avatar: 'S' },
    { rank: 4, name: 'WicketWizard', points: 2698, change: '+8', team: 'Bangalore Blasters', avatar: 'W' },
    { rank: 5, name: 'CaptainCool', points: 2654, change: '-2', team: 'Kolkata Knights', avatar: 'C' },
    { rank: 6, name: 'PowerPlayer', points: 2612, change: '+1', team: 'Hyderabad Heroes', avatar: 'P' },
    { rank: 7, name: 'StrategicSam', points: 2578, change: '-3', team: 'Punjab Panthers', avatar: 'S' },
    { rank: 8, name: 'FantasyPro', points: 2534, change: '+4', team: 'Rajasthan Royals', avatar: 'F' },
    { rank: 9, name: 'CricketGuru', points: 2489, change: '-1', team: 'Gujarat Giants', avatar: 'C' },
    { rank: 10, name: 'RunChaser', points: 2445, change: '+6', team: 'Lucknow Lions', avatar: 'R' }
  ];

  const getChangeIcon = (change: string) => {
    if (change.startsWith('+')) {
      return <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />;
    } else if (change.startsWith('-')) {
      return <TrendingDown sx={{ fontSize: 16, color: 'error.main' }} />;
    }
    return null;
  };

  const getChangeColor = (change: string) => {
    if (change.startsWith('+')) return 'success.main';
    if (change.startsWith('-')) return 'error.main';
    return 'text.secondary';
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return 'primary.main';
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppHeader 
        title="Leaderboard"
        subtitle="See who's dominating the tournament"
        actions={quickActions}
      />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Top Stats */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.33% - 16px)' } }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <EmojiEvents sx={{ fontSize: 48, color: '#FFD700', mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  2,847
                </Typography>
                <Typography color="text.secondary">
                  Top Score This Week
                </Typography>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.33% - 16px)' } }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  50,000+
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  Total Participants
                </Typography>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.33% - 16px)' } }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
                  #247
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  Your Current Rank
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* League Filter */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.33% - 16px)' } }}>
                <FormControl fullWidth>
                  <InputLabel>Select League</InputLabel>
                  <Select
                    value={selectedLeague}
                    onChange={(e) => setSelectedLeague(e.target.value)}
                    label="Select League"
                  >
                    <MenuItem value="global">Global Leaderboard</MenuItem>
                    <MenuItem value="friends">Friends League</MenuItem>
                    <MenuItem value="premium">Premium League</MenuItem>
                    <MenuItem value="beginners">Beginners League</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(66.67% - 16px)' } }}>
                <Typography variant="body2" color="text.secondary">
                  Rankings are updated in real-time based on player performances in ongoing matches.
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Leaderboard Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
              Top Players - Global League
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Rank</TableCell>
                    <TableCell>Player</TableCell>
                    <TableCell>Team</TableCell>
                    <TableCell align="right">Points</TableCell>
                    <TableCell align="center">Change</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaderboardData.map((player) => (
                    <TableRow 
                      key={player.rank}
                      sx={{ 
                        '&:hover': { bgcolor: 'action.hover' },
                        bgcolor: player.rank <= 3 ? 'action.selected' : 'inherit'
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {player.rank <= 3 && (
                            <EmojiEvents 
                              sx={{ 
                                fontSize: 20, 
                                color: getRankColor(player.rank),
                                mr: 1 
                              }} 
                            />
                          )}
                          <Typography 
                            sx={{ 
                              fontWeight: player.rank <= 3 ? 'bold' : 'normal',
                              color: player.rank <= 3 ? getRankColor(player.rank) : 'inherit'
                            }}
                          >
                            #{player.rank}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar 
                            sx={{ 
                              mr: 2, 
                              bgcolor: getRankColor(player.rank),
                              width: 32,
                              height: 32
                            }}
                          >
                            {player.avatar}
                          </Avatar>
                          <Typography sx={{ fontWeight: 'bold' }}>
                            {player.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={player.team} 
                          variant="outlined" 
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontWeight: 'bold' }}>
                          {player.points.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {getChangeIcon(player.change)}
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: getChangeColor(player.change),
                              ml: 0.5,
                              fontWeight: 'bold'
                            }}
                          >
                            {player.change}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Call to Action */}
        {!userData && (
          <Card sx={{ mt: 4, background: 'linear-gradient(135deg, #ff005d, #00e5ff)' }}>
            <CardContent sx={{ textAlign: 'center', color: 'white' }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2 }}>
                Ready to Climb the Rankings?
              </Typography>
              <Typography sx={{ mb: 3, opacity: 0.9 }}>
                Join thousands of cricket fans and start building your winning team!
              </Typography>
              <Button 
                variant="contained"
                size="large"
                onClick={() => navigate('/register')}
                sx={{ 
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.3)'
                  }
                }}
              >
                Create Account
              </Button>
            </CardContent>
          </Card>
        )}
      </Container>
    </Box>
  );
};

export default LeaderboardPage;