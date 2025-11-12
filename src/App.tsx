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
import ViewTeamsPage from './pages/ViewTeamsPage';
import ProfilePage from './pages/ProfilePage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import AdminPage from './pages/AdminPage';
import PlayerPoolManagementPage from './pages/PlayerPoolManagementPage';
import EditLeaguePage from './pages/EditLeaguePage';
import LeagueRulesPage from './pages/LeagueRulesPage';

// Create Material-UI theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ff005d',
    },
    secondary: {
      main: '#00e5ff',
    },
    background: {
      default: '#000000',
      paper: '#1a1a1a',
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
      fontWeight: 700,
    },
    h2: {
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
      fontWeight: 700,
    },
    h3: {
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
      fontWeight: 600,
    },
    h4: {
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
      fontWeight: 600,
    },
    h5: {
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
      fontWeight: 600,
    },
    h6: {
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
      fontWeight: 600,
    },
    button: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 500,
      textTransform: 'none',
    },
    body1: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 400,
    },
    body2: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 400,
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
