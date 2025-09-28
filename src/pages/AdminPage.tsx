import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Avatar,
  Tabs,
  Tab,
  IconButton
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowBack, 
  People, 
  SportsCricket, 
  EmojiEvents, 
  Block,
  CheckCircle,
  Cancel,
  Edit
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);

  const users = [
    { id: 1, name: 'CricketKing', email: 'king@example.com', status: 'active', joinDate: '2024-01-15', teams: 5 },
    { id: 2, name: 'BoundaryHunter', email: 'hunter@example.com', status: 'active', joinDate: '2024-02-03', teams: 8 },
    { id: 3, name: 'SixerMaster', email: 'master@example.com', status: 'suspended', joinDate: '2024-01-28', teams: 3 },
    { id: 4, name: 'WicketWizard', email: 'wizard@example.com', status: 'active', joinDate: '2024-03-10', teams: 12 }
  ];

  const contests = [
    { id: 1, name: 'IPL Championship', participants: 1250, status: 'active', prize: '$10,000', startDate: '2024-04-01' },
    { id: 2, name: 'World Cup Special', participants: 2500, status: 'upcoming', prize: '$25,000', startDate: '2024-06-15' },
    { id: 3, name: 'T20 Blast', participants: 850, status: 'completed', prize: '$5,000', startDate: '2024-03-15' }
  ];

  const adminStats = [
    { label: 'Total Users', value: '15,420', icon: <People sx={{ fontSize: 40, color: 'primary.main' }} /> },
    { label: 'Active Contests', value: '24', icon: <EmojiEvents sx={{ fontSize: 40, color: 'secondary.main' }} /> },
    { label: 'Teams Created', value: '8,350', icon: <SportsCricket sx={{ fontSize: 40, color: 'primary.main' }} /> },
    { label: 'Revenue This Month', value: '$45,280', icon: <Typography variant="h3" sx={{ color: 'secondary.main' }}>$</Typography> }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'error';
      case 'upcoming': return 'warning';
      case 'completed': return 'default';
      default: return 'default';
    }
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
          Admin Panel
        </Typography>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Admin Stats */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
          {adminStats.map((stat, index) => (
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }} key={index}>
              <Card>
                <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ mr: 2 }}>
                    {stat.icon}
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {stat.value}
                    </Typography>
                    <Typography color="text.secondary">
                      {stat.label}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>

        {/* Admin Tabs */}
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabValue} 
              onChange={(e, newValue) => setTabValue(newValue)}
              aria-label="admin tabs"
            >
              <Tab label="User Management" />
              <Tab label="Contest Management" />
              <Tab label="System Settings" />
              <Tab label="Reports" />
            </Tabs>
          </Box>

          {/* User Management Tab */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
              User Management
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Join Date</TableCell>
                    <TableCell>Teams</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                            {user.name.charAt(0)}
                          </Avatar>
                          <Typography sx={{ fontWeight: 'bold' }}>
                            {user.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip 
                          label={user.status} 
                          color={getStatusColor(user.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{user.joinDate}</TableCell>
                      <TableCell>{user.teams}</TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="primary">
                          <Edit />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color={user.status === 'suspended' ? 'success' : 'error'}
                        >
                          {user.status === 'suspended' ? <CheckCircle /> : <Block />}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Contest Management Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Contest Management
              </Typography>
              <Button variant="contained">
                Create New Contest
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Contest Name</TableCell>
                    <TableCell>Participants</TableCell>
                    <TableCell>Prize Pool</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contests.map((contest) => (
                    <TableRow key={contest.id}>
                      <TableCell>
                        <Typography sx={{ fontWeight: 'bold' }}>
                          {contest.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{contest.participants.toLocaleString()}</TableCell>
                      <TableCell>{contest.prize}</TableCell>
                      <TableCell>
                        <Chip 
                          label={contest.status} 
                          color={getStatusColor(contest.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{contest.startDate}</TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="primary">
                          <Edit />
                        </IconButton>
                        <IconButton size="small" color="error">
                          <Cancel />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* System Settings Tab */}
          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
              System Settings
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' } }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Application Settings
                    </Typography>
                    <Button variant="outlined" fullWidth sx={{ mb: 1 }}>
                      Maintenance Mode
                    </Button>
                    <Button variant="outlined" fullWidth sx={{ mb: 1 }}>
                      User Registration
                    </Button>
                    <Button variant="outlined" fullWidth>
                      Payment Gateway
                    </Button>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' } }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Security Settings
                    </Typography>
                    <Button variant="outlined" fullWidth sx={{ mb: 1 }}>
                      Reset Admin Password
                    </Button>
                    <Button variant="outlined" fullWidth sx={{ mb: 1 }}>
                      View Login Logs
                    </Button>
                    <Button variant="outlined" fullWidth>
                      Security Audit
                    </Button>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          </TabPanel>

          {/* Reports Tab */}
          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
              Reports & Analytics
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.33% - 16px)' } }}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>
                      User Growth
                    </Typography>
                    <Typography variant="h3" color="primary.main" sx={{ fontWeight: 'bold' }}>
                      +23%
                    </Typography>
                    <Typography color="text.secondary">
                      This month
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.33% - 16px)' } }}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>
                      Revenue Growth
                    </Typography>
                    <Typography variant="h3" color="secondary.main" sx={{ fontWeight: 'bold' }}>
                      +18%
                    </Typography>
                    <Typography color="text.secondary">
                      This month
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.33% - 16px)' } }}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>
                      Active Users
                    </Typography>
                    <Typography variant="h3" color="success.main" sx={{ fontWeight: 'bold' }}>
                      89%
                    </Typography>
                    <Typography color="text.secondary">
                      Daily active
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Box>
            <Box sx={{ mt: 3 }}>
              <Button variant="contained" sx={{ mr: 2 }}>
                Generate Full Report
              </Button>
              <Button variant="outlined">
                Export Data
              </Button>
            </Box>
          </TabPanel>
        </Card>
      </Container>
    </Box>
  );
};

export default AdminPage;