import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Shield, Lock, Server, Eye, Key, CheckCircle } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const SecurityPage = () => {
  const securityFeatures = [
    {
      icon: Lock,
      title: 'Encryption',
      description: 'All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption.',
    },
    {
      icon: Server,
      title: 'Secure Infrastructure',
      description: 'Our platform is hosted on enterprise-grade cloud infrastructure with 99.99% uptime SLA.',
    },
    {
      icon: Key,
      title: 'API Key Security',
      description: 'Your API keys are encrypted and stored securely, never exposed in client-side code.',
    },
    {
      icon: Eye,
      title: 'Access Controls',
      description: 'Role-based access controls and audit logging for all administrative actions.',
    },
  ];

  const certifications = [
    'SOC 2 Type II Compliant Infrastructure',
    'GDPR Compliant Data Processing',
    'CCPA Compliant',
    'Regular Penetration Testing',
    'Continuous Vulnerability Scanning',
    '24/7 Security Monitoring',
  ];

  return (
    <>
      <Helmet>
        <title>Security - ShelVey</title>
        <meta name="description" content="Learn about ShelVey's security measures protecting your business data and ensuring platform integrity." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-16"
            >
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Shield className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-cyber font-bold mb-6 text-gradient">
                Security at ShelVey
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Your security is our top priority. We employ industry-leading security measures 
                to protect your data and ensure the integrity of our platform.
              </p>
            </motion.div>

            {/* Security Features */}
            <section className="mb-16">
              <h2 className="text-2xl font-cyber font-bold text-center mb-8">Security Features</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                {securityFeatures.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="glass-morphism cyber-border p-6 rounded-xl"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-cyber font-semibold mb-2 text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Certifications */}
            <section className="max-w-4xl mx-auto mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="glass-morphism cyber-border p-8 rounded-2xl"
              >
                <h2 className="text-2xl font-cyber font-bold mb-6 text-foreground">Compliance & Certifications</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {certifications.map((cert) => (
                    <div key={cert} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">{cert}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </section>

            {/* Data Protection */}
            <section className="max-w-4xl mx-auto mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="glass-morphism cyber-border p-8 rounded-2xl"
              >
                <h2 className="text-2xl font-cyber font-bold mb-6 text-foreground">Data Protection Measures</h2>
                <div className="space-y-6 text-muted-foreground">
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Database Security</h3>
                    <p>
                      All database connections are encrypted. Row-level security (RLS) policies ensure users 
                      can only access their own data. Regular automated backups with point-in-time recovery.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Authentication</h3>
                    <p>
                      Secure authentication with email verification, password hashing using bcrypt, 
                      and optional multi-factor authentication. Session management with secure, httpOnly cookies.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">API Security</h3>
                    <p>
                      All API endpoints are protected with JWT authentication. Rate limiting prevents abuse. 
                      Input validation and sanitization on all endpoints to prevent injection attacks.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Third-Party Integrations</h3>
                    <p>
                      API keys for third-party services are encrypted using AES-256 before storage. 
                      Keys are never exposed to client-side code and are only used in secure server-side functions.
                    </p>
                  </div>
                </div>
              </motion.div>
            </section>

            {/* Report Security Issues */}
            <section className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="glass-morphism cyber-border p-8 rounded-2xl text-center"
              >
                <h2 className="text-2xl font-cyber font-bold mb-4 text-foreground">Report Security Issues</h2>
                <p className="text-muted-foreground mb-6">
                  If you discover a security vulnerability, please report it responsibly. 
                  We take all security reports seriously and will respond promptly.
                </p>
                <p className="text-foreground">
                  Contact our security team at: <a href="mailto:security@shelvey.pro" className="text-primary hover:underline">security@shelvey.pro</a>
                </p>
              </motion.div>
            </section>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default SecurityPage;
