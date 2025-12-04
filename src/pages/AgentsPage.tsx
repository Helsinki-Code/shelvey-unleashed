import { Navbar } from '@/components/Navbar';
import { AgentGrid } from '@/components/AgentGrid';
import { Footer } from '@/components/Footer';
import { motion } from 'framer-motion';
import { agents, divisionNames, Division } from '@/lib/agents-data';
import { Helmet } from 'react-helmet-async';

const AgentsPage = () => {
  const divisions = Object.keys(divisionNames) as Division[];
  
  const divisionStats = divisions.map(div => ({
    name: divisionNames[div],
    count: agents.filter(a => a.division === div).length,
    activeCount: agents.filter(a => a.division === div && a.status === 'active').length,
  }));

  return (
    <>
      <Helmet>
        <title>AI Agent Workforce - ShelVey</title>
        <meta 
          name="description" 
          content="Meet the 25+ specialized AI agents across 8 divisions. From market research to sales, our autonomous workforce handles every aspect of business." 
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
                  <span className="text-gradient">AGENT WORKFORCE</span>
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                  25 specialized AI agents organized into 8 divisions, working 24/7 to build, 
                  market, and scale autonomous businesses.
                </p>
              </motion.div>

              {/* Division overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                {divisionStats.map((div, index) => (
                  <motion.div
                    key={div.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
                  >
                    <h3 className="font-cyber text-sm text-primary mb-2">{div.name}</h3>
                    <div className="flex items-end justify-between">
                      <span className="text-3xl font-cyber text-foreground">{div.count}</span>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs text-muted-foreground">{div.activeCount} active</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          <AgentGrid />
        </main>

        <Footer />
      </div>
    </>
  );
};

export default AgentsPage;
