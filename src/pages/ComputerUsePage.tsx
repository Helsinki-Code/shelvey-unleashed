import { Helmet } from 'react-helmet-async';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import ComputerUseViewer from '@/components/ComputerUseViewer';
import { motion } from 'framer-motion';
import { Monitor, Bot, Zap } from 'lucide-react';

const ComputerUsePage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Computer Use | ShelVey - AI Browser Automation</title>
        <meta name="description" content="AI-powered browser automation for market research, competitor analysis, and web tasks." />
      </Helmet>
      
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Monitor className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Computer Use Tool</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              AI Browser
              <span className="text-primary"> Automation</span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Let AI agents control the browser to perform research, analyze competitors, 
              test websites, and automate web-based tasks.
            </p>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
          >
            {[
              {
                icon: Bot,
                title: 'AI-Powered Navigation',
                description: 'AI analyzes screenshots and determines optimal actions',
              },
              {
                icon: Monitor,
                title: 'Visual Feedback',
                description: 'Watch the browser in real-time with live screenshots',
              },
              {
                icon: Zap,
                title: 'Multi-Step Tasks',
                description: 'Execute complex workflows across multiple pages',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-card/50 border border-border/50 text-center"
              >
                <feature.icon className="w-8 h-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </motion.div>

          {/* Main Viewer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ComputerUseViewer 
              agentId="research-agent"
              onComplete={(result) => {
                console.log('Task completed:', result);
              }}
            />
          </motion.div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ComputerUsePage;
