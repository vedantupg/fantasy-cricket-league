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
  CircularProgress,
  Fade,
  Slide,
  Zoom,
  IconButton,
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
  GroupAdd,
  Block,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leagueService } from '../services/firestore';
import AppHeader from '../components/common/AppHeader';
import LiveScorecardStrip from '../components/scorecard/LiveScorecardStrip';
import type { League } from '../types/database';
import colors from '../theme/colors';
import { vibrate } from '../utils/haptics';

const LandingPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const [userLeagues, setUserLeagues] = useState<League[]>([]);
  const [leaguesLoading, setLeaguesLoading] = useState(false);

  // Intersection Observer for scroll animations
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const features = [
    {
      icon: <Shield sx={{ fontSize: 40 }} />,
      title: "One squad. One season.",
      description: "Pick once, follow scores from the first ball to the final.",
      color: theme.palette.primary.main
    },
    {
      icon: <People sx={{ fontSize: 40 }} />,
      title: "Private leagues, lasting rivalries.",
      description: "Run your group. Track who actually called it.",
      color: theme.palette.secondary.main
    },
    {
      icon: <Star sx={{ fontSize: 40 }} />,
      title: "For fans, by fans.",
      description: "A community of people who follow form, not fads.",
      color: theme.palette.primary.main
    },
    {
      icon: <Timeline sx={{ fontSize: 40 }} />,
      title: "Read the season, not the day.",
      description: "Long-form analysis from people who watch the cricket, not just the odds.",
      color: theme.palette.secondary.main
    }
  ];

  const stats = [
    { number: "100+", label: "Active Players", icon: <People />, raw: 100, suffix: "+" },
    { number: "25+", label: "Leagues hosted", icon: <EmojiEvents />, raw: 25, suffix: "+" },
    { number: "6 yrs", label: "Established since 2020", icon: <Timeline />, raw: 6, suffix: " yrs" },
    { number: "0", label: "Daily Transfers Required", icon: <Block />, raw: 0, suffix: "" },
  ];

  // Animated stat counters
  const [statCounts, setStatCounts] = useState<number[]>(stats.map(() => 0));
  const statsAnimatedRef = useRef(false);

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
    if (visibleSections.has('stats-section') && !statsAnimatedRef.current) {
      statsAnimatedRef.current = true;
      const duration = 1200;
      const steps = 60;
      const interval = duration / steps;
      let step = 0;
      const timer = setInterval(() => {
        step++;
        const progress = step / steps;
        const eased = 1 - Math.pow(1 - progress, 3);
        setStatCounts(stats.map((s) => Math.round(s.raw * eased)));
        if (step >= steps) clearInterval(timer);
      }, interval);
      return () => clearInterval(timer);
    }
  }, [visibleSections]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const loadUserLeagues = async () => {
      if (!user) return;

      try {
        setLeaguesLoading(true);
        const leagues = await leagueService.getForUser(user.uid);
        const sorted = leagues.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setUserLeagues(sorted);
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

      {/* Hero Section - Navy gradient with Electric Blue accents */}
      <Box
        sx={{
          minHeight: { xs: '85vh', md: '75vh' },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          background: colors.gradients.hero, // Navy gradient: #0A1929 → #003E5C → #016293
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: `radial-gradient(circle, ${alpha(colors.blue.electric, 0.15)} 0%, transparent 70%),
                         radial-gradient(circle at 80% 20%, ${alpha(colors.orange.primary, 0.12)} 0%, transparent 50%)`,
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
                    fontFamily: '"Fraunces", "Georgia", serif',
                    fontWeight: 500,
                    fontOpticalSizing: 'auto',
                    fontVariationSettings: '"opsz" 144, "SOFT" 50',
                    letterSpacing: '-0.02em',
                    mb: 5,
                    pb: '0.15em',
                    fontSize: { xs: '2.75rem', md: '4rem', lg: '4.75rem' },
                    lineHeight: 1.15,
                    background: colors.gradients.orange, // Orange gradient
                    backgroundSize: '200% 200%',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    animation: 'gradientFlow 8s ease infinite',
                    textShadow: `0 0 80px ${alpha(colors.orange.primary, 0.5)}`,
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
                <Box sx={{ mb: 6, mx: 'auto', maxWidth: 560 }}>
                  {/* Divider rule */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
                    <Box sx={{ flex: 1, height: '1px', background: `linear-gradient(90deg, transparent, ${alpha(colors.orange.primary, 0.5)})` }} />
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: colors.orange.primary, boxShadow: `0 0 8px ${colors.orange.primary}` }} />
                    <Box sx={{ flex: 1, height: '1px', background: `linear-gradient(90deg, ${alpha(colors.orange.primary, 0.5)}, transparent)` }} />
                  </Box>
                  <Typography
                    sx={{
                      fontFamily: '"Fraunces", "Georgia", serif',
                      fontWeight: 500,
                      fontOpticalSizing: 'auto',
                      fontVariationSettings: '"opsz" 72, "SOFT" 50',
                      fontSize: { xs: '1.35rem', md: '1.65rem' },
                      background: colors.gradients.title, // Electric Blue → Cyan gradient
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      letterSpacing: '0.01em',
                      lineHeight: 1.4,
                      pb: '0.1em',
                    }}
                  >
                    Pick once. Vibe all season.
                  </Typography>
                </Box>
              </Slide>

              <Zoom in timeout={1500}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, mb: 6 }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => { vibrate(8); handleGetStarted(); }}
                    startIcon={<PlayArrow />}
                    sx={{
                      borderRadius: 3,
                      px: 6,
                      py: 2.5,
                      fontSize: '1.25rem',
                      fontWeight: 600,
                      bgcolor: colors.blue.electric,
                      color: 'white',
                      boxShadow: colors.shadows.blue.lg,
                      transition: 'all 0.3s ease',
                      textTransform: 'none',
                      '&:hover': {
                        bgcolor: colors.blue.deep,
                        transform: 'translateY(-4px)',
                        boxShadow: `0 12px 48px ${alpha(colors.blue.electric, 0.6)}, ${colors.shadows.blue.glow}`
                      }
                    }}
                  >
                    Start Winning
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => document.getElementById('how-it-works-section')?.scrollIntoView({ behavior: 'smooth' })}
                    sx={{
                      color: alpha(colors.text.primary, 0.75),
                      borderColor: alpha(colors.text.primary, 0.25),
                      fontSize: '0.95rem',
                      textTransform: 'none',
                      fontWeight: 500,
                      borderRadius: 2.5,
                      px: 3,
                      py: 1,
                      transition: 'all 0.25s ease',
                      '&:hover': {
                        color: colors.text.primary,
                        borderColor: alpha(colors.blue.electric, 0.6),
                        bgcolor: alpha(colors.blue.electric, 0.08),
                        boxShadow: `0 0 16px ${alpha(colors.blue.electric, 0.2)}`,
                      }
                    }}
                  >
                    See how it works ↓
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
                    display: { xs: 'none', md: 'block' },
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
          <Fade in timeout={800}>
            <Card
              sx={{
                background: `linear-gradient(145deg, ${alpha(colors.blue.navy, 0.95)} 0%, ${alpha('#0A1929', 0.98)} 100%)`,
                backdropFilter: 'blur(24px)',
                border: `1px solid ${colors.border.default}`,
                borderRadius: 4,
                boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 1px 0 ${alpha(colors.blue.electric, 0.15)} inset`,
                overflow: 'hidden',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '1px',
                  background: `linear-gradient(90deg, transparent, ${alpha(colors.blue.electric, 0.6)}, transparent)`,
                }
              }}
            >
              {/* Top section: avatar + greeting + actions */}
              <Box
                sx={{
                  px: { xs: 3, md: 5 },
                  pt: { xs: 3, md: 4 },
                  pb: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 3,
                }}
              >
                {/* Left: Avatar + text */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                  <Box sx={{ position: 'relative' }}>
                    <Avatar
                      src={userData?.profilePicUrl}
                      sx={{
                        width: 72,
                        height: 72,
                        background: `linear-gradient(135deg, ${colors.blue.deep} 0%, ${colors.blue.electric} 100%)`,
                        fontSize: '1.75rem',
                        fontWeight: 700,
                        boxShadow: `0 0 0 3px ${alpha(colors.blue.electric, 0.25)}, ${colors.shadows.blue.md}`,
                      }}
                    >
                      {userData?.displayName?.charAt(0) || user.email?.charAt(0)}
                    </Avatar>
                    {/* Online indicator */}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 3,
                        right: 3,
                        width: 13,
                        height: 13,
                        borderRadius: '50%',
                        bgcolor: colors.success.primary,
                        border: `2px solid ${colors.background.default}`,
                        boxShadow: `0 0 6px ${colors.success.primary}`,
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography
                      variant="h5"
                      fontWeight={700}
                      sx={{
                        letterSpacing: '-0.02em',
                        lineHeight: 1.2,
                        background: `linear-gradient(90deg, ${colors.text.primary} 60%, ${colors.blue.light})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      Welcome back, {userData?.displayName || user.email?.split('@')[0]}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: alpha(colors.text.secondary, 0.7), mt: 0.4, letterSpacing: '0.01em' }}
                    >
                      Ready to dominate your leagues?
                    </Typography>
                  </Box>
                </Box>

                {/* Right: Action buttons */}
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Button
                    variant="contained"
                    startIcon={<GroupAdd sx={{ fontSize: '1rem' }} />}
                    onClick={() => { vibrate(8); navigate('/leagues/join'); }}
                    size="small"
                    sx={{
                      borderRadius: 2.5,
                      px: 2.5,
                      py: 1,
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      letterSpacing: '0.02em',
                      background: `linear-gradient(135deg, ${colors.orange.primary}, ${colors.orange.dark})`,
                      boxShadow: `0 4px 14px ${alpha(colors.orange.primary, 0.4)}`,
                      border: 'none',
                      '&:hover': {
                        background: `linear-gradient(135deg, ${colors.orange.light}, ${colors.orange.primary})`,
                        boxShadow: `0 6px 18px ${alpha(colors.orange.primary, 0.55)}`,
                        transform: 'translateY(-1px)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Join League
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Dashboard sx={{ fontSize: '1rem' }} />}
                    onClick={() => navigate('/dashboard')}
                    size="small"
                    sx={{
                      borderRadius: 2.5,
                      px: 2.5,
                      py: 1,
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      letterSpacing: '0.02em',
                      borderColor: alpha(colors.blue.electric, 0.5),
                      color: colors.blue.light,
                      backdropFilter: 'blur(8px)',
                      '&:hover': {
                        borderColor: colors.blue.electric,
                        bgcolor: alpha(colors.blue.electric, 0.1),
                        transform: 'translateY(-1px)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    My Leagues
                  </Button>
                  <Button
                    variant="text"
                    startIcon={<Settings sx={{ fontSize: '1rem' }} />}
                    onClick={() => navigate('/profile')}
                    size="small"
                    sx={{
                      borderRadius: 2.5,
                      px: 2,
                      py: 1,
                      fontWeight: 500,
                      fontSize: '0.8rem',
                      color: alpha(colors.text.secondary, 0.6),
                      '&:hover': {
                        color: colors.text.secondary,
                        bgcolor: alpha(colors.grey[600], 0.12),
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Profile
                  </Button>
                </Box>
              </Box>

              {/* Divider with label */}
              <Box sx={{ px: { xs: 3, md: 5 }, mb: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flex: 1, height: '1px', background: `linear-gradient(90deg, ${alpha(colors.blue.electric, 0.2)}, transparent)` }} />
                  <Typography
                    variant="caption"
                    sx={{
                      color: alpha(colors.text.secondary, 0.8),
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      fontSize: '0.68rem',
                    }}
                  >
                    Your Leagues · {userLeagues.length}
                  </Typography>
                  <Box sx={{ flex: 1, height: '1px', background: `linear-gradient(90deg, transparent, ${alpha(colors.blue.electric, 0.2)})` }} />
                </Box>
              </Box>

              {/* Leagues grid */}
              <Box sx={{ px: { xs: 3, md: 5 }, pb: { xs: 3, md: 4 } }}>
                {leaguesLoading ? (
                  <Box display="flex" justifyContent="center" py={3}>
                    <CircularProgress size={28} sx={{ color: colors.blue.electric }} />
                  </Box>
                ) : userLeagues.length > 0 ? (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                    {userLeagues.slice(0, 3).map((league) => {
                      const now = new Date();
                      const leagueEnded = league.endDate ? now > new Date(league.endDate) : league.status === 'completed';
                      const leagueStarted = now > new Date(league.startDate);
                      const statusLabel = leagueEnded ? 'Completed' : leagueStarted ? 'In Progress' : 'Upcoming';
                      const statusColor = leagueEnded ? colors.grey[500] : leagueStarted ? colors.success.primary : colors.orange.primary;

                      return (
                        <Card
                          key={league.id}
                          onClick={() => navigate(`/leagues/${league.id}`)}
                          sx={{
                            cursor: 'pointer',
                            background: `linear-gradient(135deg, ${alpha(colors.blue.deep, 0.5)} 0%, ${alpha(colors.blue.navy, 0.3)} 100%)`,
                            backdropFilter: 'blur(12px)',
                            border: `1px solid ${alpha(colors.blue.electric, 0.12)}`,
                            borderRadius: 3,
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                              transform: 'translateY(-3px)',
                              border: `1px solid ${alpha(colors.blue.electric, 0.4)}`,
                              boxShadow: `0 12px 28px rgba(0,0,0,0.3), 0 0 0 1px ${alpha(colors.blue.electric, 0.15)}`,
                              background: `linear-gradient(135deg, ${alpha(colors.blue.deep, 0.7)} 0%, ${alpha(colors.blue.navy, 0.5)} 100%)`,
                            }
                          }}
                        >
                          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              noWrap
                              sx={{ letterSpacing: '0.02em', color: colors.text.primary, mb: 0.5 }}
                            >
                              {league.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: alpha(colors.text.secondary, 0.6), display: 'block', mb: 1.5 }}
                            >
                              {league.tournamentName}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              <Box
                                sx={{
                                  px: 1,
                                  py: 0.25,
                                  borderRadius: 1,
                                  border: `1px solid ${alpha(colors.orange.primary, 0.5)}`,
                                  bgcolor: alpha(colors.orange.primary, 0.08),
                                }}
                              >
                                <Typography variant="caption" sx={{ color: colors.orange.light, fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.06em' }}>
                                  {league.format}
                                </Typography>
                              </Box>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  px: 1,
                                  py: 0.25,
                                  borderRadius: 1,
                                  border: `1px solid ${alpha(statusColor, 0.4)}`,
                                  bgcolor: alpha(statusColor, 0.08),
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: '50%',
                                    bgcolor: statusColor,
                                    ...(leagueStarted && !leagueEnded && {
                                      boxShadow: `0 0 5px ${statusColor}`,
                                      animation: 'pulse 2s infinite',
                                      '@keyframes pulse': {
                                        '0%, 100%': { opacity: 1 },
                                        '50%': { opacity: 0.4 },
                                      }
                                    })
                                  }}
                                />
                                <Typography variant="caption" sx={{ color: statusColor, fontWeight: 600, fontSize: '0.65rem', letterSpacing: '0.04em' }}>
                                  {statusLabel}
                                </Typography>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Box>
                ) : (
                  <Box
                    sx={{
                      py: 3,
                      textAlign: 'center',
                      border: `1px dashed ${alpha(colors.blue.electric, 0.2)}`,
                      borderRadius: 3,
                    }}
                  >
                    <Typography variant="body2" sx={{ color: alpha(colors.text.secondary, 0.5) }}>
                      No leagues yet — create or join one to get started.
                    </Typography>
                  </Box>
                )}
              </Box>
            </Card>
          </Fade>
        </Container>
      )}

      {/* Live cricket scorecard */}
      <Container maxWidth="lg" sx={{ pt: 3, pb: 1, position: 'relative', zIndex: 1 }}>
        <LiveScorecardStrip />
      </Container>

      {/* Stats Section - Compact glass cards */}
      <Container
        maxWidth="lg"
        sx={{
          py: { xs: 4, md: 5 },
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box
          data-animate
          id="stats-section"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
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
                  {statCounts[index]}{stat.suffix}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={500} fontSize={{ xs: '0.75rem', md: '0.875rem' }}>
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>

      {/* How It Works Section */}
      <Container maxWidth="lg" sx={{ pt: { xs: 3, md: 4 }, pb: { xs: 6, md: 8 }, position: 'relative', zIndex: 1 }}>
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
          How It Works
        </Typography>

        <Box
          data-animate
          id="how-it-works-section"
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 3,
            transition: 'all 0.8s ease',
            opacity: visibleSections.has('how-it-works-section') ? 1 : 0,
            transform: visibleSections.has('how-it-works-section') ? 'translateY(0)' : 'translateY(40px)'
          }}
        >
          {[
            { step: 1, title: "Pick Your Squad", description: "Choose 15 players once before the tournament starts." },
            { step: 2, title: "Join a League", description: "Create or join a private league with your crew." },
            { step: 3, title: "Track All Season", description: "Watch your squad earn points across every match, no daily effort needed." },
          ].map((item, index) => (
            <Card
              key={index}
              sx={{
                flex: 1,
                background: `linear-gradient(135deg, ${alpha(colors.blue.navy, 0.8)}, ${alpha('#0A1929', 0.6)})`,
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(colors.blue.electric, 0.15)}`,
                borderRadius: 3,
                p: 3,
                transition: 'all 0.4s ease',
                transitionDelay: `${index * 0.15}s`,
                '&:hover': {
                  transform: 'translateY(-4px)',
                  border: `1px solid ${alpha(colors.blue.electric, 0.35)}`,
                  boxShadow: `0 12px 40px ${alpha(colors.blue.electric, 0.2)}`
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: colors.blue.electric,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: `0 0 16px ${alpha(colors.blue.electric, 0.5)}`
                  }}
                >
                  <Typography variant="body1" fontWeight={700} sx={{ color: 'white', lineHeight: 1 }}>
                    {item.step}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={700} mb={0.75} sx={{ color: colors.text.primary }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {item.description}
                  </Typography>
                </Box>
              </Box>
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
                  Join 100+ Cricket Fans on WhatsApp
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: { xs: 1.5, md: 0 }, lineHeight: 1.5 }}
                >
                  Live match updates, squad strategies, trash talk, and exclusive contests — all in one place.
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
          <Typography
            variant="body2"
            sx={{
              color: alpha(theme.palette.text.secondary, 0.6),
              fontWeight: 400
            }}
          >
            © 2026 FCL. All rights reserved.
          </Typography>
          <IconButton
            component="a"
            href="https://chat.whatsapp.com/CREMSkJQbIu2rkuZ75mjzM"
            target="_blank"
            rel="noopener noreferrer"
            size="small"
            sx={{
              color: '#25D366',
              '&:hover': { bgcolor: alpha('#25D366', 0.1) }
            }}
          >
            <WhatsApp sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

export default LandingPage;
