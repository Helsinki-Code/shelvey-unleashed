'use client';

import { createContext, useContext, useState, type ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  RefreshCw,
  Maximize2,
  Minimize2,
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
  Loader2,
} from 'lucide-react';

export type WebPreviewContextValue = {
  url: string;
  setUrl: (url: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  viewport: 'desktop' | 'tablet' | 'mobile';
  setViewport: (viewport: 'desktop' | 'tablet' | 'mobile') => void;
  consoleOpen: boolean;
  setConsoleOpen: (open: boolean) => void;
};

const WebPreviewContext = createContext<WebPreviewContextValue | null>(null);

const useWebPreview = () => {
  const context = useContext(WebPreviewContext);
  if (!context) {
    throw new Error('WebPreview components must be used within a WebPreview');
  }
  return context;
};

export type WebPreviewProps = ComponentProps<'div'> & {
  defaultUrl?: string;
  onUrlChange?: (url: string) => void;
};

export const WebPreview = ({
  className,
  children,
  defaultUrl = '',
  onUrlChange,
  ...props
}: WebPreviewProps) => {
  const [url, setUrl] = useState(defaultUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [consoleOpen, setConsoleOpen] = useState(false);

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    onUrlChange?.(newUrl);
  };

  const contextValue: WebPreviewContextValue = {
    url,
    setUrl: handleUrlChange,
    isLoading,
    setIsLoading,
    viewport,
    setViewport,
    consoleOpen,
    setConsoleOpen,
  };

  return (
    <WebPreviewContext.Provider value={contextValue}>
      <div
        className={cn('flex size-full flex-col bg-gray-950', className)}
        {...props}
      >
        {children}
      </div>
    </WebPreviewContext.Provider>
  );
};

export type WebPreviewNavigationProps = ComponentProps<'div'>;

export const WebPreviewNavigation = ({
  className,
  children,
  ...props
}: WebPreviewNavigationProps) => (
  <div
    className={cn('flex items-center gap-1 border-b border-gray-800 p-2 h-12 bg-gray-900/50', className)}
    {...props}
  >
    {children}
  </div>
);

export type WebPreviewNavigationButtonProps = ComponentProps<typeof Button> & {
  tooltip?: string;
  active?: boolean;
};

export const WebPreviewNavigationButton = ({
  onClick,
  disabled,
  tooltip,
  active,
  children,
  className,
  ...props
}: WebPreviewNavigationButtonProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className={cn(
            'h-8 w-8 p-0 hover:bg-gray-800',
            active && 'bg-gray-700 text-white',
            className
          )}
          disabled={disabled}
          onClick={onClick}
          size="sm"
          variant="ghost"
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export type WebPreviewViewportProps = ComponentProps<'div'>;

export const WebPreviewViewport = ({
  className,
  children,
  ...props
}: WebPreviewViewportProps) => (
  <div className={cn('flex items-center gap-1 ml-2 border-l border-gray-700 pl-2', className)} {...props}>
    <WebPreviewNavigationButton
      tooltip="Desktop"
      active={useWebPreview().viewport === 'desktop'}
      onClick={() => useWebPreview().setViewport('desktop')}
    >
      <Monitor className="h-4 w-4" />
    </WebPreviewNavigationButton>
    <WebPreviewNavigationButton
      tooltip="Tablet"
      active={useWebPreview().viewport === 'tablet'}
      onClick={() => useWebPreview().setViewport('tablet')}
    >
      <Tablet className="h-4 w-4" />
    </WebPreviewNavigationButton>
    <WebPreviewNavigationButton
      tooltip="Mobile"
      active={useWebPreview().viewport === 'mobile'}
      onClick={() => useWebPreview().setViewport('mobile')}
    >
      <Smartphone className="h-4 w-4" />
    </WebPreviewNavigationButton>
  </div>
);

export type WebPreviewUrlProps = ComponentProps<typeof Input>;

export const WebPreviewUrl = ({
  value,
  onChange,
  onKeyDown,
  ...props
}: WebPreviewUrlProps) => {
  const { url, setUrl } = useWebPreview();

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const target = event.target as HTMLInputElement;
      setUrl(target.value);
    }
    onKeyDown?.(event);
  };

  return (
    <Input
      className="h-8 flex-1 text-sm bg-gray-800/50 border-gray-700"
      onChange={onChange}
      onKeyDown={handleKeyDown}
      placeholder="Preview URL..."
      value={value ?? url}
      {...props}
    />
  );
};

export type WebPreviewBodyProps = ComponentProps<'iframe'> & {
  loading?: React.ReactNode;
  localPreview?: boolean;
  localCode?: string;
  localFiles?: Array<{ path: string; content: string }>;
};

export const WebPreviewBody = ({
  className,
  loading,
  localPreview,
  localCode,
  localFiles,
  src,
  ...props
}: WebPreviewBodyProps) => {
  const { url, isLoading, setIsLoading, viewport } = useWebPreview();

  const getViewportWidth = () => {
    switch (viewport) {
      case 'mobile':
        return '375px';
      case 'tablet':
        return '768px';
      default:
        return '100%';
    }
  };

  // If we have local preview, generate the sandbox HTML
  const generateLocalPreview = () => {
    if (!localPreview || !localCode) return null;

    const fileMap: Record<string, string> = {};
    if (localFiles) {
      localFiles.forEach(f => {
        fileMap[f.path.replace(/\\/g, '/').replace(/^\.\/+/, '').replace(/^\/+/, '')] = f.content;
      });
    }

    if (localCode) {
      fileMap['src/App.tsx'] = localCode;
    }

    const cssContent = localFiles
      ?.filter((f) => f.path.endsWith('.css'))
      .map((f) => f.content)
      .join('\n\n');

    const safeFiles = JSON.stringify(fileMap).replace(/</g, '\\u003c');
    const safeCss = JSON.stringify(cssContent || '').replace(/</g, '\\u003c');

    return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <style>
      * { box-sizing: border-box; }
      html, body, #root { width: 100%; min-height: 100%; margin: 0; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
      (function () {
        const React = window.React;
        const ReactDOM = window.ReactDOM;
        const VIRTUAL_FILES = ${safeFiles};
        const AGGREGATED_CSS = ${safeCss};
        const moduleCache = {};
        const FILE_PATHS = Object.keys(VIRTUAL_FILES);
        
        function flattenClass(input) {
          if (!input) return [];
          if (typeof input === 'string') return [input];
          if (Array.isArray(input)) return input.flatMap(flattenClass);
          if (typeof input === 'object') return Object.keys(input).filter((k) => input[k]);
          return [];
        }
        
        function clsx() {
          return Array.from(arguments).flatMap(flattenClass).join(' ');
        }
        
        const motion = new Proxy({}, {
          get: function(_, tag) {
            return function MotionComponent(props) {
              const p = Object.assign({}, props);
              delete p.initial;
              delete p.animate;
              delete p.exit;
              return React.createElement(String(tag), p, p.children);
            };
          }
        });
        
        const builtins = {
          react: React,
          'react-dom/client': { createRoot: ReactDOM.createRoot },
          clsx: clsx,
          'tailwind-merge': { twMerge: function() { return Array.from(arguments).filter(Boolean).join(' '); } },
          'framer-motion': { motion: motion, AnimatePresence: function(props) { return React.createElement(React.Fragment, null, props.children); } },
        };
        
        function resolveFile(basePath) {
          const candidates = [
            basePath,
            basePath + '.tsx', basePath + '.ts', basePath + '.jsx', basePath + '.js', basePath + '.css',
            basePath + '/index.tsx', basePath + '/index.ts', basePath + '/index.jsx', basePath + '/index.js',
          ];
          for (const c of candidates) {
            if (Object.prototype.hasOwnProperty.call(VIRTUAL_FILES, c)) return c;
          }
          return basePath;
        }
        
        function transpile(path, source) {
          return window.Babel.transform(source, {
            filename: path,
            presets: [['typescript', { allExtensions: true, isTSX: path.endsWith('x') }], ['react', { runtime: 'classic' }]],
            plugins: ['transform-modules-commonjs'],
            sourceType: 'module',
          }).code;
        }
        
        function runModule(path) {
          const normalized = resolveFile(path);
          if (moduleCache[normalized]) return moduleCache[normalized].exports;
          
          if (normalized.endsWith('.css')) {
            moduleCache[normalized] = { exports: {} };
            return moduleCache[normalized].exports;
          }
          
          const source = VIRTUAL_FILES[normalized];
          if (typeof source !== 'string') {
            const componentName = (normalized.split('/').pop() || normalized).replace(/\\.(tsx|ts|jsx|js)$/i, '');
            const MissingComponent = function() {
              return React.createElement('div', { style: { padding: '8px', color: '#991b1b', background: '#fef2f2', borderRadius: '8px', fontSize: '12px' } }, 'Missing: ' + normalized);
            };
            moduleCache[normalized] = { exports: new Proxy({ __esModule: true, default: MissingComponent }, { get: (t, p) => t[p] || MissingComponent }) };
            return moduleCache[normalized].exports;
          }
          
          const module = { exports: {} };
          moduleCache[normalized] = module;
          
          const localRequire = function(spec) {
            if (builtins[spec]) return builtins[spec];
            return runModule(resolveFile(spec));
          };
          
          const compiled = transpile(normalized, source);
          const fn = new Function('require', 'module', 'exports', compiled);
          fn(localRequire, module, module.exports);
          return module.exports;
        }
        
        try {
          if (AGGREGATED_CSS) {
            const style = document.createElement('style');
            style.textContent = AGGREGATED_CSS;
            document.head.appendChild(style);
          }
          
          const entry = ['src/main.tsx', 'src/main.jsx', 'main.tsx', 'main.jsx', 'src/App.tsx', 'src/App.jsx', 'App.tsx', 'App.jsx'].find(p => VIRTUAL_FILES[p]);
          
          if (!entry) throw new Error('No entry file found');
          
          if (entry.endsWith('/main.tsx') || entry.endsWith('/main.jsx') || entry === 'main.tsx' || entry === 'main.jsx') {
            runModule(entry);
          } else {
            const appExports = runModule(entry);
            const App = appExports.default || appExports.App || appExports;
            if (typeof App !== 'function') throw new Error('App not found');
            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(React.createElement(App));
          }
        } catch (err) {
          console.error(err);
          document.body.innerHTML = '<div style="padding:16px;color:#b91c1c;font-family:ui-monospace;"><strong>Preview Error</strong><pre style="white-space:pre-wrap;margin-top:8px;">' + String(err) + '</pre></div>';
        }
      })();
    </script>
  </body>
</html>`;
  };

  const previewSrc = localPreview ? `data:text/html;charset=utf-8,${encodeURIComponent(generateLocalPreview() || '')}` : (src ?? url);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 z-10">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      )}
      <div
        className="flex-1 flex items-center justify-center p-4 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}
      >
        <div
          className="transition-all duration-300 bg-white rounded-lg overflow-hidden shadow-2xl"
          style={{
            width: getViewportWidth(),
            height: viewport === 'mobile' ? '667px' : viewport === 'tablet' ? '1024px' : '100%',
          }}
        >
          <iframe
            className="size-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
            src={previewSrc || undefined}
            title="Preview"
            onLoad={() => setIsLoading(false)}
            {...props}
          />
        </div>
      </div>
    </div>
  );
};

export type WebPreviewConsoleProps = ComponentProps<'div'> & {
  logs?: Array<{
    level: 'log' | 'warn' | 'error';
    message: string;
    timestamp: Date;
  }>;
};

export const WebPreviewConsole = ({
  className,
  logs = [],
  children,
  ...props
}: WebPreviewConsoleProps) => {
  const { consoleOpen, setConsoleOpen } = useWebPreview();

  return (
    <div className={cn('border-t border-gray-800 bg-gray-900/50 font-mono text-sm', className)} {...props}>
      <Button
        className="flex w-full items-center justify-between p-3 text-left hover:bg-gray-800"
        variant="ghost"
        onClick={() => setConsoleOpen(!consoleOpen)}
      >
        <span>Console</span>
        <ChevronDownIcon
          className={cn('h-4 w-4 transition-transform duration-200', consoleOpen && 'rotate-180')}
        />
      </Button>
      {consoleOpen && (
        <div className="px-3 pb-3 max-h-48 overflow-y-auto">
          <div className="space-y-1">
            {logs.length === 0 ? (
              <p className="text-gray-500 text-xs">No console output</p>
            ) : (
              logs.map((log, index) => (
                <div
                  className={cn(
                    'text-xs',
                    log.level === 'error' && 'text-red-400',
                    log.level === 'warn' && 'text-yellow-400',
                    log.level === 'log' && 'text-gray-300'
                  )}
                  key={index}
                >
                  <span className="text-gray-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>{' '}
                  {log.message}
                </div>
              ))
            )}
          </div>
          {children}
        </div>
      )}
    </div>
  );
};

// Helper component for ChevronDownIcon
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);
