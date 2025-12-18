import { Helmet } from 'react-helmet-async';
import TradingPhaseLayout from '@/components/trading/TradingPhaseLayout';

const TradingResearchPhase = () => {
  return (
    <>
      <Helmet>
        <title>Research Phase | Trading Terminal</title>
      </Helmet>
      <TradingPhaseLayout phaseNumber={1} />
    </>
  );
};

export default TradingResearchPhase;
