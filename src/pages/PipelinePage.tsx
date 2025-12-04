import { Navbar } from '@/components/Navbar';
import { BusinessPipeline } from '@/components/BusinessPipeline';
import { Footer } from '@/components/Footer';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Factory, DollarSign, TrendingUp, Rocket } from 'lucide-react';

const PipelinePage = () => {
  const stats = [
    { icon: Factory, label: 'Businesses Created', value: '47', color: 'text-primary' },
    { icon: DollarSign, label: 'Total Revenue', value: '$2.4M', color: 'text-green-500' },
    { icon: TrendingUp, label: 'Avg Growth Rate', value: '340%', color: 'text-cyber-cyan' },
    { icon: Rocket, label: 'Exit Ready', value: '12', color: 'text-purple-500' },
  ];

  return (
    <>
      <Helmet>
        <title>Business Pipeline - ShelVey</title>
        <meta 
          name="description" 
          content="Track AI-powered business creation from research to exit. Watch autonomous agents build, market, and scale businesses in real-time." 
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
                  <span className="text-gradient">BUSINESS-IN-A-BOX FACTORY</span>
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                  AI identifies market gaps, builds complete products, creates branding, 
                  launches and scales autonomously, then packages for sale.
                </p>
              </motion.div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
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

          <BusinessPipeline />
        </main>

        <Footer />
      </div>
    </>
  );
};

export default PipelinePage;
