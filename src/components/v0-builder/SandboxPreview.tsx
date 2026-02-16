import { useEffect, useMemo, useRef } from "react";
import type { ProjectFile } from "./V0Builder";

interface SandboxPreviewProps {
  code: string;
  files: ProjectFile[];
}

export function SandboxPreview({ code, files }: SandboxPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const previewHtml = useMemo(() => {
    const fileMap: Record<string, string> = {};
    for (const file of files) fileMap[file.path] = file.content;

    if (code) {
      if (fileMap["src/App.tsx"]) fileMap["src/App.tsx"] = code;
      else if (fileMap["App.tsx"]) fileMap["App.tsx"] = code;
    }

    const cssContent = files
      .filter((f) => f.path.endsWith(".css"))
      .map((f) => f.content)
      .join("\n\n");

    const safeFiles = JSON.stringify(fileMap).replace(/</g, "\\u003c");
    const safeCss = JSON.stringify(cssContent).replace(/</g, "\\u003c");

    return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
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

        function createLucideIcon(name) {
          return function Icon(props) {
            const p = props || {};
            const size = p.size || 24;
            const className = p.className || '';
            return React.createElement(
              'svg',
              {
                width: size,
                height: size,
                viewBox: '0 0 24 24',
                fill: 'none',
                stroke: 'currentColor',
                strokeWidth: 2,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                className,
              },
              React.createElement('circle', { cx: 12, cy: 12, r: 10 }),
              React.createElement('text', { x: 12, y: 16, textAnchor: 'middle', fontSize: 8, fill: 'currentColor', stroke: 'none' }, (name || '?').slice(0, 1))
            );
          };
        }

        const motion = new Proxy({}, {
          get: function(_, tag) {
            return function MotionComponent(props) {
              const p = Object.assign({}, props);
              delete p.initial;
              delete p.animate;
              delete p.exit;
              delete p.transition;
              delete p.variants;
              delete p.whileHover;
              delete p.whileTap;
              delete p.whileInView;
              return React.createElement(String(tag), p, p.children);
            };
          }
        });

        const builtins = {
          react: React,
          'react-dom/client': { createRoot: ReactDOM.createRoot },
          'lucide-react': new Proxy({}, { get: function(_, name) { return createLucideIcon(String(name)); } }),
          'framer-motion': {
            motion: motion,
            AnimatePresence: function AnimatePresence(props) {
              return React.createElement(React.Fragment, null, props.children);
            },
            useInView: function() { return true; },
            useAnimation: function() { return { start: function(){}, stop: function(){} }; },
            useMotionValue: function(v) { return { get: function(){ return v; }, set: function(){} }; },
            useTransform: function() { return 0; },
            useSpring: function(v) { return v; },
            useScroll: function() { return { scrollY: { get: function(){ return 0; } }, scrollYProgress: { get: function(){ return 0; } } }; },
          },
          clsx: clsx,
          'tailwind-merge': { twMerge: function() { return Array.from(arguments).filter(Boolean).join(' '); } },
          'react-router-dom': {
            BrowserRouter: function BrowserRouter(props) { return React.createElement(React.Fragment, null, props.children); },
            Routes: function Routes(props) { return React.createElement(React.Fragment, null, props.children); },
            Route: function Route(props) { return React.createElement(React.Fragment, null, props.element || props.children); },
            Link: function Link(props) { return React.createElement('a', { href: props.to || '#', className: props.className }, props.children); },
            NavLink: function NavLink(props) { return React.createElement('a', { href: props.to || '#', className: props.className }, props.children); },
            useNavigate: function() { return function() {}; },
            useLocation: function() { return { pathname: '/' }; },
            useParams: function() { return {}; },
          },
        };

        function normalizePath(path) {
          return String(path).replace(/\\\\/g, '/').replace(/^\\.\\//, '');
        }

        function dirname(path) {
          const p = normalizePath(path);
          const idx = p.lastIndexOf('/');
          return idx === -1 ? '' : p.slice(0, idx);
        }

        function joinPath(base, rel) {
          const stack = normalizePath(base).split('/').filter(Boolean);
          const parts = normalizePath(rel).split('/').filter(Boolean);
          for (const part of parts) {
            if (part === '.') continue;
            if (part === '..') stack.pop();
            else stack.push(part);
          }
          return stack.join('/');
        }

        function resolveImport(fromPath, spec) {
          if (spec.startsWith('@/')) {
            return resolveFile('src/' + spec.slice(2));
          }
          if (spec.startsWith('./') || spec.startsWith('../')) {
            return resolveFile(joinPath(dirname(fromPath), spec));
          }
          return spec;
        }

        function resolveFile(basePath) {
          const p = normalizePath(basePath);
          const candidates = [p, p + '.tsx', p + '.ts', p + '.jsx', p + '.js', p + '.css', p + '/index.tsx', p + '/index.ts', p + '/index.jsx', p + '/index.js'];
          for (const c of candidates) {
            if (Object.prototype.hasOwnProperty.call(VIRTUAL_FILES, c)) return c;
          }
          return p;
        }

        function transpile(path, source) {
          return window.Babel.transform(source, {
            filename: path,
            presets: [
              ['typescript', { allExtensions: true, isTSX: path.endsWith('x') }],
              ['react', { runtime: 'classic' }],
            ],
            plugins: ['transform-modules-commonjs'],
            sourceType: 'module',
          }).code;
        }

        function runModule(path) {
          const normalized = normalizePath(path);
          if (moduleCache[normalized]) return moduleCache[normalized].exports;

          if (normalized.endsWith('.css')) {
            moduleCache[normalized] = { exports: {} };
            return moduleCache[normalized].exports;
          }

          const source = VIRTUAL_FILES[normalized];
          if (typeof source !== 'string') throw new Error('Module not found: ' + normalized);

          const module = { exports: {} };
          moduleCache[normalized] = module;

          const localRequire = function(spec) {
            if (Object.prototype.hasOwnProperty.call(builtins, spec)) return builtins[spec];
            const resolved = resolveImport(normalized, spec);
            if (Object.prototype.hasOwnProperty.call(builtins, resolved)) return builtins[resolved];
            return runModule(resolved);
          };

          const compiled = transpile(normalized, source);
          const fn = new Function('require', 'module', 'exports', compiled);
          fn(localRequire, module, module.exports);
          return module.exports;
        }

        function renderError(title, err) {
          const root = document.getElementById('root');
          root.innerHTML = '<div style="padding:16px;color:#b91c1c;font-family:ui-monospace, SFMono-Regular, Menlo, monospace;">'
            + '<strong>' + title + '</strong><pre style="white-space:pre-wrap;margin-top:8px;">' + String(err && (err.stack || err.message || err)) + '</pre></div>';
        }

        try {
          if (AGGREGATED_CSS) {
            const style = document.createElement('style');
            style.textContent = AGGREGATED_CSS;
            document.head.appendChild(style);
          }

          const entry = [
            'src/main.tsx',
            'src/main.jsx',
            'main.tsx',
            'main.jsx',
            'src/App.tsx',
            'src/App.jsx',
            'App.tsx',
            'App.jsx',
          ].find((p) => Object.prototype.hasOwnProperty.call(VIRTUAL_FILES, p));

          if (!entry) throw new Error('No entry file found. Expected src/main.tsx or src/App.tsx');

          if (entry.endsWith('/main.tsx') || entry.endsWith('/main.jsx') || entry === 'main.tsx' || entry === 'main.jsx') {
            runModule(entry);
          } else {
            const appExports = runModule(entry);
            const App = appExports.default || appExports.App || appExports;
            if (typeof App !== 'function') throw new Error('App component export not found in ' + entry);
            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(React.createElement(App));
          }
        } catch (err) {
          console.error(err);
          renderError('Preview runtime error', err);
        }
      })();
    </script>
  </body>
</html>`;
  }, [code, files]);

  useEffect(() => {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(previewHtml);
    doc.close();
  }, [previewHtml]);

  return (
    <iframe
      ref={iframeRef}
      className="w-full h-full border-0 bg-white"
      sandbox="allow-scripts"
      title="Website Preview"
    />
  );
}
