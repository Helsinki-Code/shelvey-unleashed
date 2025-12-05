import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { MCPServersSection } from '@/components/MCPServersSection';
import { AgentGrid } from '@/components/AgentGrid';
import { NeuralNetwork } from '@/components/NeuralNetwork';
import { LiveFeed } from '@/components/LiveFeed';
import { BusinessPipeline } from '@/components/BusinessPipeline';
import { Footer } from '@/components/Footer';
import { Helmet } from 'react-helmet-async';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>ShelVey - Autonomous AI Sales & Business Creation Ecosystem</title>
        <meta 
          name="description" 
          content="ShelVey is an autonomous AI workforce with 25+ specialized agents connected to 26 real-time MCP servers. Build, market, and scale businesses with AI-powered automation." 
        />
        <meta name="keywords" content="AI workforce, autonomous agents, business automation, AI sales, SaaS creation, MCP servers" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        <main>
          <HeroSection />
          <MCPServersSection />
          <AgentGrid />
          <NeuralNetwork />
          <BusinessPipeline />
          <LiveFeed />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
