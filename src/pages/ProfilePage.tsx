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
  Divider,
  Chip,
  LinearProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowBack, Edit, Save, Cancel } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { userData, updateUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    displayName: userData?.displayName || '',
    email: userData?.email || ''
  });

  const handleSave = async () => {
    try {
      await updateUserProfile({ displayName: editData.displayName });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleCancel = () => {
    setEditData({
      displayName: userData?.displayName || '',
      email: userData?.email || ''
    });
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
                <Avatar 
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
                
                {isEditing ? (
                  <Box>
                    <TextField
                      fullWidth
                      label="Display Name"
                      value={editData.displayName}
                      onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Email"
                      value={editData.email}
                      disabled
                      margin="normal"
                      helperText="Email cannot be changed"
                    />
                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="contained"
                        startIcon={<Save />}
                        onClick={handleSave}
                        sx={{ mr: 1 }}
                      >
                        Save
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