import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { SimplifiedHero } from '@/components/SimplifiedHero';
import { HowItWorks } from '@/components/HowItWorks';
import { MeetYourTeam } from '@/components/MeetYourTeam';
import { ConnectedApps } from '@/components/ConnectedApps';
import { LiveDemoChat } from '@/components/LiveDemoChat';
import { MCPServersSection } from '@/components/MCPServersSection';
import { AgentGrid } from '@/components/AgentGrid';
import { NeuralNetwork } from '@/components/NeuralNetwork';
import { LiveFeed } from '@/components/LiveFeed';
import { BusinessPipeline } from '@/components/BusinessPipeline';
import { Footer } from '@/components/Footer';
import { Helmet } from 'react-helmet-async';
import { useExperienceMode } from '@/contexts/ExperienceModeContext';

const Index = () => {
  const { isBeginner } = useExperienceMode();

  return (
    <>
      <Helmet>
        <title>ShelVey - Your AI Business Team | Build Your Business in Days</title>
        <meta 
          name="description" 
          content="ShelVey is your AI business team with 25+ specialized agents. Tell us your idea, and our AI team will research, design, build, and market your business." 
        />
        <meta name="keywords" content="AI workforce, autonomous agents, business automation, AI sales, SaaS creation, business builder" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        <main>
          {/* Beginner-friendly sections */}
          <SimplifiedHero />
          <HowItWorks />
          <MeetYourTeam />
          <ConnectedApps />
          <LiveDemoChat />
          
          {/* Expert sections (hidden in beginner mode via component logic) */}
          {!isBeginner && (
            <>
              <HeroSection />
              <MCPServersSection />
              <AgentGrid />
              <NeuralNetwork />
              <BusinessPipeline />
            </>
          )}
          
          <LiveFeed />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
