import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from './ThemeToggle';
import { Menu, X, LogIn, LogOut, LayoutDashboard, Crown, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from './NotificationBell';
import shelveyLogo from '@/assets/shelvey-logo.png';

const navLinks = [
  { name: 'Home', href: '/' },
  { name: 'Agents', href: '/agents' },
  { name: 'MCP', href: '/mcp' },
  { name: 'Pricing', href: '/pricing' },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isLoading, isSuperAdmin, signOut } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      {/* Glassmorphic background */}
      <div className="absolute inset-0 glass-morphism border-b border-border/50" />
      
      {/* Animated top border */}
      <motion.div 
        className="absolute top-0 left-0 right-0 h-[2px] bg-cyber-gradient"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />

      <div className="container mx-auto px-4 relative">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div 
              className="relative w-10 h-10 flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <img 
                src={shelveyLogo} 
                alt="ShelVey Logo" 
                className="w-10 h-10 object-contain drop-shadow-[0_0_10px_hsl(var(--primary)/0.5)]" 
              />
            </motion.div>
            
            <div className="flex flex-col">
              <span className="font-cyber text-lg font-bold tracking-wider text-foreground group-hover:text-primary transition-colors">
                SHEL<span className="text-primary">VEY</span>
              </span>
              <span className="text-[10px] font-mono text-muted-foreground tracking-widest">
                THE REAL WORKFORCE AI
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link, index) => (
              <Link
                key={link.name}
                to={link.href}
                className="relative px-4 py-2 group"
              >
                <motion.span
                  className="relative z-10 font-mono text-sm text-muted-foreground group-hover:text-primary transition-colors uppercase tracking-wider"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {link.name}
                </motion.span>
                
                {/* Hover effect */}
                <motion.div
                  className="absolute inset-0 rounded-md bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"
                  layoutId="navHover"
                />
                
                {/* Bottom line indicator */}
                <motion.div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-primary group-hover:w-full transition-all duration-300"
                />
              </Link>
            ))}
          </div>

          {/* Right section */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            
            {/* Notifications (only for logged in users) */}
            {user && <NotificationBell />}
            
            {/* Auth buttons */}
            {!isLoading && (
              user ? (
                <div className="flex items-center gap-2">
              {isSuperAdmin && (
                    <Link to="/super-admin">
                      <Button size="sm" variant="outline" className="gap-2 border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10">
                        <Crown className="w-4 h-4" />
                        <span className="hidden sm:inline">Admin</span>
                      </Button>
                    </Link>
                  )}
                  <Link to="/team-collaboration">
                    <Button size="sm" variant="outline" className="gap-2">
                      <Users className="w-4 h-4" />
                      <span className="hidden sm:inline">Team</span>
                    </Button>
                  </Link>
                  <Link to="/dashboard">
                    <Button size="sm" className="gap-2">
                      <LayoutDashboard className="w-4 h-4" />
                      <span className="hidden sm:inline">Dashboard</span>
                    </Button>
                  </Link>
                  <Button size="sm" variant="ghost" onClick={signOut} className="gap-2 text-muted-foreground hover:text-destructive">
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </Button>
                </div>
              ) : (
                <Link to="/auth">
                  <Button size="sm" variant="outline" className="gap-2">
                    <LogIn className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign In</span>
                  </Button>
                </Link>
              )
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden relative w-10 h-10 flex items-center justify-center rounded-lg bg-card border border-border hover:border-primary/50 transition-colors"
            >
              <AnimatePresence mode="wait">
                {isOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="w-5 h-5 text-foreground" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="w-5 h-5 text-foreground" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden"
          >
            <div className="glass-morphism border-t border-border/50 px-4 py-4 space-y-2">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    to={link.href}
                    onClick={() => setIsOpen(false)}
                    className="block px-4 py-3 rounded-lg bg-card/50 hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all font-mono text-sm uppercase tracking-wider text-muted-foreground hover:text-primary"
                  >
                    {link.name}
                  </Link>
                </motion.div>
              ))}
              
              {/* Mobile super admin link */}
              {isSuperAdmin && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: navLinks.length * 0.05 }}
                >
                  <Link
                    to="/super-admin"
                    onClick={() => setIsOpen(false)}
                    className="block px-4 py-3 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 transition-all font-mono text-sm uppercase tracking-wider text-yellow-500"
                  >
                    <Crown className="h-4 w-4 inline mr-2" />
                    Super Admin
                  </Link>
                </motion.div>
              )}

              {/* Mobile Team Collaboration link */}
              {user && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (navLinks.length + 0.5) * 0.05 }}
                >
                  <Link
                    to="/team-collaboration"
                    onClick={() => setIsOpen(false)}
                    className="block px-4 py-3 rounded-lg bg-card/50 hover:bg-primary/10 border border-border hover:border-primary/20 transition-all font-mono text-sm uppercase tracking-wider text-muted-foreground hover:text-primary"
                  >
                    <Users className="h-4 w-4 inline mr-2" />
                    Team Collaboration
                  </Link>
                </motion.div>
              )}
              
              {/* Mobile auth link */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (navLinks.length + 1) * 0.05 }}
              >
                {user ? (
                  <Link
                    to="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="block px-4 py-3 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all font-mono text-sm uppercase tracking-wider text-primary"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    to="/auth"
                    onClick={() => setIsOpen(false)}
                    className="block px-4 py-3 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all font-mono text-sm uppercase tracking-wider text-primary"
                  >
                    Sign In
                  </Link>
                )}
              </motion.div>
              
              {/* Mobile sign out */}
              {user && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (navLinks.length + 1.5) * 0.05 }}
                >
                  <button
                    onClick={() => {
                      signOut();
                      setIsOpen(false);
                    }}
                    className="w-full block px-4 py-3 rounded-lg bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 transition-all font-mono text-sm uppercase tracking-wider text-destructive text-left"
                  >
                    <LogOut className="h-4 w-4 inline mr-2" />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
