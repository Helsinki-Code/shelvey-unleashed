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

    // Get component files for potential imports
    const componentFiles = files.filter(f => 
      f.path.endsWith('.tsx') && f.path !== 'src/App.tsx' && f.path !== 'src/main.tsx'
    );

    // Create component registry from files
    const componentRegistry = componentFiles.map(f => {
      const name = f.path.split('/').pop()?.replace('.tsx', '') || '';
      return { name, content: f.content };
    });

    // Get App.tsx content or use provided code
    const appContent = code || files.find(f => f.path === 'src/App.tsx')?.content || '';

    // Clean the code for browser execution
    const cleanedCode = appContent
      // Remove TypeScript-specific syntax
      .replace(/: *(React\.FC|FC|ReactNode|string|number|boolean|any|\{[^}]*\}|[A-Z][a-zA-Z]*(?:<[^>]*>)?)/g, '')
      // Remove import statements
      .replace(/^import\s+.*?from\s+['"][^'"]+['"];?\s*$/gm, '')
      // Remove export statements but keep the content
      .replace(/export\s+(default\s+)?/g, '')
      // Clean up interface/type definitions
      .replace(/interface\s+\w+\s*\{[^}]*\}/g, '')
      .replace(/type\s+\w+\s*=\s*[^;]+;/g, '');

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
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: system-ui, -apple-system, sans-serif;
      background: white;
      min-height: 100vh;
    }
    ${cssContent}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-type="module">
    // Mock lucide-react icons
    const createIcon = (name) => (props) => 
      React.createElement('span', { 
        className: 'inline-flex items-center justify-center',
        style: { width: props?.size || 24, height: props?.size || 24 },
        ...props 
      }, '○');
    
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
      'Sparkles', 'Loader2', 'AlertCircle', 'Info', 'HelpCircle', 'AlertTriangle'];
    
    const lucideIcons = {};
    iconNames.forEach(name => { lucideIcons[name] = createIcon(name); });
    
    // Mock framer-motion
    const motion = new Proxy({}, {
      get: (target, prop) => {
        return React.forwardRef((props, ref) => {
          const { initial, animate, exit, whileHover, whileTap, transition, variants, ...rest } = props;
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

    // Component code
    ${cleanedCode}

    // Find the main component
    const componentMatch = \`${cleanedCode}\`.match(/(?:function|const)\s+(\w+)/);
    const MainComponent = componentMatch ? eval(componentMatch[1]) : () => React.createElement('div', null, 'No component found');

    // Render
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(MainComponent));
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
