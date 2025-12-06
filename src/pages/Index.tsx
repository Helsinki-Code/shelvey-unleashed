import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { PhaseProcessSection } from '@/components/PhaseProcessSection';
import { CEOPersonaSection } from '@/components/CEOPersonaSection';
import { VoiceCallingSection } from '@/components/VoiceCallingSection';
import { ApprovalWorkflowSection } from '@/components/ApprovalWorkflowSection';
import { WebsiteHostingSection } from '@/components/WebsiteHostingSection';
import { MCPServersSection } from '@/components/MCPServersSection';
import { AutonomousIncomeSection } from '@/components/AutonomousIncomeSection';
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
        <title>ShelVey - Your Personal AI CEO Builds Profitable Businesses 24/7</title>
        <meta 
          name="description" 
          content="Create your custom AI CEO, deploy 25 specialized agents through a 5-phase business machine, and generate passive income through autonomous e-commerce, trading, and print-on-demand automation." 
        />
        <meta name="keywords" content="AI CEO, autonomous business, trading bot, e-commerce automation, print on demand, passive income, Shopify automation, crypto trading bot, MCP servers" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        <main>
          <HeroSection />
          <PhaseProcessSection />
          <CEOPersonaSection />
          <VoiceCallingSection />
          <ApprovalWorkflowSection />
          <WebsiteHostingSection />
          <AgentGrid />
          <MCPServersSection />
          <AutonomousIncomeSection />
          <BusinessPipeline />
          <NeuralNetwork />
          <LiveFeed />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
