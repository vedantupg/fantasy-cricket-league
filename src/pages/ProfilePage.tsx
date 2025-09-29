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
  LinearProgress,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowBack, Edit, Save, Cancel, PhotoCamera } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { imageService } from '../services/storage';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { userData, updateUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    displayName: userData?.displayName || '',
    email: userData?.email || ''
  });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState(userData?.profilePicUrl || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Sync profileImageUrl with userData when it changes
  useEffect(() => {
    setProfileImageUrl(userData?.profilePicUrl || '');
  }, [userData?.profilePicUrl]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate image using imageService
    const validation = imageService.validateImage(file);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid image file');
      return;
    }

    setError('');
    setProfileImage(file);

    // Create preview URL
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
      console.log('Starting profile save...', { profileImage, userId: userData?.uid });
      let finalProfilePicUrl = profileImageUrl;

      // Upload new profile image if selected
      if (profileImage && userData?.uid) {
        console.log('Uploading new profile image...');

        // Add timeout to prevent hanging
        const uploadPromise = imageService.uploadUserProfile(userData.uid, profileImage);
        const timeoutPromise = new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000)
        );

        finalProfilePicUrl = await Promise.race([uploadPromise, timeoutPromise]) as string;
        console.log('Image uploaded successfully:', finalProfilePicUrl);
      }

      // Update user profile
      console.log('Updating user profile...', {
        displayName: editData.displayName,
        profilePicUrl: finalProfilePicUrl
      });
      await updateUserProfile({
        displayName: editData.displayName,
        profilePicUrl: finalProfilePicUrl
      });

      // Update local state to reflect changes
      setProfileImageUrl(finalProfilePicUrl);
      setIsEditing(false);
      setProfileImage(null);
      console.log('Profile update completed successfully');
    } catch (error: any) {
      console.error('Failed to update profile:', error);

      // More specific error messages
      let errorMessage = 'Failed to save profile. Please try again.';
      if (error.message?.includes('timeout')) {
        errorMessage = 'Upload timed out. Please check your connection and try again.';
      } else if (error.code === 'storage/unauthorized') {
        errorMessage = 'You do not have permission to upload images.';
      } else if (error.code === 'storage/quota-exceeded') {
        errorMessage = 'Storage quota exceeded. Please try again later.';
      } else if (error.code === 'storage/invalid-format') {
        errorMessage = 'Invalid image format. Please upload a valid image file.';
      }

      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    // Reset states regardless of upload status
    setEditData({
      displayName: userData?.displayName || '',
      email: userData?.email || ''
    });
    setProfileImage(null);
    setProfileImageUrl(userData?.profilePicUrl || '');
    setError('');
    setUploading(false); // Reset uploading state
    setIsEditing(false);
  };

  const achievements = [
    { name: 'First Team Created', description: 'Created your first fantasy team', earned: true },
    { name: 'Top 100', description: 'Reached top 100 in global rankings', earned: false },
    { name: 'Contest Winner', description: 'Won a fantasy contest', earned: false },
    { name: 'Team Captain', description: 'Created 10 different teams', earned: false },
    { name: 'Streak Master', description: 'Won 5 contests in a row', earned: false }
  ];

  const stats = [
    { label: 'Teams Created', value: 3 },
    { label: 'Contests Joined', value: 25 },
    { label: 'Contests Won', value: 8 },
    { label: 'Best Rank', value: 247 },
    { label: 'Total Points', value: 15420 },
    { label: 'Win Rate', value: '32%' }
  ];

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

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {/* Profile Information */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.33% - 21px)' } }}>
            <Card>
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
                      fontSize: '2rem'
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

            {/* Quick Stats */}
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Quick Stats
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Current Rank
                  </Typography>
                  <Typography variant="h4" color="primary.main" sx={{ fontWeight: 'bold' }}>
                    #247
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    This Month's Progress
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={65} 
                    sx={{ mt: 1, borderRadius: 1 }} 
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    65% to next level
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Detailed Stats and Achievements */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(66.67% - 11px)' } }}>
            {/* Statistics */}
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                  Statistics
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {stats.map((stat, index) => (
                    <Box sx={{ flex: { xs: '1 1 calc(50% - 12px)', md: '1 1 calc(33.33% - 16px)' } }} key={index}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography 
                          variant="h4" 
                          sx={{ 
                            fontWeight: 'bold',
                            color: 'primary.main',
                            mb: 1
                          }}
                        >
                          {stat.value}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {stat.label}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                  Achievements
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {achievements.map((achievement, index) => (
                    <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }} key={index}>
                      <Card 
                        variant="outlined"
                        sx={{ 
                          opacity: achievement.earned ? 1 : 0.5,
                          border: achievement.earned ? '2px solid' : '1px solid',
                          borderColor: achievement.earned ? 'primary.main' : 'divider'
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Typography 
                              variant="h6" 
                              sx={{ 
                                fontWeight: 'bold',
                                color: achievement.earned ? 'primary.main' : 'text.secondary'
                              }}
                            >
                              {achievement.name}
                            </Typography>
                            {achievement.earned && (
                              <Chip 
                                label="Earned" 
                                color="primary" 
                                size="small" 
                                sx={{ ml: 1 }}
                              />
                            )}
                          </Box>
                          <Typography 
                            variant="body2" 
                            color={achievement.earned ? 'text.primary' : 'text.secondary'}
                          >
                            {achievement.description}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default ProfilePage;