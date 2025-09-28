import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Card, 
  CardContent,
  Avatar,
  useTheme,
  alpha
} from '@mui/material';
import { 
  SportsCricket, 
  EmojiEvents, 
  People, 
  TrendingUp,
  PlayArrow
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const SimpleLandingPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/register');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box 
        component="nav" 
        sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
        }}
      >
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 'bold',
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          FCL
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {!user ? (
            <>
              <Button 
                variant="outlined" 
                onClick={() => navigate('/login')}
                sx={{ borderRadius: 2 }}
              >
                Login
              </Button>
              <Button 
                variant="contained" 
                onClick={() => navigate('/register')}
                sx={{ borderRadius: 2 }}
              >
                Sign Up
              </Button>
            </>
          ) : (
            <Button 
              variant="contained" 
              onClick={() => navigate('/dashboard')}
              sx={{ borderRadius: 2 }}
            >
              My Leagues
            </Button>
          )}
        </Box>
      </Box>

      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography 
            variant="h2" 
            sx={{ 
              fontWeight: 'bold', 
              mb: 3,
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: { xs: '2.5rem', md: '4rem' }
            }}
          >
            Build Your Dream Cricket Team
          </Typography>
          <Typography 
            variant="h5" 
            color="text.secondary" 
            sx={{ mb: 4, maxWidth: '600px', mx: 'auto' }}
          >
            Join millions of cricket fans in the ultimate fantasy cricket experience. 
            Create your team, compete with friends, and win amazing prizes!
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button 
              variant="contained" 
              size="large"
              onClick={handleGetStarted}
              startIcon={<PlayArrow />}
              sx={{ 
                borderRadius: 3,
                px: 4,
                py: 1.5,
                fontSize: '1.1rem'
              }}
            >
              Get Started
            </Button>
            <Button 
              variant="outlined" 
              size="large"
              onClick={() => navigate('/leaderboard')}
              sx={{ 
                borderRadius: 3,
                px: 4,
                py: 1.5,
                fontSize: '1.1rem'
              }}
            >
              View Leaderboard
            </Button>
          </Box>
        </Box>

        {/* Features Section */}
        <Box sx={{ mb: 8 }}>
          <Typography 
            variant="h3" 
            sx={{ 
              textAlign: 'center', 
              mb: 6, 
              fontWeight: 'bold' 
            }}
          >
            Why Choose FCL?
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
            <Card sx={{ maxWidth: 300, flexGrow: 1 }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 2, width: 56, height: 56 }}>
                  <SportsCricket sx={{ fontSize: 30 }} />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Create Your Dream Team
                </Typography>
                <Typography color="text.secondary">
                  Build your fantasy cricket team with your favorite players and compete with friends.
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ maxWidth: 300, flexGrow: 1 }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Avatar sx={{ bgcolor: 'secondary.main', mx: 'auto', mb: 2, width: 56, height: 56 }}>
                  <EmojiEvents sx={{ fontSize: 30 }} />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Win Exciting Prizes
                </Typography>
                <Typography color="text.secondary">
                  Compete in leagues and tournaments to win amazing rewards and bragging rights.
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ maxWidth: 300, flexGrow: 1 }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 2, width: 56, height: 56 }}>
                  <People sx={{ fontSize: 30 }} />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Join Communities
                </Typography>
                <Typography color="text.secondary">
                  Connect with cricket fans worldwide and create your own private leagues.
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ maxWidth: 300, flexGrow: 1 }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Avatar sx={{ bgcolor: 'secondary.main', mx: 'auto', mb: 2, width: 56, height: 56 }}>
                  <TrendingUp sx={{ fontSize: 30 }} />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Real-time Updates
                </Typography>
                <Typography color="text.secondary">
                  Get live match updates and track your team's performance in real-time.
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* CTA Section */}
        <Card 
          sx={{ 
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            color: 'white',
            textAlign: 'center',
            p: 6
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>
            Ready to Start Your Journey?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
            Join thousands of cricket fans and start building your dream team today!
          </Typography>
          <Button 
            variant="contained"
            size="large"
            onClick={handleGetStarted}
            sx={{ 
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: 3,
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.3)'
              }
            }}
          >
            {user ? 'Go to My Leagues' : 'Create Account'}
          </Button>
        </Card>
      </Container>

      {/* Footer */}
      <Box 
        sx={{ 
          mt: 8,
          py: 4,
          borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          textAlign: 'center'
        }}
      >
        <Typography color="text.secondary">
          © 2024 FCL. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
};

export default SimpleLandingPage;