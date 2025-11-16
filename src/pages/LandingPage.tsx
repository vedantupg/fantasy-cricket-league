import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Avatar,
  useTheme,
  alpha,
  Divider,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  EmojiEvents,
  People,
  PlayArrow,
  Star,
  Shield,
  Timeline,
  Settings,
  Dashboard,
  WhatsApp
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leagueService } from '../services/firestore';
import AppHeader from '../components/common/AppHeader';
import type { League } from '../types/database';

const LandingPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const [userLeagues, setUserLeagues] = useState<League[]>([]);
  const [leaguesLoading, setLeaguesLoading] = useState(false);

  const features = [
    {
      icon: <Shield sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: "Set & Forget 🔥",
      description: "Pick your squad once and chill for the entire tournament. No more daily grind - just vibes and wins!"
    },
    {
      icon: <People sx={{ fontSize: 40, color: theme.palette.secondary.main }} />,
      title: "Squad Goals 👥",
      description: "Create private leagues with your crew. Time to prove who's the real cricket genius and flex those bragging rights!"
    },
    {
      icon: <Star sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: "Join the Main Character Energy ⭐",
      description: "Connect with cricket fans who actually get it. No fake hype, just real cricket lovers building genuine connections."
    },
    {
      icon: <Timeline sx={{ fontSize: 40, color: theme.palette.secondary.main }} />,
      title: "Pro Tips, No Cap 📈",
      description: "Get insights from actual cricket experts. Real game knowledge, not just random stats. Level up while you play!"
    },
    {
      icon: <EmojiEvents sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: "Bag the Rewards 💰",
      description: "Win cash, merch, and serious clout. Because why play for free when you can get paid to be right?"
    }
  ];

  const stats = [
    { number: "1M+", label: "Active Players" },
    { number: "50K+", label: "Daily Contests" },
    { number: "₹10Cr+", label: "Prizes Won" },
    { number: "99.9%", label: "Uptime" }
  ];

  useEffect(() => {
    const loadUserLeagues = async () => {
      if (!user) return;

      try {
        setLeaguesLoading(true);
        const leagues = await leagueService.getForUser(user.uid);
        setUserLeagues(leagues);
      } catch (err) {
        console.error('Error loading leagues:', err);
      } finally {
        setLeaguesLoading(false);
      }
    };

    if (user) {
      loadUserLeagues();
    }
  }, [user]);

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/register');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppHeader hideNavigation={!user} />

      {/* User Leagues Section - Only shown when logged in */}
      {user && (
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Card 
            sx={{ 
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
              backdropFilter: 'blur(10px)',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              mb: 4
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar 
                  src={userData?.profilePicUrl}
                  sx={{ 
                    width: 64, 
                    height: 64, 
                    mr: 3,
                    bgcolor: theme.palette.primary.main
                  }}
                >
                  {userData?.displayName?.charAt(0) || user.email?.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    Welcome back, {userData?.displayName || user.email?.split('@')[0]}!
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Ready to manage your fantasy cricket teams?
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<Dashboard />}
                  onClick={() => navigate('/dashboard')}
                  sx={{ borderRadius: 2 }}
                >
                  Go to My Leagues
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Settings />}
                  onClick={() => navigate('/profile')}
                  sx={{ borderRadius: 2 }}
                >
                  Edit Profile
                </Button>
              </Box>
              
              {/* User's Leagues Preview */}
              <Divider sx={{ mb: 3 }} />
              <Typography variant="h6" fontWeight="bold" mb={2}>
                Your Leagues ({userLeagues.length})
              </Typography>
              
              {leaguesLoading ? (
                <Box display="flex" justifyContent="center" py={2}>
                  <CircularProgress size={40} />
                </Box>
              ) : userLeagues.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {userLeagues.slice(0, 3).map((league) => (
                    <Card 
                      key={league.id}
                      sx={{ 
                        minWidth: 200,
                        cursor: 'pointer',
                        '&:hover': { transform: 'translateY(-2px)' },
                        transition: 'transform 0.2s'
                      }}
                      onClick={() => navigate(`/leagues/${league.id}`)}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold" noWrap>
                          {league.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {league.tournamentName}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <Chip label={league.format} size="small" />
                          <Chip 
                            label={league.status === 'squad_selection' ? 'Squad Selection' : 
                                  league.status === 'active' ? 'Active' : 'Completed'}
                            size="small"
                            color={league.status === 'active' ? 'success' : 'default'}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                  {userLeagues.length > 3 && (
                    <Card 
                      sx={{ 
                        minWidth: 200,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                      }}
                      onClick={() => navigate('/dashboard')}
                    >
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" color="primary">
                          +{userLeagues.length - 3}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          More leagues
                        </Typography>
                      </CardContent>
                    </Card>
                  )}
                </Box>
              ) : (
                <Typography variant="body1" color="text.secondary">
                  You haven't joined any leagues yet. Create or join one to get started!
                </Typography>
              )}
            </CardContent>
          </Card>
        </Container>
      )}
      
      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ py: user ? 4 : 8 }}>
        <Box sx={{ textAlign: 'center', mb: user ? 6 : 8 }}>
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
            Fantasy Cricket Made Simple
          </Typography>
          <Typography 
            variant="h5" 
            color="text.secondary" 
            sx={{ mb: 4, maxWidth: '700px', mx: 'auto' }}
          >
            Pick once, vibe all season! No daily stress, just you vs your squad dominating tournaments. 
            Time to show your friends who's the real cricket main character! 🏆
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
              Start Winning
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

        {/* Stats Section */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 8 }}>
          {stats.map((stat, index) => (
            <Box key={index} sx={{ flex: { xs: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
              <Card 
                sx={{ 
                  textAlign: 'center',
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                }}
              >
                <CardContent>
                  <Typography 
                    variant="h3" 
                    sx={{ 
                      fontWeight: 'bold',
                      color: theme.palette.primary.main,
                      mb: 1
                    }}
                  >
                    {stat.number}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {stat.label}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          ))}
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
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {features.map((feature, index) => (
              <Box key={index} sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' } }}>
                <Card 
                  sx={{ 
                    height: '100%',
                    background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)}, ${alpha(theme.palette.background.paper, 0.4)})`,
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    transition: 'transform 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)'
                    }
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Avatar 
                        sx={{ 
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          width: 56,
                          height: 56
                        }}
                      >
                        {feature.icon}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                          {feature.title}
                        </Typography>
                        <Typography color="text.secondary">
                          {feature.description}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </Box>

        {/* WhatsApp Community Section */}
        <Card
          sx={{
            mb: 6,
            background: `linear-gradient(135deg, ${alpha('#25D366', 0.15)}, ${alpha('#128C7E', 0.1)})`,
            backdropFilter: 'blur(10px)',
            border: `2px solid ${alpha('#25D366', 0.3)}`,
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 5 } }}>
            <Box sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: 'center',
              gap: 3,
              textAlign: { xs: 'center', md: 'left' }
            }}>
              {/* WhatsApp Icon */}
              <Avatar
                sx={{
                  bgcolor: '#25D366',
                  width: { xs: 80, md: 100 },
                  height: { xs: 80, md: 100 },
                  boxShadow: `0 0 30px ${alpha('#25D366', 0.4)}`
                }}
              >
                <WhatsApp sx={{ fontSize: { xs: 48, md: 64 }, color: 'white' }} />
              </Avatar>

              {/* Content */}
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 'bold',
                    mb: 1,
                    fontSize: { xs: '1.75rem', md: '2.125rem' }
                  }}
                >
                  Join Our Cricket Community!
                </Typography>
                <Typography
                  variant="h6"
                  color="text.secondary"
                  sx={{ mb: 2, fontSize: { xs: '1rem', md: '1.25rem' } }}
                >
                  Connect with 100+ mad cricket fans! Get real-time updates, share strategies, and vibe with fellow cricket enthusiasts.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: { xs: 'center', md: 'flex-start' } }}>
                  <Chip
                    icon={<People sx={{ fontSize: 18 }} />}
                    label="100+ Active Members"
                    sx={{ bgcolor: alpha('#25D366', 0.2), fontWeight: 600 }}
                  />
                  <Chip
                    icon={<Star sx={{ fontSize: 18 }} />}
                    label="Expert Tips & Insights"
                    sx={{ bgcolor: alpha('#25D366', 0.2), fontWeight: 600 }}
                  />
                  <Chip
                    icon={<EmojiEvents sx={{ fontSize: 18 }} />}
                    label="Exclusive Contests"
                    sx={{ bgcolor: alpha('#25D366', 0.2), fontWeight: 600 }}
                  />
                </Box>
              </Box>

              {/* CTA Button */}
              <Button
                variant="contained"
                size="large"
                startIcon={<WhatsApp />}
                href="https://chat.whatsapp.com/CREMSkJQbIu2rkuZ75mjzM"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  bgcolor: '#25D366',
                  color: 'white',
                  borderRadius: 3,
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  minWidth: { xs: '100%', md: 200 },
                  '&:hover': {
                    bgcolor: '#128C7E',
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 20px ${alpha('#25D366', 0.4)}`
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                Join Now
              </Button>
            </Box>
          </CardContent>
        </Card>

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
            Ready to be That Person?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
            No more daily chaos. No FOMO. Just you being the cricket genius your friends wish they were!
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
            {user ? 'Let\'s Go! 🚀' : 'Join the Squad 🔥'}
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
          © 2025 FCL. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
};

export default LandingPage;