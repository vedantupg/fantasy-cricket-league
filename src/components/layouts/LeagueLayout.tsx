/**
 * League Layout Wrapper
 * Wraps league pages
 */

import React from 'react';

interface LeagueLayoutProps {
  children: React.ReactNode;
}

const LeagueLayout: React.FC<LeagueLayoutProps> = ({ children }) => {
  return <>{children}</>;
};

export default LeagueLayout;
