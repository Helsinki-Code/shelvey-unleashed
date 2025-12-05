import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const PrivacyPage = () => {
  return (
    <>
      <Helmet>
        <title>Privacy Policy - ShelVey</title>
        <meta name="description" content="Learn how ShelVey collects, uses, and protects your personal information." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 py-16 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-4xl font-cyber font-bold mb-8 text-gradient">Privacy Policy</h1>
              <p className="text-muted-foreground mb-8">Last updated: December 5, 2025</p>

              <div className="prose prose-invert max-w-none space-y-8">
                <section className="glass-morphism cyber-border p-6 rounded-xl">
                  <h2 className="text-xl font-cyber font-bold mb-4 text-foreground">1. Information We Collect</h2>
                  <p className="text-muted-foreground mb-4">We collect information you provide directly:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Account information (name, email, password)</li>
                    <li>Business information you provide to our AI agents</li>
                    <li>Payment information (processed securely via Stripe)</li>
                    <li>Communications with our support team</li>
                    <li>API keys you configure for integrations</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">We automatically collect:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Usage data and analytics</li>
                    <li>Device and browser information</li>
                    <li>IP address and location data</li>
                    <li>Cookies and similar tracking technologies</li>
                  </ul>
                </section>

                <section className="glass-morphism cyber-border p-6 rounded-xl">
                  <h2 className="text-xl font-cyber font-bold mb-4 text-foreground">2. How We Use Your Information</h2>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Provide, maintain, and improve our services</li>
                    <li>Process transactions and send related information</li>
                    <li>Send you technical notices, updates, and support messages</li>
                    <li>Respond to your comments and questions</li>
                    <li>Analyze usage patterns to improve user experience</li>
                    <li>Detect, investigate, and prevent fraudulent activities</li>
                    <li>Comply with legal obligations</li>
                  </ul>
                </section>

                <section className="glass-morphism cyber-border p-6 rounded-xl">
                  <h2 className="text-xl font-cyber font-bold mb-4 text-foreground">3. Data Sharing</h2>
                  <p className="text-muted-foreground mb-4">We may share your information with:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li><strong>Service Providers:</strong> Third-party vendors who assist in operating our platform (Stripe, cloud hosting, analytics)</li>
                    <li><strong>Legal Requirements:</strong> When required by law, court order, or government request</li>
                    <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    We do NOT sell your personal information to third parties for marketing purposes.
                  </p>
                </section>

                <section className="glass-morphism cyber-border p-6 rounded-xl">
                  <h2 className="text-xl font-cyber font-bold mb-4 text-foreground">4. Data Security</h2>
                  <p className="text-muted-foreground">
                    We implement industry-standard security measures to protect your data, including encryption in transit 
                    and at rest, secure data centers, regular security audits, and access controls. However, no method of 
                    transmission over the Internet is 100% secure.
                  </p>
                </section>

                <section className="glass-morphism cyber-border p-6 rounded-xl">
                  <h2 className="text-xl font-cyber font-bold mb-4 text-foreground">5. Data Retention</h2>
                  <p className="text-muted-foreground">
                    We retain your personal information for as long as your account is active or as needed to provide services. 
                    We may retain certain information as required by law or for legitimate business purposes. You can request 
                    deletion of your account and associated data at any time.
                  </p>
                </section>

                <section className="glass-morphism cyber-border p-6 rounded-xl">
                  <h2 className="text-xl font-cyber font-bold mb-4 text-foreground">6. Your Rights</h2>
                  <p className="text-muted-foreground mb-4">Depending on your location, you may have the right to:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Access, correct, or delete your personal information</li>
                    <li>Object to or restrict certain processing</li>
                    <li>Data portability</li>
                    <li>Withdraw consent where applicable</li>
                    <li>Lodge a complaint with a supervisory authority</li>
                  </ul>
                </section>

                <section className="glass-morphism cyber-border p-6 rounded-xl">
                  <h2 className="text-xl font-cyber font-bold mb-4 text-foreground">7. Cookies</h2>
                  <p className="text-muted-foreground">
                    We use cookies and similar technologies to enhance your experience, remember preferences, and analyze usage. 
                    You can control cookies through your browser settings, but disabling them may affect functionality.
                  </p>
                </section>

                <section className="glass-morphism cyber-border p-6 rounded-xl">
                  <h2 className="text-xl font-cyber font-bold mb-4 text-foreground">8. Children's Privacy</h2>
                  <p className="text-muted-foreground">
                    Our services are not intended for children under 18. We do not knowingly collect personal information 
                    from children. If we learn we have collected such information, we will delete it promptly.
                  </p>
                </section>

                <section className="glass-morphism cyber-border p-6 rounded-xl">
                  <h2 className="text-xl font-cyber font-bold mb-4 text-foreground">9. International Transfers</h2>
                  <p className="text-muted-foreground">
                    Your information may be transferred to and processed in countries other than your country of residence. 
                    We ensure appropriate safeguards are in place to protect your information in accordance with this policy.
                  </p>
                </section>

                <section className="glass-morphism cyber-border p-6 rounded-xl">
                  <h2 className="text-xl font-cyber font-bold mb-4 text-foreground">10. Contact Us</h2>
                  <p className="text-muted-foreground">
                    For privacy-related questions or to exercise your rights, contact us at:<br />
                    <strong>ShelVey, LLC</strong><br />
                    131 Continental Dr Suite 305<br />
                    Newark, DE, 19713 US<br />
                    Email: support@shelvey.pro
                  </p>
                </section>
              </div>
            </motion.div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default PrivacyPage;
