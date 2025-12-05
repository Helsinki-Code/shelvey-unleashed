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

  // Generate the iframe HTML that includes React runtime
  const previewHtml = useMemo(() => {
    // Extract just the component function body if it's a full component
    let componentCode = code;
    
    // Clean up the code for execution
    // Remove import statements as we'll provide them via CDN
    const cleanedCode = componentCode
      .replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '')
      .replace(/^export\s+(default\s+)?/gm, '')
      .trim();

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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Inter', sans-serif;
      background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #0f0f23 100%);
      min-height: 100vh;
    }
    #root { min-height: 100vh; }
    ${css}
  </style>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: { DEFAULT: '#10b981', foreground: '#ffffff' },
            secondary: { DEFAULT: '#6366f1', foreground: '#ffffff' },
            muted: { DEFAULT: '#27272a', foreground: '#a1a1aa' },
            accent: { DEFAULT: '#22c55e', foreground: '#ffffff' },
            background: '#0a0a0a',
            foreground: '#fafafa',
            card: { DEFAULT: '#18181b', foreground: '#fafafa' },
            border: '#27272a',
          }
        }
      }
    }
  </script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef, useMemo, useCallback } = React;
    
    // Mock lucide-react icons
    const Icon = ({ name, className = "", size = 24 }) => (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
      </svg>
    );
    
    // Mock common icons
    const ArrowRight = (props) => <Icon name="arrow-right" {...props} />;
    const Check = (props) => <Icon name="check" {...props} />;
    const Star = (props) => <Icon name="star" {...props} />;
    const Sparkles = (props) => <Icon name="sparkles" {...props} />;
    const Zap = (props) => <Icon name="zap" {...props} />;
    const Users = (props) => <Icon name="users" {...props} />;
    const Globe = (props) => <Icon name="globe" {...props} />;
    const Shield = (props) => <Icon name="shield" {...props} />;
    const Rocket = (props) => <Icon name="rocket" {...props} />;
    const Heart = (props) => <Icon name="heart" {...props} />;
    const Menu = (props) => <Icon name="menu" {...props} />;
    const X = (props) => <Icon name="x" {...props} />;
    
    // Mock framer-motion
    const motion = {
      div: ({ children, initial, animate, transition, whileHover, whileTap, className, ...props }) => (
        <div className={className} {...props}>{children}</div>
      ),
      section: ({ children, className, ...props }) => (
        <section className={className} {...props}>{children}</section>
      ),
      button: ({ children, className, ...props }) => (
        <button className={className} {...props}>{children}</button>
      ),
      span: ({ children, className, ...props }) => (
        <span className={className} {...props}>{children}</span>
      ),
      h1: ({ children, className, ...props }) => (
        <h1 className={className} {...props}>{children}</h1>
      ),
      h2: ({ children, className, ...props }) => (
        <h2 className={className} {...props}>{children}</h2>
      ),
      p: ({ children, className, ...props }) => (
        <p className={className} {...props}>{children}</p>
      ),
    };
    
    // Mock Button component
    const Button = ({ children, className = "", variant = "default", size = "default", ...props }) => {
      const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";
      const variantClasses = {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
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
    
    // Mock Badge component
    const Badge = ({ children, className = "", variant = "default", ...props }) => {
      const variantClasses = {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border border-border text-foreground",
      };
      return (
        <span className={\`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors \${variantClasses[variant] || variantClasses.default} \${className}\`} {...props}>
          {children}
        </span>
      );
    };

    try {
      ${cleanedCode}
      
      // Try to find and render the component
      const ComponentToRender = typeof ${componentName} !== 'undefined' ? ${componentName} : 
                                typeof App !== 'undefined' ? App :
                                typeof LandingPage !== 'undefined' ? LandingPage :
                                typeof HeroSection !== 'undefined' ? HeroSection :
                                typeof Component !== 'undefined' ? Component :
                                null;
      
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
