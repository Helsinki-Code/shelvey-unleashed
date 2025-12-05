import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Users, Zap, Target, Shield, Award, Globe } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const AboutPage = () => {
  const values = [
    { icon: Zap, title: 'Innovation', description: 'Pushing the boundaries of AI-powered business automation.' },
    { icon: Shield, title: 'Security', description: 'Enterprise-grade security protecting your business data.' },
    { icon: Target, title: 'Results', description: 'Focused on delivering measurable business outcomes.' },
    { icon: Users, title: 'Partnership', description: 'Working alongside you as your AI business partner.' },
  ];

  return (
    <>
      <Helmet>
        <title>About Us - ShelVey | AI-Powered Business Automation</title>
        <meta name="description" content="Learn about ShelVey's mission to revolutionize business building with AI agents that work 24/7." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="pt-24 pb-16">
          {/* Hero */}
          <section className="container mx-auto px-4 py-16 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto"
            >
              <h1 className="text-4xl md:text-5xl font-cyber font-bold mb-6 text-gradient">
                About ShelVey
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                We're building the future of autonomous business operations. Our AI agents work tirelessly 
                to research, build, market, and scale businesses—so you can focus on what matters most.
              </p>
            </motion.div>
          </section>

          {/* Mission */}
          <section className="container mx-auto px-4 py-16">
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="glass-morphism cyber-border p-8 md:p-12 rounded-2xl"
              >
                <div className="flex items-center gap-3 mb-6">
                  <Award className="w-8 h-8 text-primary" />
                  <h2 className="text-2xl font-cyber font-bold">Our Mission</h2>
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  At ShelVey, we believe every entrepreneur deserves access to a world-class team. 
                  Our mission is to democratize business building by providing AI-powered agents that 
                  operate like a real company—with specialized departments for research, branding, 
                  development, marketing, sales, and operations. We're not just building tools; 
                  we're building your autonomous workforce.
                </p>
              </motion.div>
            </div>
          </section>

          {/* Values */}
          <section className="container mx-auto px-4 py-16">
            <h2 className="text-3xl font-cyber font-bold text-center mb-12">Our Values</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {values.map((value, index) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-morphism cyber-border p-6 rounded-xl text-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-cyber font-semibold mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Company Info */}
          <section className="container mx-auto px-4 py-16">
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="glass-morphism cyber-border p-8 rounded-2xl"
              >
                <div className="flex items-center gap-3 mb-6">
                  <Globe className="w-8 h-8 text-primary" />
                  <h2 className="text-2xl font-cyber font-bold">Company Information</h2>
                </div>
                <div className="space-y-4 text-muted-foreground">
                  <p><strong className="text-foreground">Company:</strong> ShelVey, LLC</p>
                  <p><strong className="text-foreground">Address:</strong> 131 Continental Dr Suite 305, Newark, DE, 19713 US</p>
                  <p><strong className="text-foreground">Support:</strong> support@shelvey.pro</p>
                  <p><strong className="text-foreground">General Inquiries:</strong> admin@shelvey.pro</p>
                </div>
              </motion.div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default AboutPage;
