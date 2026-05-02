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
  alpha,
  Switch,
  FormControlLabel,
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
  LockOutlined,
  NotificationsOutlined,
  WorkspacePremium,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { requestNotificationPermission, disableNotifications } from '../services/notifications';
import { vibrate } from '../utils/haptics';
import { imageService } from '../services/storage';
import { squadService, leagueService } from '../services/firestore';
import type { LeagueSquad, League } from '../types/database';
import { colors } from '../theme/colors';

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
  color?: string;
  tier?: 'legendary' | 'epic' | 'rare';
}

const BADGE_META: Record<string, { color: string; tier: 'legendary' | 'epic' | 'rare' }> = {
  first_blood:       { color: '#ef4444', tier: 'rare' },
  squad_master:      { color: '#8b5cf6', tier: 'epic' },
  league_dominator:  { color: '#f59e0b', tier: 'legendary' },
  top_10:            { color: '#10b981', tier: 'epic' },
  points_machine:    { color: '#00e5ff', tier: 'epic' },
  league_veteran:    { color: '#f97316', tier: 'rare' },
  captain_fantastic: { color: '#ffd700', tier: 'legendary' },
};

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { userData, updateUserProfile, user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [notifToggling, setNotifToggling] = useState(false);
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

    return achievements.map(a => ({ ...a, ...BADGE_META[a.id] }));
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
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);

      let errorMessage = 'Failed to save profile. Please try again.';
      if (error.message?.includes('timeout')) {
        errorMessage = 'Upload timed out. Please check your connection and try again.';
      } else if (error.code === 'storage/unauthorized') {
        errorMessage = 'You do not have permission to upload images. Please check Firebase Storage rules.';
      } else if (error.code === 'storage/object-not-found') {
        errorMessage = 'Storage bucket not found. Please contact admin.';
      } else if (error.code === 'storage/quota-exceeded') {
        errorMessage = 'Storage quota exceeded. Please contact admin.';
      } else if (error.code) {
        errorMessage = `Upload failed: ${error.code} - ${error.message}`;
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

  const handleNotifToggle = async () => {
    if (!user) return;
    setNotifToggling(true);
    try {
      if (userData?.notificationsEnabled) {
        await disableNotifications(user.uid);
        await updateUserProfile({ notificationsEnabled: false, fcmToken: undefined });
      } else {
        vibrate([8, 40, 8]);
        await requestNotificationPermission(user.uid);
        await updateUserProfile({ notificationsEnabled: true });
      }
    } finally {
      setNotifToggling(false);
    }
  };

  const getRankBadgeColor = (rank: number | null) => {
    if (!rank) return colors.blue.electric;
    if (rank === 1) return colors.gold;
    if (rank <= 3) return colors.silver;
    if (rank <= 10) return colors.bronze;
    return colors.blue.electric;
  };

  const earnedAchievements = achievements.filter(a => a.earned);

  const hasFavorites =
    editData.favoriteBatter ||
    editData.favoriteBowler ||
    editData.favoriteFielder ||
    editData.favoriteIPLTeam;

  const memberSince = userData?.createdAt
    ? ((userData.createdAt as any).toDate?.() ?? new Date(userData.createdAt)).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      })
    : 'N/A';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: colors.background.default,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 3,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          boxShadow: '0 1px 0 rgba(30,136,229,0.15)',
        }}
      >
        <Button
          startIcon={<ArrowBack sx={{ fontSize: '1rem' }} />}
          onClick={() => navigate('/dashboard')}
          sx={{
            color: alpha(colors.text.primary, 0.6),
            fontWeight: 500,
            fontSize: '0.875rem',
            textTransform: 'none',
            border: 'none',
            p: '6px 12px',
            minWidth: 0,
            transition: 'all 0.2s ease',
            '&:hover': {
              color: colors.text.primary,
              background: alpha(colors.blue.electric, 0.08),
            },
          }}
        >
          Back
        </Button>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '1.05rem',
            background: colors.gradients.title,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Player Profile
        </Typography>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4, mt: 1 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress
              size={52}
              sx={{ color: colors.blue.electric }}
            />
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              gap: 3,
              flexWrap: { xs: 'wrap', md: 'nowrap' },
              alignItems: 'flex-start',
            }}
          >
            {/* ── LEFT COLUMN ─────────────────────────────────────── */}
            <Box
              sx={{
                flex: { xs: '1 1 100%', md: '0 0 320px' },
                width: { xs: '100%', md: 320 },
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {/* ── IDENTITY HERO CARD ─────────────────────────────── */}
              <Card
                sx={{
                  borderRadius: 3,
                  border: `1px solid ${colors.border.subtle}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                  overflow: 'hidden',
                  background: colors.background.paper,
                  position: 'relative',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Gradient hero band behind avatar */}
                <Box
                  sx={{
                    background: colors.gradients.hero,
                    pt: 4,
                    pb: 3,
                    px: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'relative',
                  }}
                >
                  {/* Edit / Save / Cancel controls — top-right */}
                  <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 0.5 }}>
                    {isEditing ? (
                      <>
                        <IconButton
                          size="small"
                          onClick={handleSave}
                          disabled={uploading}
                          aria-label="Save profile"
                          sx={{
                            color: colors.success.primary,
                            border: `1px solid ${alpha(colors.success.primary, 0.4)}`,
                            width: 32,
                            height: 32,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              background: alpha(colors.success.primary, 0.15),
                              borderColor: colors.success.primary,
                            },
                          }}
                        >
                          {uploading
                            ? <CircularProgress size={14} sx={{ color: colors.success.primary }} />
                            : <Save sx={{ fontSize: '1rem' }} />
                          }
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={handleCancel}
                          aria-label="Cancel editing"
                          sx={{
                            color: alpha(colors.text.primary, 0.5),
                            border: `1px solid ${alpha(colors.text.primary, 0.2)}`,
                            width: 32,
                            height: 32,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              background: alpha(colors.error.primary, 0.12),
                              color: colors.error.light,
                              borderColor: alpha(colors.error.primary, 0.4),
                            },
                          }}
                        >
                          <Cancel sx={{ fontSize: '1rem' }} />
                        </IconButton>
                      </>
                    ) : (
                      <IconButton
                        size="small"
                        onClick={() => setIsEditing(true)}
                        aria-label="Edit profile"
                        sx={{
                          color: alpha(colors.text.primary, 0.5),
                          border: `1px solid ${alpha(colors.blue.electric, 0.3)}`,
                          width: 32,
                          height: 32,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            color: colors.blue.electric,
                            background: alpha(colors.blue.electric, 0.1),
                            borderColor: colors.blue.electric,
                          },
                        }}
                      >
                        <Edit sx={{ fontSize: '1rem' }} />
                      </IconButton>
                    )}
                  </Box>

                  {/* Avatar with glow ring */}
                  <Box sx={{ position: 'relative', mb: 0 }}>
                    <Box
                      sx={{
                        width: 132,
                        height: 132,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${colors.blue.electric}, #00BCD4)`,
                        p: '3px',
                        boxShadow: colors.shadows.blue.glow,
                      }}
                    >
                      <Avatar
                        src={profileImageUrl || userData?.profilePicUrl}
                        sx={{
                          width: 126,
                          height: 126,
                          bgcolor: colors.background.elevated,
                          fontSize: '2.8rem',
                          fontWeight: 800,
                          border: `2px solid ${colors.background.default}`,
                        }}
                      >
                        {userData?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                      </Avatar>
                    </Box>

                    {/* Camera overlay button — edit mode only */}
                    {isEditing && (
                      <IconButton
                        component="label"
                        aria-label="Upload profile picture"
                        sx={{
                          position: 'absolute',
                          bottom: 2,
                          right: 2,
                          width: 34,
                          height: 34,
                          bgcolor: colors.background.default,
                          border: `2px solid ${colors.blue.electric}`,
                          color: colors.blue.electric,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: colors.blue.electric,
                            color: '#fff',
                          },
                        }}
                      >
                        <input
                          hidden
                          accept="image/*"
                          type="file"
                          onChange={handleImageChange}
                        />
                        <PhotoCamera sx={{ fontSize: '1rem' }} />
                      </IconButton>
                    )}
                  </Box>
                </Box>

                {/* Identity details below the gradient band */}
                <CardContent
                  sx={{
                    pt: 1.5,
                    pb: 3,
                    px: 3,
                    textAlign: 'center',
                    background: colors.background.paper,
                  }}
                >
                  {error && (
                    <Alert
                      severity="error"
                      sx={{
                        mb: 2,
                        bgcolor: alpha(colors.error.primary, 0.1),
                        color: colors.error.light,
                        border: `1px solid ${alpha(colors.error.primary, 0.3)}`,
                        borderRadius: 2,
                        fontSize: '0.8rem',
                        '& .MuiAlert-icon': { color: colors.error.light },
                      }}
                    >
                      {error}
                    </Alert>
                  )}

                  {isEditing ? (
                    <Box sx={{ mt: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="Display Name"
                        value={editData.displayName}
                        onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                        required
                        size="small"
                        sx={{
                          mb: 1.5,
                          '& .MuiOutlinedInput-root': {
                            color: colors.text.primary,
                            borderRadius: 2,
                            fontSize: '1rem',
                            fontWeight: 700,
                            '& fieldset': { borderColor: colors.border.default },
                            '&:hover fieldset': { borderColor: colors.blue.electric },
                            '&.Mui-focused fieldset': { borderColor: colors.blue.electric },
                          },
                          '& input': { textAlign: 'center' },
                        }}
                      />
                      <TextField
                        fullWidth
                        placeholder="Email"
                        value={editData.email}
                        disabled
                        size="small"
                        helperText="Email cannot be changed"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: alpha(colors.text.primary, 0.35),
                            borderRadius: 2,
                            fontSize: '0.8rem',
                            '& fieldset': { borderColor: colors.border.subtle },
                          },
                          '& .MuiFormHelperText-root': {
                            color: alpha(colors.text.primary, 0.3),
                            fontSize: '0.7rem',
                            textAlign: 'center',
                          },
                          '& input': { textAlign: 'center' },
                        }}
                      />
                      {profileImage && (
                        <Typography
                          sx={{
                            mt: 1,
                            fontSize: '0.72rem',
                            color: colors.success.primary,
                            opacity: 0.8,
                          }}
                        >
                          New photo selected (max 5MB)
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Box sx={{ mt: 1 }}>
                      {/* Display name */}
                      <Typography
                        sx={{
                          fontWeight: 800,
                          fontSize: '1.5rem',
                          color: colors.text.primary,
                          lineHeight: 1.2,
                          mb: 1,
                        }}
                      >
                        {userData?.displayName || 'Player'}
                      </Typography>

                      {/* Role chip */}
                      <Box sx={{ mb: 1 }}>
                        {userData?.isAdmin ? (
                          <Chip
                            label="Admin"
                            size="small"
                            sx={{
                              borderRadius: '20px',
                              border: `1px solid ${colors.gold}`,
                              color: colors.gold,
                              bgcolor: alpha(colors.gold, 0.08),
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                              height: 24,
                            }}
                          />
                        ) : (
                          <Chip
                            label="Player"
                            size="small"
                            sx={{
                              borderRadius: '20px',
                              border: `1px solid ${colors.blue.electric}`,
                              color: colors.blue.electric,
                              bgcolor: alpha(colors.blue.electric, 0.08),
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                              height: 24,
                            }}
                          />
                        )}
                      </Box>

                      {/* Email */}
                      <Typography
                        sx={{
                          fontSize: '0.75rem',
                          color: colors.text.primary,
                          opacity: 0.45,
                          mb: 0.5,
                        }}
                      >
                        {userData?.email}
                      </Typography>

                      {/* Member since */}
                      <Typography
                        sx={{
                          fontSize: '0.7rem',
                          color: colors.text.primary,
                          opacity: 0.35,
                          letterSpacing: '0.03em',
                        }}
                      >
                        Member since {memberSince}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* ── CRICKET DNA CARD ───────────────────────────────── */}
              <Card
                sx={{
                  borderRadius: 3,
                  border: `1px solid ${colors.border.subtle}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                  background: colors.background.paper,
                  transition: 'all 0.2s ease',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  {/* Card header */}
                  <Box display="flex" alignItems="center" gap={1} mb={2.5}>
                    <SportsCricket
                      sx={{
                        color: colors.blue.electric,
                        fontSize: '1.25rem',
                      }}
                    />
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        background: colors.gradients.title,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      Cricket DNA
                    </Typography>
                  </Box>

                  {isEditing ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {[
                        { key: 'favoriteBatter', placeholder: '🏏  Favorite Batter' },
                        { key: 'favoriteBowler', placeholder: '⚡  Favorite Bowler' },
                        { key: 'favoriteFielder', placeholder: '🤲  Favorite Fielder' },
                        { key: 'favoriteIPLTeam', placeholder: '🏆  Favorite IPL Team' },
                      ].map(({ key, placeholder }) => (
                        <TextField
                          key={key}
                          fullWidth
                          placeholder={placeholder}
                          value={editData[key as keyof typeof editData]}
                          onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                          size="small"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              color: colors.text.primary,
                              borderRadius: 2,
                              fontSize: '0.875rem',
                              '& fieldset': { borderColor: colors.border.default },
                              '&:hover fieldset': { borderColor: colors.blue.electric },
                              '&.Mui-focused fieldset': { borderColor: colors.blue.electric },
                              '& input::placeholder': { color: alpha(colors.text.primary, 0.4), opacity: 1 },
                            },
                          }}
                        />
                      ))}
                    </Box>
                  ) : hasFavorites ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {editData.favoriteBatter && (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            p: '10px 14px',
                            borderRadius: 2,
                            background: alpha(colors.blue.electric, 0.05),
                            border: `1px solid ${colors.border.subtle}`,
                          }}
                        >
                          <Typography sx={{ fontSize: '1.1rem', lineHeight: 1 }}>🏏</Typography>
                          <Box>
                            <Typography
                              sx={{
                                fontSize: '0.62rem',
                                color: colors.text.primary,
                                opacity: 0.4,
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                                lineHeight: 1,
                                mb: 0.3,
                              }}
                            >
                              Batter
                            </Typography>
                            <Typography
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                color: colors.text.primary,
                                lineHeight: 1.2,
                              }}
                            >
                              {editData.favoriteBatter}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                      {editData.favoriteBowler && (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            p: '10px 14px',
                            borderRadius: 2,
                            background: alpha(colors.blue.electric, 0.05),
                            border: `1px solid ${colors.border.subtle}`,
                          }}
                        >
                          <Typography sx={{ fontSize: '1.1rem', lineHeight: 1 }}>⚡</Typography>
                          <Box>
                            <Typography
                              sx={{
                                fontSize: '0.62rem',
                                color: colors.text.primary,
                                opacity: 0.4,
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                                lineHeight: 1,
                                mb: 0.3,
                              }}
                            >
                              Bowler
                            </Typography>
                            <Typography
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                color: colors.text.primary,
                                lineHeight: 1.2,
                              }}
                            >
                              {editData.favoriteBowler}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                      {editData.favoriteFielder && (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            p: '10px 14px',
                            borderRadius: 2,
                            background: alpha(colors.blue.electric, 0.05),
                            border: `1px solid ${colors.border.subtle}`,
                          }}
                        >
                          <Typography sx={{ fontSize: '1.1rem', lineHeight: 1 }}>🤲</Typography>
                          <Box>
                            <Typography
                              sx={{
                                fontSize: '0.62rem',
                                color: colors.text.primary,
                                opacity: 0.4,
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                                lineHeight: 1,
                                mb: 0.3,
                              }}
                            >
                              Fielder
                            </Typography>
                            <Typography
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                color: colors.text.primary,
                                lineHeight: 1.2,
                              }}
                            >
                              {editData.favoriteFielder}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                      {editData.favoriteIPLTeam && (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            p: '10px 14px',
                            borderRadius: 2,
                            background: alpha(colors.orange.primary, 0.05),
                            border: `1px solid ${alpha(colors.orange.primary, 0.15)}`,
                          }}
                        >
                          <Box
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              bgcolor: colors.orange.primary,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                color: '#fff',
                                lineHeight: 1,
                              }}
                            >
                              {editData.favoriteIPLTeam.charAt(0).toUpperCase()}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography
                              sx={{
                                fontSize: '0.62rem',
                                color: colors.text.primary,
                                opacity: 0.4,
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                                lineHeight: 1,
                                mb: 0.3,
                              }}
                            >
                              IPL Team
                            </Typography>
                            <Typography
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                color: colors.text.primary,
                                lineHeight: 1.2,
                              }}
                            >
                              {editData.favoriteIPLTeam}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        py: 3,
                        px: 2,
                        textAlign: 'center',
                        border: `1px dashed ${alpha(colors.blue.electric, 0.25)}`,
                        borderRadius: 2,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '0.82rem',
                          color: alpha(colors.text.primary, 0.35),
                          fontStyle: 'italic',
                        }}
                      >
                        Add your cricket identity →
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* ── NOTIFICATIONS CARD ─────────────────────────────── */}
              <Card
                sx={{
                  borderRadius: 3,
                  border: `1px solid ${colors.border.subtle}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                  background: colors.background.paper,
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <NotificationsOutlined sx={{ color: colors.blue.electric, fontSize: '1.25rem' }} />
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        background: colors.gradients.title,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      Notifications
                    </Typography>
                  </Box>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={userData?.notificationsEnabled ?? false}
                        onChange={handleNotifToggle}
                        disabled={notifToggling}
                        size="small"
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': { color: colors.blue.electric },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: colors.blue.electric },
                        }}
                      />
                    }
                    label={
                      <Typography sx={{ fontSize: '0.875rem', color: colors.text.primary }}>
                        Leaderboard updates
                      </Typography>
                    }
                  />

                  <Typography
                    sx={{
                      fontSize: '0.7rem',
                      color: alpha(colors.text.primary, 0.4),
                      mt: 1,
                      lineHeight: 1.5,
                    }}
                  >
                    Push notifications work on Android PWA and desktop browsers. Not supported on iOS.
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            {/* ── RIGHT COLUMN ─────────────────────────────────────── */}
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}
            >
              {/* ── STATS BANNER ───────────────────────────────────── */}
              <Card
                sx={{
                  borderRadius: 3,
                  border: `1px solid ${colors.border.default}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                  background: 'linear-gradient(135deg, rgba(30,136,229,0.08) 0%, rgba(0,62,92,0.6) 100%)',
                  transition: 'all 0.2s ease',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={3}>
                    <TrendingUp sx={{ color: colors.blue.electric, fontSize: '1.2rem' }} />
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: alpha(colors.text.primary, 0.55),
                      }}
                    >
                      Career Statistics
                    </Typography>
                  </Box>

                  {/* Primary 4-stat row */}
                  <Grid container spacing={2} sx={{ mb: 0 }}>
                    {/* Total Points */}
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Box sx={{ textAlign: 'center', py: 1 }}>
                        <Typography
                          sx={{
                            fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)',
                            fontWeight: 700,
                            lineHeight: 1,
                            background: colors.gradients.title,
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mb: 0.75,
                          }}
                        >
                          {userStats.totalCareerPoints.toLocaleString()}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.62rem',
                            color: alpha(colors.text.primary, 0.45),
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            fontWeight: 600,
                          }}
                        >
                          Career Pts
                        </Typography>
                      </Box>
                    </Grid>

                    {/* Active Leagues */}
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Box sx={{ textAlign: 'center', py: 1 }}>
                        <Typography
                          sx={{
                            fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                            fontWeight: 900,
                            lineHeight: 1,
                            color: colors.success.primary,
                            mb: 0.75,
                          }}
                        >
                          {userStats.activeLeaguesCount}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.62rem',
                            color: alpha(colors.text.primary, 0.45),
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            fontWeight: 600,
                          }}
                        >
                          Active Now
                        </Typography>
                      </Box>
                    </Grid>

                    {/* Best Rank */}
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Box sx={{ textAlign: 'center', py: 1 }}>
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 72,
                            height: 72,
                            borderRadius: '50%',
                            border: `3px solid ${getRankBadgeColor(userStats.bestRank)}`,
                            boxShadow: `0 0 16px ${alpha(getRankBadgeColor(userStats.bestRank), 0.4)}`,
                            background: alpha(getRankBadgeColor(userStats.bestRank), 0.08),
                            mb: 0.75,
                          }}
                        >
                          <Typography
                            sx={{
                              fontWeight: 900,
                              fontSize: userStats.bestRank ? '1.35rem' : '1.6rem',
                              color: getRankBadgeColor(userStats.bestRank),
                              lineHeight: 1,
                            }}
                          >
                            {userStats.bestRank ? `#${userStats.bestRank}` : '—'}
                          </Typography>
                        </Box>
                        <Typography
                          sx={{
                            fontSize: '0.62rem',
                            color: alpha(colors.text.primary, 0.45),
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            fontWeight: 600,
                            display: 'block',
                          }}
                        >
                          Best Rank
                        </Typography>
                        {userStats.bestRankLeague && (
                          <Typography
                            sx={{
                              fontSize: '0.65rem',
                              color: alpha(colors.text.primary, 0.3),
                              mt: 0.25,
                              maxWidth: 90,
                              mx: 'auto',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {userStats.bestRankLeague}
                          </Typography>
                        )}
                      </Box>
                    </Grid>

                    {/* Leagues Won */}
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Box sx={{ textAlign: 'center', py: 1 }}>
                        <Box
                          sx={{
                            position: 'relative',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 0.75,
                          }}
                        >
                          <EmojiEvents
                            sx={{
                              fontSize: 72,
                              color: colors.gold,
                              filter: 'drop-shadow(0 0 10px rgba(255,215,0,0.6))',
                            }}
                          />
                          <Typography
                            sx={{
                              position: 'absolute',
                              fontWeight: 900,
                              fontSize: '1.35rem',
                              color: '#0A1929',
                              lineHeight: 1,
                              mt: '4px',
                            }}
                          >
                            {userStats.leaguesWon}
                          </Typography>
                        </Box>
                        <Typography
                          sx={{
                            fontSize: '0.62rem',
                            color: alpha(colors.text.primary, 0.45),
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            fontWeight: 600,
                          }}
                        >
                          Wins
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Divider line */}
                  <Box
                    sx={{
                      my: 2.5,
                      height: '1px',
                      background: `linear-gradient(90deg, transparent, ${colors.border.default}, transparent)`,
                    }}
                  />

                  {/* Secondary stats row */}
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 4 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: '1.35rem',
                            color: colors.text.primary,
                            lineHeight: 1,
                            mb: 0.5,
                          }}
                        >
                          {userStats.totalLeagues}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.65rem',
                            color: alpha(colors.text.primary, 0.4),
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Total Leagues
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: '1.35rem',
                            color: colors.text.primary,
                            lineHeight: 1,
                            mb: 0.5,
                          }}
                        >
                          {userStats.totalSquads}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.65rem',
                            color: alpha(colors.text.primary, 0.4),
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Squads Created
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: '1.35rem',
                            color: colors.text.primary,
                            lineHeight: 1,
                            mb: 0.5,
                          }}
                        >
                          {userStats.averageRank ? `#${userStats.averageRank}` : '—'}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.65rem',
                            color: alpha(colors.text.primary, 0.4),
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Avg Rank
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* ── ACHIEVEMENTS ───────────────────────────────────── */}
              <Card
                sx={{
                  borderRadius: 3,
                  border: `1px solid ${colors.border.subtle}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                  background: colors.background.paper,
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Stars sx={{ color: '#f59e0b', fontSize: '1.2rem' }} />
                      <Typography sx={{ fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', background: colors.gradients.title, backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Achievements
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '0.72rem', color: alpha(colors.text.primary, 0.4), fontWeight: 600 }}>
                      {earnedAchievements.length} / {achievements.length}
                    </Typography>
                  </Box>

                  {/* Progress bar */}
                  <Box sx={{ mb: 2.5 }}>
                    <Box sx={{ height: 5, borderRadius: 3, bgcolor: alpha(colors.blue.electric, 0.1), overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: achievements.length > 0 ? `${(earnedAchievements.length / achievements.length) * 100}%` : '0%', background: `linear-gradient(90deg, #f59e0b, ${colors.blue.electric})`, borderRadius: 3, transition: 'width 0.8s ease' }} />
                    </Box>
                    <Typography sx={{ mt: 0.75, fontSize: '0.65rem', color: alpha(colors.text.primary, 0.3), letterSpacing: '0.06em' }}>
                      {achievements.length > 0 ? `${Math.round((earnedAchievements.length / achievements.length) * 100)}% complete` : '0% complete'}
                    </Typography>
                  </Box>

                  {/* Premium badge grid */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                    {achievements.map((a) => {
                      const color = a.color || colors.blue.electric;
                      const tier = a.tier || 'rare';
                      const tierGlow = tier === 'legendary' ? `0 0 18px ${alpha(color, 0.6)}` : tier === 'epic' ? `0 0 12px ${alpha(color, 0.45)}` : `0 0 8px ${alpha(color, 0.3)}`;
                      return (
                        <Box
                          key={a.id}
                          title={a.description}
                          sx={{
                            position: 'relative',
                            width: 86,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 0.75,
                            p: 1.25,
                            borderRadius: 2.5,
                            border: a.earned ? `1.5px solid ${alpha(color, 0.65)}` : `1px solid ${alpha('#fff', 0.08)}`,
                            background: a.earned
                              ? `linear-gradient(145deg, ${alpha(color, 0.12)} 0%, ${alpha(color, 0.04)} 100%)`
                              : alpha('#fff', 0.03),
                            boxShadow: a.earned ? tierGlow : 'none',
                            filter: a.earned ? 'none' : 'grayscale(1) brightness(0.45)',
                            opacity: a.earned ? 1 : 0.55,
                            transition: 'all 0.2s ease',
                            cursor: 'default',
                            '&:hover': a.earned ? {
                              border: `1.5px solid ${alpha(color, 0.9)}`,
                              boxShadow: `0 0 24px ${alpha(color, 0.7)}`,
                              transform: 'translateY(-2px)',
                            } : {},
                          }}
                        >
                          {!a.earned && (
                            <LockOutlined sx={{ position: 'absolute', top: 6, right: 6, fontSize: 11, color: alpha('#fff', 0.3) }} />
                          )}
                          {a.earned && tier === 'legendary' && (
                            <WorkspacePremium sx={{ position: 'absolute', top: 4, right: 4, fontSize: 12, color }} />
                          )}
                          <Typography sx={{ fontSize: '1.6rem', lineHeight: 1, mb: 0.25 }}>{a.icon}</Typography>
                          <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: a.earned ? color : alpha('#fff', 0.4), textAlign: 'center', letterSpacing: '0.03em', lineHeight: 1.2 }}>
                            {a.name}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
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
