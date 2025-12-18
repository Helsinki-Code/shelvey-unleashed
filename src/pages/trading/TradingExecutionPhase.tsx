import { Helmet } from 'react-helmet-async';
import TradingPhaseLayout from '@/components/trading/TradingPhaseLayout';

const TradingExecutionPhase = () => {
  return (
    <>
      <Helmet>
        <title>Execution Phase | Trading Terminal</title>
      </Helmet>
      <TradingPhaseLayout phaseNumber={4} />
    </>
  );
};

export default TradingExecutionPhase;
