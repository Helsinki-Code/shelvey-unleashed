import { Helmet } from 'react-helmet-async';
import TradingPhaseLayout from '@/components/trading/TradingPhaseLayout';

const TradingOptimizePhase = () => {
  return (
    <>
      <Helmet>
        <title>Optimize Phase | Trading Terminal</title>
      </Helmet>
      <TradingPhaseLayout phaseNumber={6} />
    </>
  );
};

export default TradingOptimizePhase;
