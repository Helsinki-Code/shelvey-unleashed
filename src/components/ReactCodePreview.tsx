import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, Code, Copy, Check, Monitor, Tablet, Smartphone, 
  RefreshCw, Maximize2, ExternalLink 
} from "lucide-react";
import { toast } from "sonner";

interface ReactCodePreviewProps {
  code: string;
  componentName?: string;
  css?: string;
  dependencies?: string[];
}

type ViewportSize = 'desktop' | 'tablet' | 'mobile';

const viewportSizes: Record<ViewportSize, { width: string; icon: React.ReactNode }> = {
  desktop: { width: '100%', icon: <Monitor className="h-4 w-4" /> },
  tablet: { width: '768px', icon: <Tablet className="h-4 w-4" /> },
  mobile: { width: '375px', icon: <Smartphone className="h-4 w-4" /> },
};

export const ReactCodePreview = ({ 
  code, 
  componentName = 'GeneratedComponent',
  css = '',
  dependencies = []
}: ReactCodePreviewProps) => {
  const [activeTab, setActiveTab] = useState("preview");
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [copied, setCopied] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract lucide-react icon names from imports
  const extractLucideIcons = (codeStr: string): string[] => {
    const iconNames: string[] = [];
    // Match import { Icon1, Icon2, ... } from 'lucide-react' (single or multi-line)
    const lucideImportRegex = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/gs;
    let match;
    while ((match = lucideImportRegex.exec(codeStr)) !== null) {
      const iconsPart = match[1];
      // Split by comma, handle newlines
      const icons = iconsPart.split(',').map(s => s.trim()).filter(Boolean);
      iconNames.push(...icons);
    }
    return [...new Set(iconNames)]; // Dedupe
  };

  // Auto-detect the exported component name from code
  const detectComponentName = (codeStr: string): string => {
    // Try: export default function ComponentName
    const exportDefaultMatch = codeStr.match(/export\s+default\s+function\s+(\w+)/);
    if (exportDefaultMatch) return exportDefaultMatch[1];
    
    // Try: export default ComponentName (at end)
    const exportDefaultVarMatch = codeStr.match(/export\s+default\s+(\w+)\s*;?\s*$/m);
    if (exportDefaultVarMatch) return exportDefaultVarMatch[1];
    
    // Try: function ComponentName() { ... } (first function)
    const functionMatch = codeStr.match(/function\s+([A-Z]\w+)\s*\(/);
    if (functionMatch) return functionMatch[1];
    
    // Try: const ComponentName = ... (arrow function component)
    const constMatch = codeStr.match(/const\s+([A-Z]\w+)\s*=\s*(?:\([^)]*\)|[^=])\s*=>/);
    if (constMatch) return constMatch[1];
    
    return 'GeneratedComponent';
  };

  // Generate the iframe HTML that includes React runtime
  const previewHtml = useMemo(() => {
    // Extract lucide icons used in code
    const lucideIcons = extractLucideIcons(code);
    
    // Detect component name if not provided or is default
    const detectedName = detectComponentName(code);
    const actualComponentName = componentName === 'GeneratedComponent' ? detectedName : componentName;
    
    // Build dynamic lucide icon mocks
    const iconMocks = lucideIcons.map(iconName => 
      `const ${iconName} = (props) => <Icon name="${iconName}" {...props} />;`
    ).join('\n    ');
    
    // Clean up the code for execution - ROBUST multi-line import removal
    let cleanedCode = code;
    
    // Remove all import statements (multi-line and single-line)
    // This regex handles: import X from 'y', import { A, B } from 'y', import 'y'
    cleanedCode = cleanedCode.replace(/^\s*import\s+[\s\S]*?from\s*['"][^'"]*['"];?\s*$/gm, '');
    cleanedCode = cleanedCode.replace(/^\s*import\s*['"][^'"]*['"];?\s*$/gm, ''); // side-effect imports
    
    // Also handle multi-line imports that span multiple lines
    cleanedCode = cleanedCode.replace(/import\s*\{[^}]*\}\s*from\s*['"][^'"]*['"];?/gs, '');
    cleanedCode = cleanedCode.replace(/import\s+\w+\s*,?\s*\{[^}]*\}\s*from\s*['"][^'"]*['"];?/gs, '');
    cleanedCode = cleanedCode.replace(/import\s+\*\s+as\s+\w+\s+from\s*['"][^'"]*['"];?/gs, '');
    cleanedCode = cleanedCode.replace(/import\s+\w+\s+from\s*['"][^'"]*['"];?/gs, '');
    
    // Remove 'use client' directive
    cleanedCode = cleanedCode.replace(/['"]use client['"];?\s*/g, '');
    
    // Remove export statements but keep the content
    cleanedCode = cleanedCode.replace(/export\s+default\s+/g, '');
    cleanedCode = cleanedCode.replace(/export\s+/g, '');
    
    // FIX: Remove TypeScript type annotations that break Babel
    // Remove : type annotations from function parameters and variables
    cleanedCode = cleanedCode.replace(/:\s*number(\s*[,\)\}=])/g, '$1');
    cleanedCode = cleanedCode.replace(/:\s*string(\s*[,\)\}=])/g, '$1');
    cleanedCode = cleanedCode.replace(/:\s*boolean(\s*[,\)\}=])/g, '$1');
    cleanedCode = cleanedCode.replace(/:\s*any(\s*[,\)\}=])/g, '$1');
    cleanedCode = cleanedCode.replace(/:\s*void(\s*[,\)\}=])/g, '$1');
    cleanedCode = cleanedCode.replace(/:\s*React\.\w+(\s*[,\)\}=])/g, '$1');
    cleanedCode = cleanedCode.replace(/:\s*\w+\[\](\s*[,\)\}=])/g, '$1');
    
    // FIX: Escape problematic inline SVG data URLs in className attributes
    // Replace data:image/svg+xml URLs that contain quotes which break JSX parsing
    cleanedCode = cleanedCode.replace(/bg-\[url\(['"]data:image\/svg\+xml[^'"\]]*['"\]]\]/g, (match) => {
      // Replace the problematic pattern with a simpler background
      return 'bg-gradient-to-br from-background/5 to-transparent';
    });
    
    // Also handle url(...) patterns with embedded SVG that have quote issues
    cleanedCode = cleanedCode.replace(/url\(['"]?data:image\/svg\+xml[^)]*\)/g, "url('data:image/svg+xml,<svg></svg>')");
    
    cleanedCode = cleanedCode.trim();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Clash+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Inter', sans-serif;
      min-height: 100vh;
    }
    #root { min-height: 100vh; }
    ${css}
  </style>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            'clash': ['Clash Display', 'sans-serif'],
          },
          colors: {
            primary: { DEFAULT: '#0EA5E9', foreground: '#ffffff' },
            secondary: { DEFAULT: '#0284C7', foreground: '#ffffff' },
            muted: { DEFAULT: '#f1f5f9', foreground: '#64748b' },
            accent: { DEFAULT: '#7DD3FC', foreground: '#1A1A2E' },
            background: '#FFFFFF',
            foreground: '#1A1A2E',
            card: { DEFAULT: '#ffffff', foreground: '#1A1A2E' },
            border: '#e2e8f0',
          }
        }
      }
    }
  </script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="env,react,typescript">
    const { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } = React;
    
    // Mock lucide-react icons - generic icon component
    const Icon = ({ name, className = "", size = 24, ...props }) => (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="12" cy="12" r="10" />
        <text x="12" y="16" textAnchor="middle" fontSize="8" fill="currentColor" stroke="none">{name?.charAt(0) || '?'}</text>
      </svg>
    );
    
    // Dynamic icon mocks from detected imports
    ${iconMocks}
    
    // Fallback common icons (in case extraction missed some)
    const fallbackIcons = ['ArrowRight', 'Check', 'Star', 'Sparkles', 'Zap', 'Users', 'Globe', 'Shield', 'Rocket', 'Heart', 'Menu', 'X', 'ChevronRight', 'ChevronLeft', 'ChevronDown', 'ChevronUp', 'Play', 'Pause', 'Search', 'Settings', 'Home', 'Mail', 'Phone', 'MapPin', 'Calendar', 'Clock', 'Eye', 'EyeOff', 'Lock', 'Unlock', 'Edit', 'Trash', 'Plus', 'Minus', 'Download', 'Upload', 'Share', 'Copy', 'ExternalLink', 'Link', 'Image', 'Video', 'Music', 'File', 'Folder', 'Database', 'Server', 'Cloud', 'Wifi', 'Bluetooth', 'Battery', 'Power', 'Sun', 'Moon', 'Award', 'Trophy', 'Target', 'Flag', 'Bookmark', 'Tag', 'Hash', 'AtSign', 'Send', 'MessageCircle', 'MessageSquare', 'Bell', 'BellOff', 'Volume', 'VolumeX', 'Mic', 'MicOff', 'Camera', 'CameraOff', 'Monitor', 'Laptop', 'Tablet', 'Smartphone', 'Watch', 'Tv', 'Speaker', 'Headphones', 'Radio', 'Cpu', 'HardDrive', 'Save', 'RefreshCw', 'RotateCw', 'RotateCcw', 'Repeat', 'Shuffle', 'Maximize', 'Minimize', 'Move', 'Grip', 'MoreHorizontal', 'MoreVertical', 'Info', 'AlertCircle', 'AlertTriangle', 'HelpCircle', 'CheckCircle', 'XCircle', 'Loader', 'Quote', 'Code', 'Terminal', 'GitBranch', 'GitCommit', 'GitMerge', 'GitPullRequest', 'Github', 'Linkedin', 'Twitter', 'Facebook', 'Instagram', 'Youtube', 'TrendingUp', 'TrendingDown', 'BarChart', 'PieChart', 'Activity', 'Layers', 'Layout', 'Grid', 'List', 'Filter', 'SortAsc', 'SortDesc', 'Sliders', 'Tool', 'Wrench', 'Hammer', 'Scissors', 'Crop', 'Brush', 'Palette', 'Droplet', 'Feather', 'Pen', 'Pencil', 'Eraser', 'Type', 'Bold', 'Italic', 'Underline', 'AlignLeft', 'AlignCenter', 'AlignRight', 'AlignJustify', 'Indent', 'Outdent', 'Brain', 'Lightbulb', 'Flame', 'Snowflake', 'Umbrella', 'ThumbsUp', 'ThumbsDown', 'Building', 'BookOpen', 'GraduationCap'];
    fallbackIcons.forEach(name => {
      if (typeof window[name] === 'undefined') {
        window[name] = (props) => <Icon name={name} {...props} />;
      }
    });
    
    // Mock framer-motion with Proxy for any motion.X element
    const createMotionComponent = (tag) => {
      return ({ children, initial, animate, exit, transition, whileHover, whileTap, whileInView, variants, className, style, ...props }) => {
        return React.createElement(tag, { className, style, ...props }, children);
      };
    };
    
    const motion = new Proxy({}, {
      get: (target, prop) => {
        if (typeof prop === 'string') {
          return createMotionComponent(prop);
        }
        return undefined;
      }
    });
    
    // Mock framer-motion hooks and components
    const AnimatePresence = ({ children }) => <>{children}</>;
    const useInView = (ref, options) => true; // Always "in view" for preview
    const useAnimation = () => ({ start: () => {}, stop: () => {} });
    const useMotionValue = (initial) => ({ get: () => initial, set: () => {} });
    const useTransform = () => 0;
    const useSpring = (value) => value;
    const useScroll = () => ({ scrollY: { get: () => 0 }, scrollYProgress: { get: () => 0 } });
    
    // Mock Button component
    const Button = ({ children, className = "", variant = "default", size = "default", asChild, ...props }) => {
      const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";
      const variantClasses = {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        link: "text-primary underline-offset-4 hover:underline",
      };
      const sizeClasses = {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      };
      return (
        <button 
          className={\`\${baseClasses} \${variantClasses[variant] || variantClasses.default} \${sizeClasses[size] || sizeClasses.default} \${className}\`}
          {...props}
        >
          {children}
        </button>
      );
    };
    
    // Mock Card components
    const Card = ({ children, className = "", ...props }) => (
      <div className={\`rounded-lg border border-border bg-card text-card-foreground shadow-sm \${className}\`} {...props}>{children}</div>
    );
    const CardHeader = ({ children, className = "", ...props }) => (
      <div className={\`flex flex-col space-y-1.5 p-6 \${className}\`} {...props}>{children}</div>
    );
    const CardTitle = ({ children, className = "", ...props }) => (
      <h3 className={\`text-2xl font-semibold leading-none tracking-tight \${className}\`} {...props}>{children}</h3>
    );
    const CardDescription = ({ children, className = "", ...props }) => (
      <p className={\`text-sm text-muted-foreground \${className}\`} {...props}>{children}</p>
    );
    const CardContent = ({ children, className = "", ...props }) => (
      <div className={\`p-6 pt-0 \${className}\`} {...props}>{children}</div>
    );
    const CardFooter = ({ children, className = "", ...props }) => (
      <div className={\`flex items-center p-6 pt-0 \${className}\`} {...props}>{children}</div>
    );
    
    // Mock Badge component
    const Badge = ({ children, className = "", variant = "default", ...props }) => {
      const variantClasses = {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border border-border text-foreground",
        destructive: "bg-red-500 text-white",
      };
      return (
        <span className={\`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors \${variantClasses[variant] || variantClasses.default} \${className}\`} {...props}>
          {children}
        </span>
      );
    };
    
    // Mock Input component
    const Input = ({ className = "", type = "text", ...props }) => (
      <input 
        type={type}
        className={\`flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 \${className}\`}
        {...props}
      />
    );
    
    // Mock Textarea component
    const Textarea = ({ className = "", ...props }) => (
      <textarea 
        className={\`flex min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 \${className}\`}
        {...props}
      />
    );
    
    // Mock Tabs components
    const Tabs = ({ children, defaultValue, value, onValueChange, className = "", ...props }) => {
      const [activeTab, setActiveTab] = useState(value || defaultValue);
      return (
        <div className={className} {...props} data-active-tab={activeTab}>
          {React.Children.map(children, child => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child, { activeTab, setActiveTab: onValueChange || setActiveTab });
            }
            return child;
          })}
        </div>
      );
    };
    const TabsList = ({ children, className = "", ...props }) => (
      <div className={\`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground \${className}\`} {...props}>{children}</div>
    );
    const TabsTrigger = ({ children, value, activeTab, setActiveTab, className = "", ...props }) => (
      <button 
        className={\`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 \${activeTab === value ? 'bg-background text-foreground shadow-sm' : ''} \${className}\`}
        onClick={() => setActiveTab?.(value)}
        {...props}
      >
        {children}
      </button>
    );
    const TabsContent = ({ children, value, activeTab, className = "", ...props }) => (
      activeTab === value ? <div className={className} {...props}>{children}</div> : null
    );
    
    // Mock Avatar components
    const Avatar = ({ children, className = "", ...props }) => (
      <span className={\`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full \${className}\`} {...props}>{children}</span>
    );
    const AvatarImage = ({ src, alt, className = "", ...props }) => (
      <img src={src} alt={alt} className={\`aspect-square h-full w-full \${className}\`} {...props} />
    );
    const AvatarFallback = ({ children, className = "", ...props }) => (
      <span className={\`flex h-full w-full items-center justify-center rounded-full bg-muted \${className}\`} {...props}>{children}</span>
    );
    
    // Mock Separator component
    const Separator = ({ orientation = "horizontal", className = "", ...props }) => (
      <div 
        className={\`shrink-0 bg-border \${orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]"} \${className}\`} 
        {...props} 
      />
    );
    
    // Mock ScrollArea component
    const ScrollArea = ({ children, className = "", ...props }) => (
      <div className={\`relative overflow-auto \${className}\`} {...props}>{children}</div>
    );

    try {
      ${cleanedCode}
      
      // Try to find and render the component with detected name
      const componentCandidates = ['${actualComponentName}', '${detectedName}', 'App', 'LandingPage', 'HomePage', 'HeroSection', 'Component', 'Page', 'Main'];
      let ComponentToRender = null;
      
      for (const name of componentCandidates) {
        try {
          const candidate = eval(name);
          if (typeof candidate === 'function') {
            ComponentToRender = candidate;
            break;
          }
        } catch (e) {
          // Continue to next candidate
        }
      }
      
      if (ComponentToRender) {
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<ComponentToRender />);
      } else {
        document.getElementById('root').innerHTML = '<div style="padding: 20px; color: #ef4444;">Component not found. Make sure your component is exported or named correctly.</div>';
      }
    } catch (error) {
      document.getElementById('root').innerHTML = '<div style="padding: 20px; color: #ef4444;"><strong>Error rendering component:</strong><br/><pre style="margin-top: 10px; white-space: pre-wrap;">' + error.message + '</pre></div>';
      console.error('Preview Error:', error);
    }
  </script>
</body>
</html>`;
  }, [code, css, componentName, refreshKey]);

  const openInNewTab = () => {
    const blob = new Blob([previewHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList className="grid w-fit grid-cols-2">
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="code" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Code
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            {activeTab === 'preview' && (
              <>
                <div className="flex items-center gap-1 bg-muted/50 rounded-md p-1">
                  {(Object.keys(viewportSizes) as ViewportSize[]).map((size) => (
                    <Button
                      key={size}
                      variant={viewport === size ? "secondary" : "ghost"}
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setViewport(size)}
                    >
                      {viewportSizes[size].icon}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setRefreshKey(k => k + 1)}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={openInNewTab}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </>
            )}
            {activeTab === 'code' && (
              <Button
                variant="outline"
                size="sm"
                onClick={copyCode}
                className="gap-2"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="preview" className="mt-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border rounded-lg overflow-hidden bg-background"
          >
            <div 
              className="mx-auto transition-all duration-300 bg-background"
              style={{ width: viewportSizes[viewport].width, maxWidth: '100%' }}
            >
              <iframe
                key={refreshKey}
                srcDoc={previewHtml}
                className="w-full h-[600px] border-0"
                title="React Component Preview"
                sandbox="allow-scripts"
              />
            </div>
          </motion.div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              React 18 + Tailwind CSS
            </Badge>
            {dependencies.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {dependencies.length} dependencies
              </Badge>
            )}
          </div>
        </TabsContent>

        <TabsContent value="code" className="mt-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
          >
            <div className="bg-muted/30 rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
                <span className="text-sm font-medium text-muted-foreground">
                  {componentName}.tsx
                </span>
                <Badge variant="outline" className="text-xs">
                  TypeScript + React
                </Badge>
              </div>
              <div className="overflow-auto max-h-[500px] p-4">
                <pre className="text-sm">
                  <code className="text-foreground whitespace-pre-wrap break-words">
                    {code}
                  </code>
                </pre>
              </div>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
