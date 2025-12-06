import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const THEME_KEY = 'shelvey-theme';

export const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first, default to dark
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_KEY);
      return saved ? saved === 'dark' : true;
    }
    return true;
  });

  useEffect(() => {
    // Apply theme on mount and save preference
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="relative w-20 h-10 rounded-full p-1 transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-primary/50 overflow-hidden group"
      style={{
        background: isDark 
          ? 'linear-gradient(135deg, hsl(160 40% 8%) 0%, hsl(160 35% 15%) 100%)'
          : 'linear-gradient(135deg, hsl(150 60% 85%) 0%, hsl(158 70% 75%) 100%)',
      }}
      aria-label="Toggle theme"
    >
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {isDark ? (
          // Stars for dark mode
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={`star-${i}`}
                className="absolute w-1 h-1 rounded-full bg-cyber-cyan/60"
                style={{
                  top: `${20 + Math.random() * 60}%`,
                  left: `${10 + Math.random() * 80}%`,
                }}
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: 1.5 + Math.random(),
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </>
        ) : (
          // Floating leaves for light mode
          <>
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={`leaf-${i}`}
                className="absolute text-[8px] opacity-40"
                style={{
                  top: `${30 + i * 20}%`,
                  left: `${20 + i * 25}%`,
                }}
                animate={{
                  y: [-2, 2, -2],
                  x: [-1, 1, -1],
                  rotate: [-10, 10, -10],
                }}
                transition={{
                  duration: 3 + i,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                🌿
              </motion.div>
            ))}
          </>
        )}
      </div>

      {/* Toggle circle with morphing icon */}
      <motion.div
        className="relative w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
        animate={{
          x: isDark ? 40 : 0,
          background: isDark 
            ? 'linear-gradient(135deg, hsl(180 100% 40%) 0%, hsl(158 100% 45%) 100%)'
            : 'linear-gradient(135deg, hsl(45 100% 60%) 0%, hsl(35 100% 55%) 100%)',
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            boxShadow: isDark
              ? '0 0 20px hsl(180 100% 50% / 0.5), 0 0 40px hsl(158 100% 45% / 0.3)'
              : '0 0 20px hsl(45 100% 60% / 0.5), 0 0 40px hsl(35 100% 55% / 0.3)',
          }}
          transition={{ duration: 0.5 }}
        />

        <AnimatePresence mode="wait">
          {isDark ? (
            <motion.div
              key="moon"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              {/* Cyberpunk moon with circuit pattern */}
              <svg width="20" height="20" viewBox="0 0 20 20" className="drop-shadow-lg">
                <defs>
                  <linearGradient id="moonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(160 40% 4%)" />
                    <stop offset="100%" stopColor="hsl(160 35% 12%)" />
                  </linearGradient>
                </defs>
                <circle cx="10" cy="10" r="8" fill="url(#moonGrad)" stroke="hsl(180 100% 50%)" strokeWidth="0.5" />
                {/* Circuit lines */}
                <path d="M6 10 L8 10 L9 8 L11 12 L12 10 L14 10" stroke="hsl(180 100% 50%)" strokeWidth="0.5" fill="none" opacity="0.6" />
                <circle cx="6" cy="7" r="1" fill="hsl(158 100% 50%)" opacity="0.8" />
                <circle cx="13" cy="13" r="0.8" fill="hsl(270 80% 60%)" opacity="0.8" />
              </svg>
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ scale: 0, rotate: 180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: -180 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              {/* Organic sun with leaf elements */}
              <svg width="20" height="20" viewBox="0 0 20 20" className="drop-shadow-lg">
                <defs>
                  <linearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(45 100% 70%)" />
                    <stop offset="100%" stopColor="hsl(35 100% 55%)" />
                  </linearGradient>
                </defs>
                <circle cx="10" cy="10" r="5" fill="url(#sunGrad)" />
                {/* Rays as stylized leaves */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                  <motion.ellipse
                    key={angle}
                    cx="10"
                    cy="3"
                    rx="1.5"
                    ry="2"
                    fill="hsl(158 84% 28%)"
                    opacity="0.7"
                    transform={`rotate(${angle} 10 10)`}
                    animate={{ opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                  />
                ))}
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Glowing border on hover */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        style={{
          boxShadow: isDark
            ? 'inset 0 0 10px hsl(180 100% 50% / 0.2), 0 0 20px hsl(180 100% 50% / 0.1)'
            : 'inset 0 0 10px hsl(158 84% 28% / 0.2), 0 0 20px hsl(158 84% 28% / 0.1)',
        }}
      />
    </button>
  );
};
