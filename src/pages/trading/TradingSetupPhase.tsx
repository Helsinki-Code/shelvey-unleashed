import { Helmet } from 'react-helmet-async';
import TradingPhaseLayout from '@/components/trading/TradingPhaseLayout';

const TradingSetupPhase = () => {
  return (
    <>
      <Helmet>
        <title>Setup Phase | Trading Terminal</title>
      </Helmet>
      <TradingPhaseLayout phaseNumber={3} />
    </>
  );
};

export default TradingSetupPhase;
