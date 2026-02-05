// @ts-nocheck
/**
 * Integration Tests: Squad Selection Page
 * 
 * This is the largest page (763 lines), testing it provides significant coverage
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SquadSelectionPage from '../../pages/SquadSelectionPage';
import { AuthContext } from '../../contexts/AuthContext';

// Mock Firebase
jest.mock('../../services/firebase', () => ({
  db: {},
  auth: {},
}));

// Mock Firestore service
jest.mock('../../services/firestore', () => ({
  leagueService: {
    getById: jest.fn(),
  },
  squadService: {
    getByUserAndLeague: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  playerPoolService: {
    getById: jest.fn(),
  },
  leaderboardSnapshotService: {
    getLatestForLeague: jest.fn(),
  },
}));

// Mock react-router-dom hooks
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ leagueId: 'test-league-id' }),
  useNavigate: () => mockNavigate,
}));

describe('SquadSelectionPage', () => {
  const mockUser = {
    uid: 'test-user',
    email: 'test@example.com',
    displayName: 'Test User',
  };

  const mockAuthContext = {
    user: mockUser,
    loading: false,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    resetPassword: jest.fn(),
  };

  const mockLeague = {
    id: 'test-league-id',
    name: 'Test League',
    adminId: 'admin-id',
    squadSize: 11,
    benchSize: 4,
    transfersAllowed: 5,
    squadRules: {
      minBatsmen: 3,
      minBowlers: 3,
      minAllrounders: 1,
      minWicketkeepers: 1,
    },
    playerPoolId: 'test-pool',
    createdAt: new Date(),
    status: 'active',
    participants: ['test-user'],
  };

  const mockPlayerPool = {
    id: 'test-pool',
    name: 'Test Pool',
    players: [
      {
        playerId: 'p1',
        playerName: 'Player 1',
        role: 'batsman',
        points: 100,
      },
      {
        playerId: 'p2',
        playerName: 'Player 2',
        role: 'bowler',
        points: 80,
      },
      {
        playerId: 'p3',
        playerName: 'Player 3',
        role: 'allrounder',
        points: 90,
      },
      {
        playerId: 'p4',
        playerName: 'Player 4',
        role: 'wicketkeeper',
        points: 75,
      },
    ],
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { leagueService, squadService, playerPoolService, leaderboardSnapshotService } = 
      require('../../services/firestore');
    
    leagueService.getById.mockResolvedValue(mockLeague);
    squadService.getByUserAndLeague.mockResolvedValue(null);
    playerPoolService.getById.mockResolvedValue(mockPlayerPool);
    leaderboardSnapshotService.getLatestForLeague.mockResolvedValue(null);
  });

  const renderPage = () => {
    return render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <SquadSelectionPage />
        </AuthContext.Provider>
      </BrowserRouter>
    );
  };

  it('should render loading state initially', () => {
    renderPage();
    expect(screen.getByText(/loading/i) || screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should load league data on mount', async () => {
    const { leagueService } = require('../../services/firestore');
    
    renderPage();

    await waitFor(() => {
      expect(leagueService.getById).toHaveBeenCalledWith('test-league-id');
    });
  });

  it('should render league name after loading', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Test League/i)).toBeInTheDocument();
    });
  });

  it('should show player selection interface', async () => {
    renderPage();

    await waitFor(() => {
      // Should show some player selection UI
      expect(screen.queryByText(/select/i) || screen.queryByText(/squad/i)).toBeTruthy();
    });
  });

  it('should handle user not authenticated', async () => {
    const unauthContext = { ...mockAuthContext, user: null };

    render(
      <BrowserRouter>
        <AuthContext.Provider value={unauthContext}>
          <SquadSelectionPage />
        </AuthContext.Provider>
      </BrowserRouter>
    );

    // Should redirect or show error
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  it('should handle league not found', async () => {
    const { leagueService } = require('../../services/firestore');
    leagueService.getById.mockResolvedValue(null);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/not found/i) || screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('should load existing squad if user has one', async () => {
    const mockSquad = {
      id: 'squad-1',
      userId: 'test-user',
      leagueId: 'test-league-id',
      players: [
        {
          playerId: 'p1',
          playerName: 'Player 1',
          role: 'batsman',
          points: 100,
          pointsAtJoining: 100,
          matchPerformances: {},
        },
      ],
      captainId: 'p1',
      transfersUsed: 0,
      totalPoints: 100,
    };

    const { squadService } = require('../../services/firestore');
    squadService.getByUserAndLeague.mockResolvedValue(mockSquad);

    renderPage();

    await waitFor(() => {
      expect(squadService.getByUserAndLeague).toHaveBeenCalledWith('test-user', 'test-league-id');
    });
  });

  it('should show player pool after loading', async () => {
    renderPage();

    await waitFor(() => {
      // Players from mock pool should be visible (or UI for selecting them)
      expect(screen.queryByText(/Player 1/i) || screen.queryByText(/player/i)).toBeTruthy();
    });
  });

  it('should handle player pool load error gracefully', async () => {
    const { playerPoolService } = require('../../services/firestore');
    playerPoolService.getById.mockRejectedValue(new Error('Failed to load'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/error/i) || screen.getByText(/failed/i)).toBeInTheDocument();
    });
  });
});

export {};
