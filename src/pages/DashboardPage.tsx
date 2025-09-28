import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Avatar,
  LinearProgress
} from '@mui/material';
import {
  SportsCricket,
  EmojiEvents,
  People,
  TrendingUp,
  Add
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const { userData, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const quickStats = [
    {
      icon: <SportsCricket sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'My Teams',
      value: '3',
      subtitle: 'Active teams'
    },
    {
      icon: <EmojiEvents sx={{ fontSize: 40, color: 'secondary.main' }} />,
      title: 'Contests Won',
      value: '12',
      subtitle: 'This month'
    },
    {
      icon: <People sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Leagues',
      value: '5',
      subtitle: 'Participating'
    },
    {
      icon: <TrendingUp sx={{ fontSize: 40, color: 'secondary.main' }} />,
      title: 'Rank',
      value: '#247',
      subtitle: 'Global ranking'
    }
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box 
        sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          FCL
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            {userData?.displayName?.charAt(0) || 'U'}
          </Avatar>
          <Button onClick={handleLogout} variant="outlined" size="small">
            Logout
          </Button>
        </Box>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Welcome Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            Welcome back, {userData?.displayName || 'Player'}!
          </Typography>
          <Typography color="text.secondary" variant="h6">
            Ready to manage your fantasy cricket teams?
          </Typography>
        </Box>

        {/* Quick Stats */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
          {quickStats.map((stat, index) => (
            <Box key={index} sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  {stat.icon}
                  <Typography variant="h4" sx={{ fontWeight: 'bold', my: 1 }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="h6" gutterBottom>
                    {stat.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stat.subtitle}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>

        {/* Quick Actions */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(66.66% - 12px)' } }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Quick Actions
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => navigate('/team')}
                      sx={{ py: 1.5 }}
                    >
                      Create New Team
                    </Button>
                  </Box>
                  <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<People />}
                      sx={{ py: 1.5 }}
                    >
                      Join Contest
                    </Button>
                  </Box>
                  <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => navigate('/leaderboard')}
                      sx={{ py: 1.5 }}
                    >
                      View Leaderboard
                    </Button>
                  </Box>
                  <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => navigate('/profile')}
                      sx={{ py: 1.5 }}
                    >
                      Edit Profile
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
          
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.33% - 12px)' } }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  This Week's Progress
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Contests Participated: 8/10
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={80} 
                    sx={{ mt: 1, borderRadius: 1 }} 
                  />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Teams Created: 3/5
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={60} 
                    sx={{ mt: 1, borderRadius: 1 }} 
                  />
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Recent Activity */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
              Recent Activity
            </Typography>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                No recent activity. Start by creating your first team!
              </Typography>
              <Button 
                variant="contained" 
                onClick={() => navigate('/team')}
                sx={{ mt: 2 }}
              >
                Create Team
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default DashboardPage;