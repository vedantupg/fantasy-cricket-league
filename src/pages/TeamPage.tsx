import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Avatar,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowBack, Add, Remove } from '@mui/icons-material';

const TeamPage: React.FC = () => {
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<any[]>([]);
  const [budget] = useState(100);
  const [usedBudget, setUsedBudget] = useState(0);

  const playerPositions = ['Wicket Keeper', 'Batter', 'All Rounder', 'Bowler'];

  const samplePlayers = [
    { id: 1, name: 'Virat Kohli', position: 'Batter', points: 8.5, price: 11.0 },
    { id: 2, name: 'MS Dhoni', position: 'Wicket Keeper', points: 9.0, price: 10.5 },
    { id: 3, name: 'Hardik Pandya', position: 'All Rounder', points: 8.5, price: 9.0 },
    { id: 4, name: 'Jasprit Bumrah', position: 'Bowler', points: 8.0, price: 9.5 },
    { id: 5, name: 'Rohit Sharma', position: 'Batter', points: 8.5, price: 10.0 },
    { id: 6, name: 'Rishabh Pant', position: 'Wicket Keeper', points: 7.5, price: 8.5 },
    { id: 7, name: 'Ravindra Jadeja', position: 'All Rounder', points: 8.0, price: 8.5 },
    { id: 8, name: 'Mohammed Shami', position: 'Bowler', points: 7.5, price: 8.0 }
  ];

  const addPlayer = (player: any) => {
    if (selectedPlayers.length >= 11) return;
    if (selectedPlayers.find(p => p.id === player.id)) return;
    if (usedBudget + player.price > budget) return;
    
    setSelectedPlayers([...selectedPlayers, player]);
    setUsedBudget(usedBudget + player.price);
  };

  const removePlayer = (playerId: number) => {
    const player = selectedPlayers.find(p => p.id === playerId);
    if (player) {
      setSelectedPlayers(selectedPlayers.filter(p => p.id !== playerId));
      setUsedBudget(usedBudget - player.price);
    }
  };

  const getPositionColor = (position: string) => {
    const colors: { [key: string]: string } = {
      'Wicket Keeper': '#ff9800',
      'Batter': '#4caf50',
      'All Rounder': '#2196f3',
      'Bowler': '#f44336'
    };
    return colors[position] || '#757575';
  };

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
          Create Team
        </Typography>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Team Setup */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
              Team Setup
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.33% - 16px)' } }}>
                <TextField
                  fullWidth
                  label="Team Name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter your team name"
                />
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.33% - 16px)' } }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Budget Used
                  </Typography>
                  <Typography variant="h6" color={usedBudget > budget * 0.8 ? 'error.main' : 'success.main'}>
                    ${usedBudget.toFixed(2)} / ${budget}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.33% - 16px)' } }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Players Selected
                  </Typography>
                  <Typography variant="h6">
                    {selectedPlayers.length} / 11
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {/* Available Players */}
          <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 calc(66.66% - 16px)' } }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                  Available Players
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {samplePlayers.map((player) => (
                    <Box key={player.id} sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                      <Card 
                        variant="outlined"
                        sx={{ 
                          opacity: selectedPlayers.find(p => p.id === player.id) ? 0.5 : 1,
                          transition: 'opacity 0.2s'
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Avatar sx={{ mr: 2, bgcolor: getPositionColor(player.position) }}>
                              {player.name.charAt(0)}
                            </Avatar>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                {player.name}
                              </Typography>
                              <Chip 
                                label={player.position} 
                                size="small"
                                sx={{ 
                                  bgcolor: getPositionColor(player.position),
                                  color: 'white',
                                  fontSize: '0.7rem'
                                }}
                              />
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Points: {player.points}
                              </Typography>
                              <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'bold' }}>
                                ${player.price}
                              </Typography>
                            </Box>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<Add />}
                              onClick={() => addPlayer(player)}
                              disabled={
                                selectedPlayers.length >= 11 ||
                                selectedPlayers.find(p => p.id === player.id) !== undefined ||
                                usedBudget + player.price > budget
                              }
                            >
                              Add
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Selected Team */}
          <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 calc(33.33% - 16px)' } }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                  Your Team ({selectedPlayers.length}/11)
                </Typography>
                {selectedPlayers.length === 0 ? (
                  <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No players selected yet
                  </Typography>
                ) : (
                  <Box sx={{ mb: 3 }}>
                    {selectedPlayers.map((player) => (
                      <Box 
                        key={player.id}
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          py: 1,
                          borderBottom: '1px solid',
                          borderColor: 'divider'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar 
                            sx={{ 
                              mr: 1, 
                              width: 32, 
                              height: 32,
                              bgcolor: getPositionColor(player.position),
                              fontSize: '0.8rem'
                            }}
                          >
                            {player.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {player.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ${player.price}
                            </Typography>
                          </Box>
                        </Box>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => removePlayer(player.id)}
                          sx={{ minWidth: 'auto', p: 0.5 }}
                        >
                          <Remove />
                        </Button>
                      </Box>
                    ))}
                  </Box>
                )}
                
                {selectedPlayers.length === 11 && teamName && (
                  <Button 
                    fullWidth 
                    variant="contained" 
                    size="large"
                    sx={{ mt: 2 }}
                  >
                    Save Team
                  </Button>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default TeamPage;