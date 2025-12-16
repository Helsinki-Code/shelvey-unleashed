import { motion } from 'framer-motion';
import { Github, Twitter, Linkedin, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import shelveyLogo from '@/assets/shelvey-logo.png';
const footerLinks = {
  product: [
    { name: 'Features', href: '/#features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Agents', href: '/agents' },
    { name: 'MCP Servers', href: '/mcp' },
  ],
  company: [
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
    { name: 'Blog', href: '/blog' },
  ],
  legal: [
    { name: 'Privacy', href: '/privacy' },
    { name: 'Terms', href: '/terms' },
    { name: 'Security', href: '/security' },
  ],
};

const socialLinks = [
  { icon: Twitter, href: 'https://twitter.com/shelveyai', label: 'Twitter' },
  { icon: Github, href: 'https://github.com/shelvey', label: 'GitHub' },
  { icon: Linkedin, href: 'https://linkedin.com/company/shelvey', label: 'LinkedIn' },
  { icon: Mail, href: 'mailto:admin@shelvey.pro', label: 'Email' },
];

export const Footer = () => {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-card/50">
      {/* Background effects */}
      <div className="absolute inset-0 matrix-bg opacity-5" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-6">
              <img 
                src={shelveyLogo} 
                alt="ShelVey Logo" 
                className="w-10 h-10 object-contain drop-shadow-[0_0_10px_hsl(var(--primary)/0.5)]" 
              />
              <div>
                <span className="font-cyber text-lg font-bold tracking-wider text-foreground">
                  SHEL<span className="text-primary">VEY</span>
                </span>
                <p className="text-xs text-muted-foreground font-mono tracking-wider">THE REAL WORKFORCE AI</p>
              </div>
            </Link>
            <p className="text-muted-foreground mb-4 max-w-sm">
              The autonomous AI workforce that operates like a real company. 
              25+ specialized agents building, marketing, and scaling businesses 24/7.
            </p>
            
            {/* Company Info */}
            <div className="text-sm text-muted-foreground mb-6 space-y-1">
              <p className="font-medium text-foreground">ShelVey, LLC</p>
              <p>131 Continental Dr Suite 305</p>
              <p>Newark, DE, 19713 US</p>
              <p className="mt-2">
                <a href="mailto:support@shelvey.pro" className="hover:text-primary transition-colors">
                  support@shelvey.pro
                </a>
              </p>
            </div>
            
            {/* Social links */}
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center hover:border-primary/50 hover:text-primary transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-cyber text-sm mb-4 text-foreground">PRODUCT</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-cyber text-sm mb-4 text-foreground">COMPANY</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-cyber text-sm mb-4 text-foreground">LEGAL</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ShelVey, LLC. All rights reserved.
          </p>
          
          {/* Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
              <motion.div
                className="w-2 h-2 rounded-full bg-green-500"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-xs font-mono text-green-500">All Systems Operational</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
