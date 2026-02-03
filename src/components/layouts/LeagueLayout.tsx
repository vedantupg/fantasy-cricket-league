/**
 * League Layout Wrapper
 * Wraps league pages and provides the AI Assistant
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import LeagueAssistant from '../LeagueAssistant';

interface LeagueLayoutProps {
  children: React.ReactNode;
}

const LeagueLayout: React.FC<LeagueLayoutProps> = ({ children }) => {
  const { leagueId } = useParams<{ leagueId: string }>();

  return (
    <>
      {children}
      {leagueId && <LeagueAssistant leagueId={leagueId} />}
    </>
  );
};

export default LeagueLayout;
