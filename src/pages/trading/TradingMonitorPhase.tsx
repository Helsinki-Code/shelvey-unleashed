import { Helmet } from 'react-helmet-async';
import TradingPhaseLayout from '@/components/trading/TradingPhaseLayout';

const TradingMonitorPhase = () => {
  return (
    <>
      <Helmet>
        <title>Monitor Phase | Trading Terminal</title>
      </Helmet>
      <TradingPhaseLayout phaseNumber={5} />
    </>
  );
};

export default TradingMonitorPhase;
