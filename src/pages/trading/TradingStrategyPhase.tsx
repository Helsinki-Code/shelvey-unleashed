import { Helmet } from 'react-helmet-async';
import TradingPhaseLayout from '@/components/trading/TradingPhaseLayout';

const TradingStrategyPhase = () => {
  return (
    <>
      <Helmet>
        <title>Strategy Phase | Trading Terminal</title>
      </Helmet>
      <TradingPhaseLayout phaseNumber={2} />
    </>
  );
};

export default TradingStrategyPhase;
