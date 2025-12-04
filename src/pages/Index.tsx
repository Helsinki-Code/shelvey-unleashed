import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { AgentGrid } from '@/components/AgentGrid';
import { NeuralNetwork } from '@/components/NeuralNetwork';
import { LiveFeed } from '@/components/LiveFeed';
import { BusinessPipeline } from '@/components/BusinessPipeline';
import { VoiceMeetingRoom } from '@/components/VoiceMeetingRoom';
import { Footer } from '@/components/Footer';
import { Helmet } from 'react-helmet-async';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>ShelVey - Autonomous AI Sales & Business Creation Ecosystem</title>
        <meta 
          name="description" 
          content="ShelVey is an autonomous AI workforce with 25+ specialized agents that operate like a real company. Build, market, and scale businesses with AI-powered automation." 
        />
        <meta name="keywords" content="AI workforce, autonomous agents, business automation, AI sales, SaaS creation" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        <main>
          <HeroSection />
          <AgentGrid />
          <NeuralNetwork />
          <VoiceMeetingRoom />
          <BusinessPipeline />
          <LiveFeed />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
