import React from 'react';
import { MarketDataFeedStatusBadge } from './MarketDataFeedStatusBadge';

export const DemoDataBadge: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  return <MarketDataFeedStatusBadge compact={compact} />;
};
