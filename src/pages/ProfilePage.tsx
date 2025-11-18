import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Avatar,
  Button,
  TextField,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Grid,
  LinearProgress,
  alpha,
  useTheme,
  Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  ArrowBack,
  Edit,
  Save,
  Cancel,
  PhotoCamera,
  EmojiEvents,
  TrendingUp,
  Stars,
  SportsCricket,
  Check
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { imageService } from '../services/storage';
import { squadService, leagueService } from '../services/firestore';
import type { LeagueSquad, League } from '../types/database';

interface UserStats {
  totalCareerPoints: number;
  activeLeaguesCount: number;
  bestRank: number | null;
  bestRankLeague: string | null;
  leaguesWon: number;
  totalLeagues: number;
  totalSquads: number;
  averageRank: number | null;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  earned: boolean;
  icon: string;
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { userData, updateUserProfile, user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    displayName: userData?.displayName || '',
    email: userData?.email || '',
    favoriteBatter: userData?.favoriteBatter || '',
    favoriteBowler: userData?.favoriteBowler || '',
    favoriteFielder: userData?.favoriteFielder || '',
    favoriteIPLTeam: userData?.favoriteIPLTeam || ''
  });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState(userData?.profilePicUrl || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats>({
    totalCareerPoints: 0,
    activeLeaguesCount: 0,
    bestRank: null,
    bestRankLeague: null,
    leaguesWon: 0,
    totalLeagues: 0,
    totalSquads: 0,
    averageRank: null
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  // Sync profileImageUrl with userData when it changes
  useEffect(() => {
    setProfileImageUrl(userData?.profilePicUrl || '');
    setEditData({
      displayName: userData?.displayName || '',
      email: userData?.email || '',
      favoriteBatter: userData?.favoriteBatter || '',
      favoriteBowler: userData?.favoriteBowler || '',
      favoriteFielder: userData?.favoriteFielder || '',
      favoriteIPLTeam: userData?.favoriteIPLTeam || ''
    });
  }, [userData]);

  // Fetch user stats and calculate achievements
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Fetch all user's squads
        const allSquads: LeagueSquad[] = [];
        const userLeagues = await leagueService.getForUser(user.uid);

        for (const league of userLeagues) {
          const squad = await squadService.getByUserAndLeague(user.uid, league.id);
          if (squad) {
            allSquads.push(squad);
          }
        }

        // Calculate stats
        const totalCareerPoints = allSquads.reduce((sum, squad) => sum + (squad.totalPoints || 0), 0);
        const activeLeaguesCount = userLeagues.filter(l => l.status === 'active').length;
        const leaguesWon = allSquads.filter(squad => squad.rank === 1).length;

        // Find best rank
        const rankedSquads = allSquads.filter(s => s.rank && s.rank > 0);
        let bestRank: number | null = null;
        let bestRankLeague: string | null = null;

        if (rankedSquads.length > 0) {
          const bestSquad = rankedSquads.reduce((best, current) =>
            current.rank < best.rank ? current : best
          );
          bestRank = bestSquad.rank;
          const league = userLeagues.find(l => l.id === bestSquad.leagueId);
          bestRankLeague = league?.name || null;
        }

        // Calculate average rank
        let averageRank: number | null = null;
        if (rankedSquads.length > 0) {
          const rankSum = rankedSquads.reduce((sum, squad) => sum + squad.rank, 0);
          averageRank = Math.round(rankSum / rankedSquads.length);
        }

        setUserStats({
          totalCareerPoints,
          activeLeaguesCount,
          bestRank,
          bestRankLeague,
          leaguesWon,
          totalLeagues: userLeagues.length,
          totalSquads: allSquads.length,
          averageRank
        });

        // Calculate achievements
        const calculatedAchievements = calculateAchievements(allSquads, userLeagues, totalCareerPoints);
        setAchievements(calculatedAchievements);

      } catch (err) {
        console.error('Error fetching user stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const calculateAchievements = (squads: LeagueSquad[], leagues: League[], totalPoints: number): Achievement[] => {
    const achievements: Achievement[] = [
      {
        id: 'first_blood',
        name: 'First Blood',
        description: 'Joined your first league',
        earned: leagues.length > 0,
        icon: '🎯'
      },
      {
        id: 'squad_master',
        name: 'Squad Master',
        description: 'Submitted 10+ squads',
        earned: squads.filter(s => s.isSubmitted).length >= 10,
        icon: '👑'
      },
      {
        id: 'league_dominator',
        name: 'League Dominator',
        description: 'Won a league',
        earned: squads.some(s => s.rank === 1),
        icon: '🏆'
      },
      {
        id: 'top_10',
        name: 'Top 10 Finisher',
        description: 'Ranked in top 10 of any league',
        earned: squads.some(s => s.rank && s.rank <= 10),
        icon: '🌟'
      },
      {
        id: 'points_machine',
        name: 'Points Machine',
        description: 'Scored 1000+ total points',
        earned: totalPoints >= 1000,
        icon: '⚡'
      },
      {
        id: 'league_veteran',
        name: 'League Veteran',
        description: 'Completed 5+ leagues',
        earned: leagues.filter(l => l.status === 'completed').length >= 5,
        icon: '🎖️'
      },
      {
        id: 'captain_fantastic',
        name: 'Captain Fantastic',
        description: 'Captain scored 100+ points',
        earned: squads.some(s => (s.captainPoints || 0) >= 100),
        icon: '👨‍✈️'
      }
    ];

    return achievements;
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = imageService.validateImage(file);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid image file');
      return;
    }

    setError('');
    setProfileImage(file);

    const reader = new FileReader();
    reader.onload = () => {
      setProfileImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!editData.displayName.trim()) {
      setError('Please enter a display name');
      return;
    }

    setUploading(true);
    setError('');

    try {
      let finalProfilePicUrl = profileImageUrl;

      if (profileImage && userData?.uid) {
        const uploadPromise = imageService.uploadUserProfile(userData.uid, profileImage);
        const timeoutPromise = new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000)
        );

        finalProfilePicUrl = await Promise.race([uploadPromise, timeoutPromise]) as string;
      }

      await updateUserProfile({
        displayName: editData.displayName,
        profilePicUrl: finalProfilePicUrl,
        favoriteBatter: editData.favoriteBatter.trim() || undefined,
        favoriteBowler: editData.favoriteBowler.trim() || undefined,
        favoriteFielder: editData.favoriteFielder.trim() || undefined,
        favoriteIPLTeam: editData.favoriteIPLTeam.trim() || undefined
      });

      setProfileImageUrl(finalProfilePicUrl);
      setIsEditing(false);
      setProfileImage(null);
    } catch (error: any) {
      console.error('Failed to update profile:', error);

      let errorMessage = 'Failed to save profile. Please try again.';
      if (error.message?.includes('timeout')) {
        errorMessage = 'Upload timed out. Please check your connection and try again.';
      } else if (error.code === 'storage/unauthorized') {
        errorMessage = 'You do not have permission to upload images.';
      }

      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      displayName: userData?.displayName || '',
      email: userData?.email || '',
      favoriteBatter: userData?.favoriteBatter || '',
      favoriteBowler: userData?.favoriteBowler || '',
      favoriteFielder: userData?.favoriteFielder || '',
      favoriteIPLTeam: userData?.favoriteIPLTeam || ''
    });
    setProfileImage(null);
    setProfileImageUrl(userData?.profilePicUrl || '');
    setError('');
    setUploading(false);
    setIsEditing(false);
  };

  const getRankBadgeColor = (rank: number | null) => {
    if (!rank) return theme.palette.grey[500];
    if (rank === 1) return '#FFD700'; // Gold
    if (rank <= 3) return '#C0C0C0'; // Silver
    if (rank <= 10) return '#CD7F32'; // Bronze
    return theme.palette.primary.main;
  };

  const earnedAchievements = achievements.filter(a => a.earned);
  const unlockedAchievements = achievements.filter(a => !a.earned);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/dashboard')}
          sx={{ mr: 2 }}
        >
          Back to My Leagues
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Profile
        </Typography>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress size={60} />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {/* Left Panel - Profile Info & Favorites */}
            <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.33% - 21px)' } }}>
              {/* Profile Card */}
              <Card sx={{ mb: 3 }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Box sx={{ position: 'relative', display: 'inline-block' }}>
                    <Avatar
                      src={profileImageUrl || userData?.profilePicUrl}
                      sx={{
                        width: 100,
                        height: 100,
                        mx: 'auto',
                        mb: 2,
                        bgcolor: 'primary.main',
                        fontSize: '2rem',
                        boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.4)}`
                      }}
                    >
                      {userData?.displayName?.charAt(0) || 'U'}
                    </Avatar>
                    {isEditing && (
                      <IconButton
                        color="primary"
                        aria-label="upload picture"
                        component="label"
                        sx={{
                          position: 'absolute',
                          bottom: 8,
                          right: -8,
                          bgcolor: 'background.paper',
                          border: '2px solid',
                          borderColor: 'primary.main',
                          '&:hover': {
                            bgcolor: 'primary.main',
                            color: 'white',
                          }
                        }}
                      >
                        <input
                          hidden
                          accept="image/*"
                          type="file"
                          onChange={handleImageChange}
                        />
                        <PhotoCamera />
                      </IconButton>
                    )}
                  </Box>

                  {isEditing ? (
                    <Box>
                      {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                          {error}
                        </Alert>
                      )}
                      <TextField
                        fullWidth
                        label="Display Name"
                        value={editData.displayName}
                        onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                        margin="normal"
                        required
                      />
                      <TextField
                        fullWidth
                        label="Email"
                        value={editData.email}
                        disabled
                        margin="normal"
                        helperText="Email cannot be changed"
                      />
                      {profileImage && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          New profile picture selected (max 5MB)
                        </Typography>
                      )}
                      <Box sx={{ mt: 2 }}>
                        <Button
                          variant="contained"
                          startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <Save />}
                          onClick={handleSave}
                          sx={{ mr: 1 }}
                          disabled={uploading}
                        >
                          {uploading ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<Cancel />}
                          onClick={handleCancel}
                        >
                          Cancel
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {userData?.displayName || 'User'}
                      </Typography>
                      <Typography color="text.secondary" sx={{ mb: 2 }}>
                        {userData?.email}
                      </Typography>
                      <Chip
                        label={userData?.isAdmin ? 'Admin' : 'Player'}
                        color={userData?.isAdmin ? 'secondary' : 'primary'}
                        sx={{ mb: 2 }}
                      />
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Member since {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<Edit />}
                        onClick={() => setIsEditing(true)}
                        fullWidth
                      >
                        Edit Profile
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Player Favorites */}
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <SportsCricket color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                      Player Favorites
                    </Typography>
                  </Box>

                  {isEditing ? (
                    <Box>
                      <TextField
                        fullWidth
                        label="Favorite Batter 🏏"
                        value={editData.favoriteBatter}
                        onChange={(e) => setEditData({ ...editData, favoriteBatter: e.target.value })}
                        margin="normal"
                        placeholder="e.g., Virat Kohli"
                      />
                      <TextField
                        fullWidth
                        label="Favorite Bowler ⚡"
                        value={editData.favoriteBowler}
                        onChange={(e) => setEditData({ ...editData, favoriteBowler: e.target.value })}
                        margin="normal"
                        placeholder="e.g., Jasprit Bumrah"
                      />
                      <TextField
                        fullWidth
                        label="Favorite Fielder 🤲"
                        value={editData.favoriteFielder}
                        onChange={(e) => setEditData({ ...editData, favoriteFielder: e.target.value })}
                        margin="normal"
                        placeholder="e.g., Ravindra Jadeja"
                      />
                      <TextField
                        fullWidth
                        label="Favorite IPL Team 🏆"
                        value={editData.favoriteIPLTeam}
                        onChange={(e) => setEditData({ ...editData, favoriteIPLTeam: e.target.value })}
                        margin="normal"
                        placeholder="e.g., Mumbai Indians"
                      />
                    </Box>
                  ) : (
                    <Box>
                      {editData.favoriteBatter || editData.favoriteBowler || editData.favoriteFielder || editData.favoriteIPLTeam ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {editData.favoriteBatter && (
                            <Box>
                              <Typography variant="body2" color="text.secondary">Favorite Batter 🏏</Typography>
                              <Typography variant="body1" fontWeight="medium">{editData.favoriteBatter}</Typography>
                            </Box>
                          )}
                          {editData.favoriteBowler && (
                            <Box>
                              <Typography variant="body2" color="text.secondary">Favorite Bowler ⚡</Typography>
                              <Typography variant="body1" fontWeight="medium">{editData.favoriteBowler}</Typography>
                            </Box>
                          )}
                          {editData.favoriteFielder && (
                            <Box>
                              <Typography variant="body2" color="text.secondary">Favorite Fielder 🤲</Typography>
                              <Typography variant="body1" fontWeight="medium">{editData.favoriteFielder}</Typography>
                            </Box>
                          )}
                          {editData.favoriteIPLTeam && (
                            <Box>
                              <Typography variant="body2" color="text.secondary">Favorite IPL Team 🏆</Typography>
                              <Typography variant="body1" fontWeight="medium">{editData.favoriteIPLTeam}</Typography>
                            </Box>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                          Click "Edit Profile" to add your favorite players!
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>

            {/* Right Panel - Stats & Achievements */}
            <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(66.67% - 11px)' } }}>
              {/* Hero Stats */}
              <Card sx={{ mb: 4,
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={3}>
                    <TrendingUp color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                      Career Statistics
                    </Typography>
                  </Box>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Box textAlign="center">
                        <Typography
                          variant="h3"
                          sx={{
                            fontWeight: 'bold',
                            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mb: 1
                          }}
                        >
                          {userStats.totalCareerPoints.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Points
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Box textAlign="center">
                        <Typography
                          variant="h3"
                          sx={{
                            fontWeight: 'bold',
                            color: theme.palette.success.main,
                            mb: 1
                          }}
                        >
                          {userStats.activeLeaguesCount}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Active Leagues
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Box textAlign="center">
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            bgcolor: alpha(getRankBadgeColor(userStats.bestRank), 0.2),
                            border: `3px solid ${getRankBadgeColor(userStats.bestRank)}`,
                            mb: 1
                          }}
                        >
                          <Typography
                            variant="h4"
                            sx={{
                              fontWeight: 'bold',
                              color: getRankBadgeColor(userStats.bestRank)
                            }}
                          >
                            {userStats.bestRank ? `#${userStats.bestRank}` : '-'}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Best Rank
                        </Typography>
                        {userStats.bestRankLeague && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            in {userStats.bestRankLeague}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Box textAlign="center">
                        <Box sx={{ position: 'relative', display: 'inline-block', mb: 1 }}>
                          <EmojiEvents
                            sx={{
                              fontSize: 64,
                              color: '#FFD700',
                              filter: `drop-shadow(0 0 8px ${alpha('#FFD700', 0.5)})`
                            }}
                          />
                          <Typography
                            variant="h5"
                            sx={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              fontWeight: 'bold',
                              color: '#000'
                            }}
                          >
                            {userStats.leaguesWon}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Leagues Won
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 3 }} />

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6, sm: 4 }}>
                      <Typography variant="body2" color="text.secondary">Total Leagues</Typography>
                      <Typography variant="h6" fontWeight="medium">{userStats.totalLeagues}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 4 }}>
                      <Typography variant="body2" color="text.secondary">Squads Created</Typography>
                      <Typography variant="h6" fontWeight="medium">{userStats.totalSquads}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 4 }}>
                      <Typography variant="body2" color="text.secondary">Average Rank</Typography>
                      <Typography variant="h6" fontWeight="medium">
                        {userStats.averageRank ? `#${userStats.averageRank}` : '-'}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Achievements */}
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={3}>
                    <Stars color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                      Achievements ({earnedAchievements.length}/{achievements.length})
                    </Typography>
                  </Box>

                  {/* Progress Bar */}
                  <Box sx={{ mb: 3 }}>
                    <LinearProgress
                      variant="determinate"
                      value={(earnedAchievements.length / achievements.length) * 100}
                      sx={{
                        height: 8,
                        borderRadius: 1,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        '& .MuiLinearProgress-bar': {
                          background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
                        }
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {Math.round((earnedAchievements.length / achievements.length) * 100)}% Complete
                    </Typography>
                  </Box>

                  {/* Earned Achievements */}
                  {earnedAchievements.length > 0 && (
                    <>
                      <Typography variant="subtitle2" fontWeight="bold" mb={2} color="success.main">
                        🎉 Unlocked ({earnedAchievements.length})
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                        {earnedAchievements.map((achievement) => (
                          <Card
                            key={achievement.id}
                            sx={{
                              flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' },
                              border: '2px solid',
                              borderColor: 'success.main',
                              background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)}, transparent)`,
                              position: 'relative',
                              overflow: 'visible'
                            }}
                          >
                            <CardContent sx={{ p: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                                <Typography sx={{ fontSize: '2rem' }}>{achievement.icon}</Typography>
                                <Box sx={{ flex: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <Typography variant="subtitle1" fontWeight="bold">
                                      {achievement.name}
                                    </Typography>
                                    <Check sx={{ color: 'success.main', fontSize: 20 }} />
                                  </Box>
                                  <Typography variant="body2" color="text.secondary">
                                    {achievement.description}
                                  </Typography>
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        ))}
                      </Box>
                    </>
                  )}

                  {/* Locked Achievements */}
                  {unlockedAchievements.length > 0 && (
                    <>
                      <Typography variant="subtitle2" fontWeight="bold" mb={2} color="text.secondary">
                        🔒 Locked ({unlockedAchievements.length})
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {unlockedAchievements.map((achievement) => (
                          <Card
                            key={achievement.id}
                            sx={{
                              flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' },
                              opacity: 0.6,
                              border: '1px solid',
                              borderColor: 'divider'
                            }}
                          >
                            <CardContent sx={{ p: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                                <Typography sx={{ fontSize: '2rem', filter: 'grayscale(100%)' }}>
                                  {achievement.icon}
                                </Typography>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="subtitle1" fontWeight="bold" color="text.secondary">
                                    {achievement.name}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {achievement.description}
                                  </Typography>
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        ))}
                      </Box>
                    </>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default ProfilePage;
