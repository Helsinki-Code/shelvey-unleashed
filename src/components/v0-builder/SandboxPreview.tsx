import { useEffect, useRef, useMemo } from 'react';
import type { ProjectFile } from './V0Builder';

interface SandboxPreviewProps {
  code: string;
  files: ProjectFile[];
}

export function SandboxPreview({ code, files }: SandboxPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Build the preview HTML with all files
  const previewHtml = useMemo(() => {
    // Get CSS files
    const cssFiles = files.filter(f => f.path.endsWith('.css'));
    const cssContent = cssFiles.map(f => f.content).join('\n');

    // Get App.tsx content or use provided code
    const appContent = code || files.find(f => f.path === 'src/App.tsx' || f.path === 'App.tsx')?.content || '';

    // Clean the code for browser execution
    const cleanedCode = appContent
      // Remove TypeScript-specific syntax more comprehensively
      .replace(/:\s*(React\.FC|FC|ReactNode|JSX\.Element|string|number|boolean|any|void|null|undefined|\{[^}]*\}|[A-Z][a-zA-Z]*(?:<[^>]*>)?)\s*(?=[,\)\=\{])/g, '')
      // Remove type annotations from function params
      .replace(/\(\s*(\w+)\s*:\s*\w+\s*\)/g, '($1)')
      // Remove import statements
      .replace(/^import\s+.*?from\s+['"][^'"]+['"];?\s*$/gm, '')
      // Remove export statements but keep the content
      .replace(/export\s+(default\s+)?/g, '')
      // Clean up interface/type definitions
      .replace(/interface\s+\w+\s*\{[^}]*\}/gs, '')
      .replace(/type\s+\w+\s*=\s*[^;]+;/g, '')
      // Remove generic type parameters from function declarations
      .replace(/<\s*T\s*(?:extends\s+[^>]+)?\s*>/g, '');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: {
              DEFAULT: 'hsl(262.1 83.3% 57.8%)',
              foreground: 'hsl(210 20% 98%)',
            },
            secondary: {
              DEFAULT: 'hsl(220 14.3% 95.9%)',
              foreground: 'hsl(220.9 39.3% 11%)',
            },
            muted: {
              DEFAULT: 'hsl(220 14.3% 95.9%)',
              foreground: 'hsl(220 8.9% 46.1%)',
            },
            accent: {
              DEFAULT: 'hsl(220 14.3% 95.9%)',
              foreground: 'hsl(220.9 39.3% 11%)',
            },
            destructive: {
              DEFAULT: 'hsl(0 84.2% 60.2%)',
              foreground: 'hsl(210 20% 98%)',
            },
          }
        }
      }
    }
  </script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: system-ui, -apple-system, sans-serif;
      background: white;
      min-height: 100vh;
    }
    /* Smooth scrolling */
    html { scroll-behavior: smooth; }
    /* Custom scrollbar */
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: #f1f1f1; }
    ::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #a1a1a1; }
    ${cssContent}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-type="module">
    // Mock lucide-react icons with proper SVG rendering
    const createIcon = (name) => {
      const iconPaths = {
        Menu: 'M3 12h18M3 6h18M3 18h18',
        X: 'M18 6L6 18M6 6l12 12',
        ChevronDown: 'M6 9l6 6 6-6',
        ChevronRight: 'M9 18l6-6-6-6',
        ChevronLeft: 'M15 18l-6-6 6-6',
        ChevronUp: 'M18 15l-6-6-6 6',
        ArrowRight: 'M5 12h14M12 5l7 7-7 7',
        ArrowLeft: 'M19 12H5M12 19l-7-7 7-7',
        Check: 'M20 6L9 17l-5-5',
        Star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
        Heart: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
        Mail: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6',
        Phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z',
        MapPin: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
        Sparkles: 'M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3zM5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1zM19 11l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5L17 13l1.5-.5.5-1.5z',
        Zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
        Shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
        Award: 'M12 15l-3 3v3l3-2 3 2v-3l-3-3zM8.21 13.89L7 23l5-3 5 3-1.21-9.12M12 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
        Target: 'M12 12m-10 0a10 10 0 1 0 20 0 10 10 0 1 0 -20 0M12 12m-6 0a6 6 0 1 0 12 0 6 6 0 1 0 -12 0M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0 -4 0',
        TrendingUp: 'M23 6l-9.5 9.5-5-5L1 18',
        Users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
        Globe: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
        Rocket: 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z',
      };
      
      return (props) => {
        const { size = 24, className = '', ...rest } = props || {};
        const path = iconPaths[name] || 'M12 12m-10 0a10 10 0 1 0 20 0 10 10 0 1 0 -20 0';
        return React.createElement('svg', {
          xmlns: 'http://www.w3.org/2000/svg',
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          className,
          ...rest
        }, React.createElement('path', { d: path }));
      };
    };
    
    const iconNames = ['Menu', 'X', 'ChevronDown', 'ChevronRight', 'ChevronLeft', 'ChevronUp', 
      'ArrowRight', 'ArrowLeft', 'Check', 'Star', 'Heart', 'Mail', 'Phone', 'MapPin',
      'Facebook', 'Twitter', 'Instagram', 'Linkedin', 'Github', 'Youtube',
      'Home', 'User', 'Settings', 'Search', 'Bell', 'Calendar', 'Clock',
      'Sun', 'Moon', 'Cloud', 'Zap', 'Award', 'Target', 'TrendingUp',
      'Shield', 'Lock', 'Key', 'Eye', 'EyeOff', 'Edit', 'Trash', 'Plus', 'Minus',
      'Download', 'Upload', 'Share', 'Copy', 'ExternalLink', 'Link',
      'Image', 'Video', 'Music', 'File', 'Folder', 'Database', 'Server',
      'Code', 'Terminal', 'Cpu', 'Wifi', 'Bluetooth', 'Battery',
      'ShoppingCart', 'CreditCard', 'DollarSign', 'Percent', 'Gift',
      'MessageCircle', 'MessageSquare', 'Send', 'Inbox', 'Archive',
      'Bookmark', 'Tag', 'Hash', 'AtSign', 'Globe', 'Map', 'Navigation',
      'Camera', 'Mic', 'Volume', 'VolumeX', 'Play', 'Pause', 'SkipForward', 'SkipBack',
      'RefreshCw', 'RotateCw', 'RotateCcw', 'Maximize', 'Minimize', 'Move',
      'Layers', 'Layout', 'Grid', 'List', 'Filter', 'Sliders',
      'BarChart', 'PieChart', 'Activity', 'Briefcase', 'Building',
      'Users', 'UserPlus', 'UserMinus', 'UserCheck', 'UserX',
      'Sparkles', 'Loader2', 'AlertCircle', 'Info', 'HelpCircle', 'AlertTriangle',
      'Rocket', 'Wand2', 'Bot', 'Brain', 'Lightbulb', 'Gem', 'Crown', 'Medal'];
    
    const lucideIcons = {};
    iconNames.forEach(name => { lucideIcons[name] = createIcon(name); });
    
    // Make icons available globally
    Object.assign(window, lucideIcons);
    
    // Mock framer-motion with basic animation support
    const motion = new Proxy({}, {
      get: (target, prop) => {
        return React.forwardRef((props, ref) => {
          const { 
            initial, animate, exit, whileHover, whileTap, 
            transition, variants, whileInView,
            ...rest 
          } = props;
          return React.createElement(prop, { ref, ...rest });
        });
      }
    });
    
    const AnimatePresence = ({ children }) => children;
    const useInView = () => [null, true];
    const useScroll = () => ({ scrollY: { get: () => 0 }, scrollYProgress: { get: () => 0 } });
    const useTransform = () => 0;
    const useSpring = () => 0;
    const useMotionValue = (v) => ({ get: () => v, set: () => {} });
    const useAnimation = () => ({ start: () => {}, set: () => {} });

    // Mock cn utility
    const cn = (...classes) => classes.filter(Boolean).join(' ');

    // Mock common UI components
    const Button = React.forwardRef(({ children, className = '', variant = 'default', size = 'default', ...props }, ref) => {
      const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50';
      const variants = {
        default: 'bg-purple-600 text-white hover:bg-purple-700',
        outline: 'border border-gray-300 bg-transparent hover:bg-gray-100',
        ghost: 'hover:bg-gray-100',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
      };
      const sizes = {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
        icon: 'h-10 w-10',
      };
      return React.createElement('button', { 
        ref, 
        className: cn(baseStyles, variants[variant], sizes[size], className),
        ...props 
      }, children);
    });

    const Card = React.forwardRef(({ children, className = '', ...props }, ref) => 
      React.createElement('div', { 
        ref, 
        className: cn('rounded-lg border bg-white shadow-sm', className),
        ...props 
      }, children)
    );

    const CardHeader = React.forwardRef(({ children, className = '', ...props }, ref) => 
      React.createElement('div', { ref, className: cn('flex flex-col space-y-1.5 p-6', className), ...props }, children)
    );

    const CardTitle = React.forwardRef(({ children, className = '', ...props }, ref) => 
      React.createElement('h3', { ref, className: cn('text-2xl font-semibold leading-none tracking-tight', className), ...props }, children)
    );

    const CardDescription = React.forwardRef(({ children, className = '', ...props }, ref) => 
      React.createElement('p', { ref, className: cn('text-sm text-gray-500', className), ...props }, children)
    );

    const CardContent = React.forwardRef(({ children, className = '', ...props }, ref) => 
      React.createElement('div', { ref, className: cn('p-6 pt-0', className), ...props }, children)
    );

    const CardFooter = React.forwardRef(({ children, className = '', ...props }, ref) => 
      React.createElement('div', { ref, className: cn('flex items-center p-6 pt-0', className), ...props }, children)
    );

    const Badge = React.forwardRef(({ children, className = '', variant = 'default', ...props }, ref) => {
      const variants = {
        default: 'bg-purple-600 text-white',
        secondary: 'bg-gray-100 text-gray-900',
        outline: 'border border-gray-300',
      };
      return React.createElement('div', { 
        ref, 
        className: cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', variants[variant], className),
        ...props 
      }, children);
    });

    const Input = React.forwardRef(({ className = '', type = 'text', ...props }, ref) => 
      React.createElement('input', { 
        ref, 
        type,
        className: cn('flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600', className),
        ...props 
      })
    );

    // Component code
    ${cleanedCode}

    // Find the main component - try multiple patterns
    const componentPatterns = [
      /(?:function|const)\s+(App)\s*[=(]/,
      /(?:function|const)\s+([A-Z][a-zA-Z]*)\s*[=(]/,
    ];
    
    let MainComponent = null;
    for (const pattern of componentPatterns) {
      const match = \`${cleanedCode.replace(/`/g, '\\`')}\`.match(pattern);
      if (match) {
        try {
          MainComponent = eval(match[1]);
          if (typeof MainComponent === 'function') break;
        } catch (e) {
          console.log('Could not find component:', match[1]);
        }
      }
    }
    
    if (!MainComponent) {
      MainComponent = () => React.createElement('div', { 
        className: 'flex items-center justify-center h-screen text-gray-500' 
      }, 'Start generating to see preview');
    }

    // Render with error boundary
    try {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(MainComponent));
    } catch (err) {
      console.error('Render error:', err);
      document.getElementById('root').innerHTML = '<div class="flex items-center justify-center h-screen text-red-500">Error rendering component</div>';
    }
  </script>
</body>
</html>`;
  }, [code, files]);

  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(previewHtml);
        doc.close();
      }
    }
  }, [previewHtml]);

  return (
    <iframe
      ref={iframeRef}
      className="w-full h-full border-0 bg-white"
      sandbox="allow-scripts allow-same-origin"
      title="Website Preview"
    />
  );
}
