import { useMemo } from 'react';
import type { ProjectFile } from './V0Builder';

interface SandboxPreviewProps {
  code: string;
  files: ProjectFile[];
}

export function SandboxPreview({ code, files }: SandboxPreviewProps) {
  const previewHtml = useMemo(() => {
    const fileMap: Record<string, string> = {};
    for (const file of files) {
      const normalizedPath = file.path
        .replace(/\\/g, '/')
        .replace(/^\.\/+/, '')
        .replace(/^\/+/, '');
      fileMap[normalizedPath] = file.content;
    }

    if (code) {
      if (fileMap['src/App.tsx']) fileMap['src/App.tsx'] = code;
      else if (fileMap['App.tsx']) fileMap['App.tsx'] = code;
    }

    const cssContent = files
      .filter((f) => f.path.endsWith('.css'))
      .map((f) => f.content)
      .join('\n\n');

    const safeFiles = JSON.stringify(fileMap).replace(/</g, '\\u003c');
    const safeCss = JSON.stringify(cssContent).replace(/</g, '\\u003c');

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
        var React = window.React;
        var ReactDOM = window.ReactDOM;
        var VIRTUAL_FILES = ${safeFiles};
        var AGGREGATED_CSS = ${safeCss};
        var moduleCache = {};
        var FILE_PATHS = Object.keys(VIRTUAL_FILES);
        var FILE_PATHS_LOWER = new Map(FILE_PATHS.map(function(p) { return [String(p).toLowerCase(), p]; }));

        function flattenClass(input) {
          if (!input) return [];
          if (typeof input === 'string') return [input];
          if (Array.isArray(input)) return input.flatMap(flattenClass);
          if (typeof input === 'object') return Object.keys(input).filter(function(k) { return input[k]; });
          return [];
        }

        function clsx() {
          return Array.from(arguments).flatMap(flattenClass).join(' ');
        }

        function createLucideIcon(name) {
          return function Icon(props) {
            var p = props || {};
            var size = p.size || 24;
            var className = p.className || '';
            return React.createElement(
              'svg',
              {
                width: size, height: size, viewBox: '0 0 24 24',
                fill: 'none', stroke: 'currentColor', strokeWidth: 2,
                strokeLinecap: 'round', strokeLinejoin: 'round', className: className,
              },
              React.createElement('circle', { cx: 12, cy: 12, r: 10 }),
              React.createElement('text', {
                x: 12, y: 16, textAnchor: 'middle', fontSize: 8,
                fill: 'currentColor', stroke: 'none'
              }, (name || '?').slice(0, 1))
            );
          };
        }

        var motion = new Proxy({}, {
          get: function(_, tag) {
            return function MotionComponent(props) {
              var p = Object.assign({}, props);
              ['initial','animate','exit','transition','variants','whileHover','whileTap','whileInView'].forEach(function(k) { delete p[k]; });
              return React.createElement(String(tag), p, p.children);
            };
          }
        });

        var builtins = {
          react: React,
          'react-dom/client': { createRoot: ReactDOM.createRoot },
          'lucide-react': new Proxy({}, { get: function(_, name) { return createLucideIcon(String(name)); } }),
          'framer-motion': {
            motion: motion,
            AnimatePresence: function(props) { return React.createElement(React.Fragment, null, props.children); },
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
            BrowserRouter: function(props) { return React.createElement(React.Fragment, null, props.children); },
            Routes: function(props) { return React.createElement(React.Fragment, null, props.children); },
            Route: function(props) { return React.createElement(React.Fragment, null, props.element || props.children); },
            Link: function(props) { return React.createElement('a', { href: props.to || '#', className: props.className }, props.children); },
            NavLink: function(props) { return React.createElement('a', { href: props.to || '#', className: props.className }, props.children); },
            useNavigate: function() { return function() {}; },
            useLocation: function() { return { pathname: '/' }; },
            useParams: function() { return {}; },
          },
        };

        function normalizePath(path) {
          return String(path).replace(/\\\\\\\\/g, '/').replace(/^\\\\.\\\\//, '').replace(/^\\\\//, '');
        }

        function dirname(path) {
          var p = normalizePath(path);
          var idx = p.lastIndexOf('/');
          return idx === -1 ? '' : p.slice(0, idx);
        }

        function joinPath(base, rel) {
          var stack = normalizePath(base).split('/').filter(Boolean);
          var parts = normalizePath(rel).split('/').filter(Boolean);
          for (var i = 0; i < parts.length; i++) {
            if (parts[i] === '.') continue;
            if (parts[i] === '..') stack.pop();
            else stack.push(parts[i]);
          }
          return stack.join('/');
        }

        function resolveImport(fromPath, spec) {
          if (spec.startsWith('@/')) return resolveFile('src/' + spec.slice(2));
          if (spec.startsWith('src/')) return resolveFile(spec);
          if (spec.startsWith('/')) return resolveFile(spec.slice(1));
          if (spec.startsWith('./') || spec.startsWith('../')) return resolveFile(joinPath(dirname(fromPath), spec));
          return spec;
        }

        function resolveFile(basePath) {
          var p = normalizePath(basePath);
          var alt = p.startsWith('src/') ? p.slice(4) : ('src/' + p);
          var candidates = [
            p, p+'.tsx', p+'.ts', p+'.jsx', p+'.js', p+'.css',
            p+'/index.tsx', p+'/index.ts', p+'/index.jsx', p+'/index.js',
            alt, alt+'.tsx', alt+'.ts', alt+'.jsx', alt+'.js', alt+'.css',
            alt+'/index.tsx', alt+'/index.ts', alt+'/index.jsx', alt+'/index.js',
          ];
          for (var i = 0; i < candidates.length; i++) {
            if (Object.prototype.hasOwnProperty.call(VIRTUAL_FILES, candidates[i])) return candidates[i];
            var lower = FILE_PATHS_LOWER.get(String(candidates[i]).toLowerCase());
            if (lower) return lower;
          }
          var targetBase = p.split('/').pop();
          if (targetBase) {
            var loose = FILE_PATHS.find(function(fp) {
              var base = fp.split('/').pop() || '';
              if (base === targetBase) return true;
              return base.replace(/\\.(tsx|ts|jsx|js|css)$/i, '') === targetBase.replace(/\\.(tsx|ts|jsx|js|css)$/i, '');
            });
            if (loose) return loose;
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
          var normalized = resolveFile(path);
          if (moduleCache[normalized]) return moduleCache[normalized].exports;
          if (normalized.endsWith('.css')) {
            moduleCache[normalized] = { exports: {} };
            return moduleCache[normalized].exports;
          }
          var source = VIRTUAL_FILES[normalized];
          if (typeof source !== 'string') {
            var maybeComponent = normalized.split('/').pop() || normalized;
            var componentName = maybeComponent.replace(/\\.(tsx|ts|jsx|js)$/i, '');
            if (/^[A-Z]/.test(componentName)) {
              var MissingComponent = function() {
                return React.createElement('div', {
                  style: { border: '1px solid #fca5a5', background: '#fef2f2', color: '#991b1b', padding: '8px 10px', borderRadius: '8px', margin: '8px', fontFamily: 'ui-monospace, monospace', fontSize: '12px' }
                }, 'Missing module: ' + normalized);
              };
              moduleCache[normalized] = {
                exports: new Proxy({ __esModule: true, default: MissingComponent }, {
                  get: function(t, prop) { return prop in t ? t[prop] : MissingComponent; }
                })
              };
              return moduleCache[normalized].exports;
            }
            throw new Error('Module not found: ' + normalized);
          }
          var mod = { exports: {} };
          moduleCache[normalized] = mod;
          var localRequire = function(spec) {
            if (Object.prototype.hasOwnProperty.call(builtins, spec)) return builtins[spec];
            var resolved = resolveImport(normalized, spec);
            if (Object.prototype.hasOwnProperty.call(builtins, resolved)) return builtins[resolved];
            return runModule(resolveFile(resolved));
          };
          var compiled = transpile(normalized, source);
          var fn = new Function('require', 'module', 'exports', compiled);
          fn(localRequire, mod, mod.exports);
          return mod.exports;
        }

        function renderError(title, err) {
          var root = document.getElementById('root');
          root.innerHTML = '<div style="padding:16px;color:#b91c1c;font-family:ui-monospace,monospace;"><strong>' + title + '</strong><pre style="white-space:pre-wrap;margin-top:8px;">' + String(err && (err.stack || err.message || err)) + '</pre></div>';
        }

        try {
          window.addEventListener('error', function(ev) {
            var msg = String((ev && ev.message) || '');
            if (msg.includes('Blocked a frame with origin')) ev.preventDefault();
          });
          if (AGGREGATED_CSS) {
            var style = document.createElement('style');
            style.textContent = AGGREGATED_CSS;
            document.head.appendChild(style);
          }
          var entry = ['src/main.tsx','src/main.jsx','main.tsx','main.jsx','src/App.tsx','src/App.jsx','App.tsx','App.jsx']
            .find(function(p) { return Object.prototype.hasOwnProperty.call(VIRTUAL_FILES, p); });
          if (!entry) throw new Error('No entry file found');
          if (entry.indexOf('main.') !== -1) {
            runModule(entry);
          } else {
            var appExports = runModule(entry);
            var App = appExports.default || appExports.App || appExports;
            if (typeof App !== 'function') throw new Error('App component not found in ' + entry);
            var root = ReactDOM.createRoot(document.getElementById('root'));
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

  return (
    <iframe
      srcDoc={previewHtml}
      className="w-full h-full border-0 bg-white"
      sandbox="allow-scripts"
      title="Website Preview"
    />
  );
}