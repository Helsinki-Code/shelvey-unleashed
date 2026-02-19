import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface PreviewEngineProps {
  code: string;
  theme?: 'light' | 'dark';
  className?: string;
}

export function PreviewEngine({ code, theme = 'light', className }: PreviewEngineProps) {
  const previewHtml = useMemo(() => {
    const safeCode = code.replace(/<\/script>/gi, '<\\/script>');
    
    return `<!doctype html>
<html class="${theme === 'dark' ? 'dark' : ''}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { box-sizing: border-box; }
    html, body, #root { width: 100%; min-height: 100vh; margin: 0; }
    body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    try {
      const App = ${safeCode};
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(App));
    } catch (err) {
      document.getElementById('root').innerHTML = 
        '<div style="padding:24px;color:#b91c1c;font-family:monospace;"><strong>Preview Error</strong><pre style="white-space:pre-wrap;margin-top:8px;">' + 
        (err.message || err) + '</pre></div>';
    }
  </script>
</body>
</html>`;
  }, [code, theme]);

  return (
    <iframe
      srcDoc={previewHtml}
      className={cn('w-full h-full border-0 bg-white', className)}
      sandbox="allow-scripts"
      title="Live Preview"
    />
  );
}
