import { Navbar } from '@/components/Navbar';
import { NeuralNetwork } from '@/components/NeuralNetwork';
import { LiveFeed } from '@/components/LiveFeed';
import { Footer } from '@/components/Footer';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Network, Cpu, Zap, Activity } from 'lucide-react';

const NeuralPage = () => {
  const networkStats = [
    { icon: Network, label: 'Active Connections', value: '2,847', color: 'text-primary' },
    { icon: Cpu, label: 'Processing Nodes', value: '25', color: 'text-cyber-cyan' },
    { icon: Zap, label: 'Data Packets/sec', value: '12.4K', color: 'text-yellow-500' },
    { icon: Activity, label: 'Network Latency', value: '8ms', color: 'text-green-500' },
  ];

  return (
    <>
      <Helmet>
        <title>Neural Communication Network - ShelVey</title>
        <meta 
          name="description" 
          content="Visualize real-time agent-to-agent communication. Watch data flow between 25 AI agents as they coordinate to build businesses." 
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="pt-24">
          {/* Hero */}
          <section className="py-16 relative overflow-hidden">
            <div className="absolute inset-0 matrix-bg opacity-20" />
            <div className="container mx-auto px-4 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
              >
                <h1 className="font-cyber text-4xl md:text-5xl font-bold mb-4">
                  <span className="text-gradient">NEURAL NETWORK</span>
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                  Real-time visualization of the AI workforce communication matrix. 
                  Every connection represents active data exchange between agents.
                </p>
              </motion.div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {networkStats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-6 rounded-xl bg-card border border-border text-center hover:border-primary/30 transition-colors"
                  >
                    <stat.icon className={`w-8 h-8 mx-auto mb-3 ${stat.color}`} />
                    <div className={`text-3xl font-cyber ${stat.color} mb-1`}>{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          <NeuralNetwork />
          <LiveFeed />
        </main>

        <Footer />
      </div>
    </>
  );
};

export default NeuralPage;
