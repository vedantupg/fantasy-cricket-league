import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Avatar,
  Button,
  TextField,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { PhotoCamera, ArrowForward, SkipNext } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { imageService } from '../services/storage';

const ProfileSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { userData, updateUserProfile } = useAuth();
  const [displayName, setDisplayName] = useState(userData?.displayName || '');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState(userData?.profilePicUrl || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

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

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      setError('Please enter a display name');
      return;
    }

    setUploading(true);
    setError('');

    try {
      let finalProfilePicUrl = profileImageUrl;

      // Upload new profile image if selected
      if (profileImage && userData?.uid) {
        finalProfilePicUrl = await imageService.uploadUserProfile(userData.uid, profileImage);
      }

      // Update user profile and mark setup as completed
      await updateUserProfile({
        displayName: displayName.trim(),
        profilePicUrl: finalProfilePicUrl,
        profileSetupCompleted: true,
      });

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to update profile:', error);
      setError('Failed to save profile. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSkip = async () => {
    try {
      // Mark profile setup as completed even if skipped
      await updateUserProfile({
        profileSetupCompleted: true,
      });
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to update profile setup status:', error);
      // Navigate anyway if update fails
      navigate('/dashboard');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="sm" sx={{ pt: 8, pb: 4 }}>
        <Card>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main' }}>
              Welcome to FCL! 🏏
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Let's set up your profile to get started with Fantasy Cricket League
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Profile Picture Section */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <Avatar
                  src={profileImageUrl}
                  sx={{
                    width: 120,
                    height: 120,
                    mx: 'auto',
                    mb: 2,
                    bgcolor: 'primary.main',
                    fontSize: '3rem'
                  }}
                >
                  {displayName.charAt(0).toUpperCase() || userData?.displayName?.charAt(0) || 'U'}
                </Avatar>
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
              </Box>
              <Typography variant="body2" color="text.secondary">
                Upload a profile picture (max 5MB)
              </Typography>
            </Box>

            {/* Display Name Field */}
            <TextField
              fullWidth
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              sx={{ mb: 4 }}
              required
            />

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Button
                variant="outlined"
                startIcon={<SkipNext />}
                onClick={handleSkip}
                sx={{ flex: 1 }}
                disabled={uploading}
              >
                Skip for now
              </Button>
              <Button
                variant="contained"
                startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <ArrowForward />}
                onClick={handleSaveProfile}
                sx={{ flex: 1 }}
                disabled={uploading}
              >
                {uploading ? 'Saving...' : 'Complete Setup'}
              </Button>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              You can always update your profile later from the settings
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default ProfileSetupPage;