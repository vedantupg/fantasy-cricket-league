import React, { useState, useEffect, useRef } from 'react';
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
  CircularProgress,
  Fade,
  Slide,
  Zoom
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
  WhatsApp,
  KeyboardArrowDown,
  GroupAdd
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
  const [scrollY, setScrollY] = useState(0);

  // Intersection Observer for scroll animations
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const features = [
    {
      icon: <Shield sx={{ fontSize: 40 }} />,
      title: "Set & Forget",
      description: "Pick your squad once and chill for the entire tournament. No more daily grind - just vibes and wins!",
      color: theme.palette.primary.main
    },
    {
      icon: <People sx={{ fontSize: 40 }} />,
      title: "Squad Goals",
      description: "Create private leagues with your crew. Time to prove who's the real cricket genius and flex those bragging rights!",
      color: theme.palette.secondary.main
    },
    {
      icon: <Star sx={{ fontSize: 40 }} />,
      title: "Discuss the game with Real Ball Knowledge",
      description: "Connect with cricket fans who actually get it. No fake hype, just real cricket lovers building genuine connections.",
      color: theme.palette.primary.main
    },
    {
      icon: <Timeline sx={{ fontSize: 40 }} />,
      title: "Pro Tips, No Cap",
      description: "Get insights from actual cricket experts. Real game knowledge, not just random stats. Level up while you play!",
      color: theme.palette.secondary.main
    },
    {
      icon: <EmojiEvents sx={{ fontSize: 40 }} />,
      title: "Bag the Rewards",
      description: "Win cash, merch, and serious clout. Because why play for free when you can get paid to be right?",
      color: theme.palette.primary.main
    }
  ];

  const stats = [
    { number: "100+", label: "Active Players", icon: <People /> },
    { number: "15+", label: "Leagues hosted", icon: <EmojiEvents /> },
    { number: "5+ yrs", label: "Established since 2020", icon: <Timeline /> }
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.1 }
    );

    const sections = document.querySelectorAll('[data-animate]');
    sections.forEach((section) => {
      if (observerRef.current) {
        observerRef.current.observe(section);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

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

  const parallaxOffset = scrollY * 0.5;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        overflow: 'hidden',
        position: 'relative',
        scrollBehavior: 'smooth',
        '&::before': {
          content: '""',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at 20% 50%, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 50%),
                       radial-gradient(circle at 80% 80%, ${alpha(theme.palette.secondary.main, 0.15)} 0%, transparent 50%)`,
          pointerEvents: 'none',
          zIndex: 0
        }
      }}
    >
      <AppHeader hideNavigation={!user} />

      {/* Hero Section - Compact viewport with animated gradient */}
      <Box
        sx={{
          minHeight: { xs: '85vh', md: '75vh' },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(135deg,
            ${alpha(theme.palette.background.default, 0.9)} 0%,
            ${alpha('#1a0a1f', 0.9)} 100%)`,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.2)} 0%, transparent 70%),
                         radial-gradient(circle at 80% 20%, ${alpha(theme.palette.secondary.main, 0.2)} 0%, transparent 50%)`,
            animation: 'gradientShift 15s ease infinite',
            pointerEvents: 'none'
          },
          '@keyframes gradientShift': {
            '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
            '50%': { transform: 'translate(-5%, -5%) rotate(180deg)' }
          }
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: 8 }}>
          <Fade in timeout={1000}>
            <Box sx={{ textAlign: 'center' }}>
              <Slide direction="down" in timeout={800}>
                <Typography
                  variant="h1"
                  sx={{
                    fontWeight: 900,
                    mb: 2,
                    fontSize: { xs: '2.5rem', md: '3.5rem', lg: '4rem' },
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
                    backgroundSize: '200% 200%',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    animation: 'gradientFlow 8s ease infinite',
                    textShadow: `0 0 80px ${alpha(theme.palette.primary.main, 0.5)}`,
                    '@keyframes gradientFlow': {
                      '0%, 100%': { backgroundPosition: '0% 50%' },
                      '50%': { backgroundPosition: '100% 50%' }
                    }
                  }}
                >
                  Fantasy Community League
                </Typography>
              </Slide>

              <Slide direction="up" in timeout={1200}>
                <Typography
                  variant="h5"
                  sx={{
                    mb: 4,
                    maxWidth: '700px',
                    mx: 'auto',
                    color: alpha(theme.palette.text.primary, 0.8),
                    fontWeight: 400,
                    lineHeight: 1.6,
                    fontSize: { xs: '1rem', md: '1.2rem' }
                  }}
                >
                  Pick once, vibe all season! No daily stress, just you vs your squad dominating tournaments.
                  Time to show your friends who's the real cricket main character! 🏆
                </Typography>
              </Slide>

              <Zoom in timeout={1500}>
                <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap', mb: 6 }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleGetStarted}
                    startIcon={<PlayArrow />}
                    sx={{
                      borderRadius: 3,
                      px: 5,
                      py: 2,
                      fontSize: '1.2rem',
                      fontWeight: 600,
                      boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.4)}`,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: `0 12px 48px ${alpha(theme.palette.primary.main, 0.6)}`
                      }
                    }}
                  >
                    Start Winning
                  </Button>
                </Box>
              </Zoom>

              {/* Scroll indicator */}
              <Fade in timeout={2000}>
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 40,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    animation: 'bounce 2s infinite',
                    '@keyframes bounce': {
                      '0%, 100%': { transform: 'translateX(-50%) translateY(0)' },
                      '50%': { transform: 'translateX(-50%) translateY(10px)' }
                    }
                  }}
                >
                  <KeyboardArrowDown
                    sx={{
                      fontSize: 48,
                      color: alpha(theme.palette.text.primary, 0.6)
                    }}
                  />
                </Box>
              </Fade>
            </Box>
          </Fade>
        </Container>
      </Box>

      {/* User Leagues Section - Glass morphism */}
      {user && (
        <Container
          maxWidth="lg"
          sx={{
            pt: 2,
            pb: 6,
            position: 'relative',
            zIndex: 1
          }}
        >
          <Fade in timeout={1000}>
            <Card
              sx={{
                background: `linear-gradient(135deg,
                  ${alpha(theme.palette.primary.main, 0.08)},
                  ${alpha(theme.palette.secondary.main, 0.05)})`,
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                borderRadius: 3,
                boxShadow: `0 8px 32px ${alpha('#000', 0.4)}`
              }}
            >
            <CardContent sx={{ p: 5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 3 }}>
                <Avatar
                  src={userData?.profilePicUrl}
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: theme.palette.primary.main,
                    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}`
                  }}
                >
                  {userData?.displayName?.charAt(0) || user.email?.charAt(0)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4" fontWeight="bold" gutterBottom>
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
                  variant="contained"
                  startIcon={<GroupAdd />}
                  onClick={() => navigate('/leagues/join')}
                  sx={{ borderRadius: 2 }}
                >
                  Join League
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
                        minWidth: 240,
                        cursor: 'pointer',
                        background: alpha(theme.palette.background.paper, 0.6),
                        backdropFilter: 'blur(10px)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.3)}`
                        }
                      }}
                      onClick={() => navigate(`/leagues/${league.id}`)}
                    >
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight="bold" noWrap>
                          {league.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {league.tournamentName}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <Chip label={league.format} size="small" />
                          <Chip
                            label={league.status === 'active' ? 'Active' : 'Completed'}
                            size="small"
                            color={league.status === 'active' ? 'success' : 'default'}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ) : (
                <Typography variant="body1" color="text.secondary">
                  You haven't joined any leagues yet. Create or join one to get started!
                </Typography>
              )}
            </CardContent>
          </Card>
          </Fade>
        </Container>
      )}

      {/* Stats Section - Compact glass cards */}
      <Container
        maxWidth="lg"
        sx={{
          py: 6,
          position: 'relative',
          zIndex: 1,
          transform: `translateY(${-parallaxOffset * 0.2}px)`
        }}
      >
        <Box
          data-animate
          id="stats-section"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
            gap: 2,
            transition: 'all 0.8s ease',
            opacity: visibleSections.has('stats-section') ? 1 : 0,
            transform: visibleSections.has('stats-section') ? 'translateY(0)' : 'translateY(40px)'
          }}
        >
          {stats.map((stat, index) => (
            <Card
              key={index}
              sx={{
                textAlign: 'center',
                background: `linear-gradient(135deg,
                  ${alpha(theme.palette.background.paper, 0.4)},
                  ${alpha(theme.palette.background.paper, 0.1)})`,
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                borderRadius: 2,
                transition: 'all 0.4s ease',
                transitionDelay: `${index * 0.1}s`,
                '&:hover': {
                  transform: 'translateY(-4px)',
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                  boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`
                }
              }}
            >
              <CardContent sx={{ py: 3 }}>
                <Box sx={{ mb: 1, color: theme.palette.primary.main }}>
                  {React.cloneElement(stat.icon, { sx: { fontSize: 36 } })}
                </Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 'bold',
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 0.5,
                    fontSize: { xs: '1.5rem', md: '2rem' }
                  }}
                >
                  {stat.number}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={500} fontSize={{ xs: '0.75rem', md: '0.875rem' }}>
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>

      {/* Features Section - Clean 2-column grid */}
      <Container maxWidth="lg" sx={{ py: 8, position: 'relative', zIndex: 1 }}>
        <Typography
          variant="h2"
          sx={{
            textAlign: 'center',
            mb: 6,
            fontWeight: 'bold',
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: { xs: '2rem', md: '2.5rem' }
          }}
        >
          Why Choose FCL?
        </Typography>

        <Box
          data-animate
          id="features-section"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 3,
            transition: 'all 0.8s ease',
            opacity: visibleSections.has('features-section') ? 1 : 0,
            transform: visibleSections.has('features-section') ? 'translateY(0)' : 'translateY(40px)'
          }}
        >
          {features.map((feature, index) => (
            <Card
              key={index}
              sx={{
                background: `linear-gradient(135deg,
                  ${alpha(feature.color, 0.08)},
                  ${alpha(theme.palette.background.paper, 0.05)})`,
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(feature.color, 0.15)}`,
                borderRadius: 3,
                p: 3,
                transition: 'all 0.4s ease',
                transitionDelay: `${index * 0.1}s`,
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 12px 40px ${alpha(feature.color, 0.25)}`,
                  border: `1px solid ${alpha(feature.color, 0.3)}`
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: alpha(feature.color, 0.15),
                    width: 56,
                    height: 56,
                    color: feature.color,
                    flexShrink: 0
                  }}
                >
                  {feature.icon}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" fontWeight="bold" mb={1}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {feature.description}
                  </Typography>
                </Box>
              </Box>
            </Card>
          ))}
        </Box>
      </Container>

      {/* WhatsApp Community Section - Subtle and professional */}
      <Container
        maxWidth="lg"
        sx={{
          py: 6,
          position: 'relative',
          zIndex: 2
        }}
      >
        <Card
          data-animate
          id="whatsapp-section"
          sx={{
            background: alpha(theme.palette.background.paper, 0.6),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha('#25D366', 0.2)}`,
            borderRadius: 2,
            overflow: 'hidden',
            position: 'relative',
            transition: 'all 0.6s ease',
            opacity: visibleSections.has('whatsapp-section') ? 1 : 0,
            transform: visibleSections.has('whatsapp-section') ? 'translateY(0)' : 'translateY(20px)',
            '&:hover': {
              border: `1px solid ${alpha('#25D366', 0.3)}`,
              boxShadow: `0 8px 24px ${alpha('#000000', 0.3)}`
            }
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Box sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: 'center',
              gap: { xs: 2, md: 3 },
              textAlign: { xs: 'center', md: 'left' }
            }}>
              {/* WhatsApp Icon */}
              <Avatar
                sx={{
                  bgcolor: '#25D366',
                  width: { xs: 60, md: 70 },
                  height: { xs: 60, md: 70 },
                  flexShrink: 0
                }}
              >
                <WhatsApp sx={{ fontSize: { xs: 36, md: 42 }, color: 'white' }} />
              </Avatar>

              {/* Content */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 'bold',
                    mb: 0.5,
                    fontSize: { xs: '1.25rem', md: '1.5rem' }
                  }}
                >
                  Join Our Cricket Community!
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: { xs: 1.5, md: 0 }, lineHeight: 1.5 }}
                >
                  Connect with 100+ cricket fans. Live updates, strategies & exclusive contests.
                </Typography>
              </Box>

              {/* CTA Button */}
              <Button
                variant="contained"
                startIcon={<WhatsApp />}
                href="https://chat.whatsapp.com/CREMSkJQbIu2rkuZ75mjzM"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  bgcolor: '#25D366',
                  color: 'white',
                  borderRadius: 2,
                  px: { xs: 4, md: 5 },
                  py: { xs: 1.25, md: 1.5 },
                  fontSize: { xs: '0.9rem', md: '1rem' },
                  fontWeight: 'bold',
                  flexShrink: 0,
                  '&:hover': {
                    bgcolor: '#128C7E',
                    transform: 'translateY(-2px)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                Join Now
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>

      {/* Footer - Fades into darkness */}
      <Box
        sx={{
          py: 6,
          textAlign: 'center',
          background: `linear-gradient(180deg,
            ${theme.palette.background.default} 0%,
            #000000 100%)`,
          position: 'relative',
          zIndex: 1
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: alpha(theme.palette.text.secondary, 0.6),
            fontWeight: 400
          }}
        >
          © 2025 FCL. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
};

export default LandingPage;
