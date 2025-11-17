import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LeagueListPage from './pages/LeagueListPage';
import CreateLeaguePage from './pages/CreateLeaguePage';
import JoinLeaguePage from './pages/JoinLeaguePage';
import LeagueDashboardPage from './pages/LeagueDashboardPage';
import SquadSelectionPage from './pages/SquadSelectionPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ViewTeamsPage from './pages/ViewTeamsPage';
import ProfilePage from './pages/ProfilePage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import AdminPage from './pages/AdminPage';
import PlayerPoolManagementPage from './pages/PlayerPoolManagementPage';
import EditLeaguePage from './pages/EditLeaguePage';
import LeagueRulesPage from './pages/LeagueRulesPage';

// Neo-Brutalist Sports Dashboard Theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ff005d', // FCL Pink
      light: '#ff4081',
      dark: '#c51162',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#00e5ff', // FCL Cyan
      light: '#6effff',
      dark: '#00b2cc',
      contrastText: '#000000',
    },
    info: {
      main: '#0d47a1', // Dark Blue
      light: '#5472d3',
      dark: '#002171',
      contrastText: '#ffffff',
    },
    background: {
      default: '#000000', // Black
      paper: '#ffffff', // White for cards
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
    },
    divider: '#000000',
  },
  typography: {
    fontFamily: '"Montserrat", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Montserrat", sans-serif',
      fontWeight: 900,
      fontSize: '3.5rem',
      letterSpacing: '-0.02em',
      color: '#ffffff',
    },
    h2: {
      fontFamily: '"Montserrat", sans-serif',
      fontWeight: 800,
      fontSize: '2.75rem',
      letterSpacing: '-0.01em',
      color: '#ffffff',
    },
    h3: {
      fontFamily: '"Montserrat", sans-serif',
      fontWeight: 700,
      fontSize: '2.25rem',
      color: '#ffffff',
    },
    h4: {
      fontFamily: '"Montserrat", sans-serif',
      fontWeight: 700,
      fontSize: '1.875rem',
      color: '#ffffff',
    },
    h5: {
      fontFamily: '"Montserrat", sans-serif',
      fontWeight: 700,
      fontSize: '1.5rem',
      color: '#ffffff',
    },
    h6: {
      fontFamily: '"Montserrat", sans-serif',
      fontWeight: 700,
      fontSize: '1.25rem',
      color: '#ffffff',
    },
    button: {
      fontFamily: '"Montserrat", sans-serif',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    body1: {
      fontFamily: '"Montserrat", sans-serif',
      fontWeight: 500,
      fontSize: '1rem',
    },
    body2: {
      fontFamily: '"Montserrat", sans-serif',
      fontWeight: 500,
      fontSize: '0.875rem',
    },
  },
  shape: {
    borderRadius: 0, // No rounded corners for Neo-Brutalism
  },
  shadows: [
    'none',
    '5px 5px 0px #000000',
    '6px 6px 0px #000000',
    '7px 7px 0px #000000',
    '8px 8px 0px #000000',
    '9px 9px 0px #000000',
    '10px 10px 0px #000000',
    '11px 11px 0px #000000',
    '12px 12px 0px #000000',
    '13px 13px 0px #000000',
    '14px 14px 0px #000000',
    '15px 15px 0px #000000',
    '16px 16px 0px #000000',
    '17px 17px 0px #000000',
    '18px 18px 0px #000000',
    '19px 19px 0px #000000',
    '20px 20px 0px #000000',
    '21px 21px 0px #000000',
    '22px 22px 0px #000000',
    '23px 23px 0px #000000',
    '24px 24px 0px #000000',
    '25px 25px 0px #000000',
    '26px 26px 0px #000000',
    '27px 27px 0px #000000',
    '28px 28px 0px #000000',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#000000',
          color: '#ffffff',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          border: '3px solid #000000',
          padding: '12px 24px',
          fontSize: '0.875rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          transition: 'all 0.1s ease',
          '&:hover': {
            transform: 'translate(-2px, -2px)',
            boxShadow: '6px 6px 0px #000000',
          },
          '&:active': {
            transform: 'translate(0px, 0px)',
            boxShadow: '3px 3px 0px #000000',
          },
        },
        contained: {
          boxShadow: '4px 4px 0px #000000',
          '&:hover': {
            boxShadow: '6px 6px 0px #000000',
          },
        },
        outlined: {
          border: '3px solid #000000',
          backgroundColor: '#ffffff',
          color: '#000000',
          '&:hover': {
            border: '3px solid #000000',
            backgroundColor: '#ffffff',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          border: '4px solid #000000',
          boxShadow: '8px 8px 0px #000000',
          backgroundColor: '#ffffff',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translate(-2px, -2px)',
            boxShadow: '10px 10px 0px #000000',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          border: '3px solid #000000',
          boxShadow: '6px 6px 0px #000000',
          backgroundColor: '#ffffff',
        },
        elevation0: {
          boxShadow: 'none',
          border: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          border: '2px solid #000000',
          fontWeight: 700,
          fontSize: '0.75rem',
        },
        filled: {
          border: '2px solid #000000',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          border: '3px solid #000000',
          fontWeight: 600,
        },
        standardSuccess: {
          backgroundColor: '#00e5ff',
          color: '#000000',
          border: '3px solid #000000',
        },
        standardError: {
          backgroundColor: '#ff005d',
          color: '#ffffff',
          border: '3px solid #000000',
        },
        standardWarning: {
          backgroundColor: '#ffeb3b',
          color: '#000000',
          border: '3px solid #000000',
        },
        standardInfo: {
          backgroundColor: '#0d47a1',
          color: '#ffffff',
          border: '3px solid #000000',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 0,
            backgroundColor: '#ffffff',
            '& fieldset': {
              border: '3px solid #000000',
            },
            '&:hover fieldset': {
              border: '3px solid #000000',
            },
            '&.Mui-focused fieldset': {
              border: '3px solid #ff005d',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#ffffff',
            fontWeight: 600,
          },
          '& .MuiInputBase-input': {
            color: '#000000',
            fontWeight: 600,
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          backgroundColor: '#ffffff',
          '& fieldset': {
            border: '3px solid #000000',
          },
          '&:hover fieldset': {
            border: '3px solid #000000',
          },
          '&.Mui-focused fieldset': {
            border: '3px solid #ff005d',
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          textTransform: 'uppercase',
          fontSize: '0.875rem',
          minHeight: '48px',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: '4px',
          backgroundColor: '#ff005d',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Profile Setup Route */}
            <Route path="/profile-setup" element={
              <ProtectedRoute>
                <ProfileSetupPage />
              </ProtectedRoute>
            } />

            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <LeagueListPage />
              </ProtectedRoute>
            } />
            
            {/* League Management */}
            <Route path="/leagues/create" element={
              <ProtectedRoute adminOnly={true}>
                <CreateLeaguePage />
              </ProtectedRoute>
            } />
            
            <Route path="/leagues/join" element={
              <ProtectedRoute>
                <JoinLeaguePage />
              </ProtectedRoute>
            } />
            
            <Route path="/leagues/:leagueId" element={
              <ProtectedRoute>
                <LeagueDashboardPage />
              </ProtectedRoute>
            } />

            <Route path="/leagues/:leagueId/edit" element={
              <ProtectedRoute>
                <EditLeaguePage />
              </ProtectedRoute>
            } />

            <Route path="/leagues/:leagueId/squad" element={
              <ProtectedRoute>
                <SquadSelectionPage />
              </ProtectedRoute>
            } />
            
            <Route path="/leagues/:leagueId/leaderboard" element={
              <ProtectedRoute>
                <LeaderboardPage />
              </ProtectedRoute>
            } />

            <Route path="/leagues/:leagueId/analytics" element={
              <ProtectedRoute>
                <AnalyticsPage />
              </ProtectedRoute>
            } />

            <Route path="/leagues/:leagueId/teams" element={
              <ProtectedRoute>
                <ViewTeamsPage />
              </ProtectedRoute>
            } />

            <Route path="/leagues/:leagueId/rules" element={
              <ProtectedRoute>
                <LeagueRulesPage />
              </ProtectedRoute>
            } />

            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            
            {/* Admin Routes */}
            <Route path="/admin/*" element={
              <ProtectedRoute adminOnly={true}>
                <AdminPage />
              </ProtectedRoute>
            } />

            <Route path="/admin/player-pools" element={
              <ProtectedRoute adminOnly={true}>
                <PlayerPoolManagementPage />
              </ProtectedRoute>
            } />

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
