import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Eye, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileTree } from './FileTree';
import { CodeEditor } from './CodeEditor';
import { cn } from '@/lib/utils';
import type { ProjectFile } from './V0Builder';

interface PreviewPanelProps {
  files: ProjectFile[];
  selectedFile: string | null;
  onSelectFile: (path: string | null) => void;
  currentFileContent?: string;
  viewMode: 'preview' | 'code';
  viewport: 'desktop' | 'tablet' | 'mobile';
  viewportWidth: string;
  refreshKey: number;
  onRefresh: () => void;
}

const VIEWPORT_HEIGHTS: Record<string, string> = {
  desktop: '100%',
  tablet: '1024px',
  mobile: '667px',
};

// ── Inline sandbox renderer ─────────────────────────────────────
// This replaces the separate SandboxPreview component. The iframe
// HTML is built right here so there's one single source of truth
// for the preview logic — no extra file to keep in sync.

function buildPreviewHtml(files: ProjectFile[]): string {
  const fileMap: Record<string, string> = {};
  for (const file of files) {
    const p = file.path
      .replace(/\\/g, '/')
      .replace(/^\.\/+/, '')
      .replace(/^\/+/, '');
    fileMap[p] = file.content;
  }

  const cssContent = files
    .filter((f) => f.path.endsWith('.css'))
    .map((f) => f.content)
    .join('\n\n');

  const safeFiles = JSON.stringify(fileMap).replace(/</g, '\\u003c');
  const safeCss = JSON.stringify(cssContent).replace(/</g, '\\u003c');

  const script = [
    '(function () {',
    '  var React = window.React;',
    '  var ReactDOM = window.ReactDOM;',
    '  var VIRTUAL_FILES = ' + safeFiles + ';',
    '  var AGGREGATED_CSS = ' + safeCss + ';',
    '  var moduleCache = {};',
    '  var FILE_PATHS = Object.keys(VIRTUAL_FILES);',
    '  var FILE_PATHS_LOWER = new Map(FILE_PATHS.map(function(p) { return [String(p).toLowerCase(), p]; }));',
    '',
    '  function flattenClass(input) {',
    '    if (!input) return [];',
    '    if (typeof input === "string") return [input];',
    '    if (Array.isArray(input)) return input.flatMap(flattenClass);',
    '    if (typeof input === "object") return Object.keys(input).filter(function(k) { return input[k]; });',
    '    return [];',
    '  }',
    '',
    '  function clsx() {',
    '    return Array.from(arguments).flatMap(flattenClass).join(" ");',
    '  }',
    '',
    '  function createLucideIcon(name) {',
    '    return function Icon(props) {',
    '      var p = props || {};',
    '      var size = p.size || 24;',
    '      var cn = p.className || "";',
    '      return React.createElement("svg", {',
    '        width: size, height: size, viewBox: "0 0 24 24",',
    '        fill: "none", stroke: "currentColor", strokeWidth: 2,',
    '        strokeLinecap: "round", strokeLinejoin: "round", className: cn',
    '      },',
    '        React.createElement("circle", { cx: 12, cy: 12, r: 10 }),',
    '        React.createElement("text", {',
    '          x: 12, y: 16, textAnchor: "middle", fontSize: 8,',
    '          fill: "currentColor", stroke: "none"',
    '        }, (name || "?").slice(0, 1))',
    '      );',
    '    };',
    '  }',
    '',
    '  var MOTION_STRIP = ["initial","animate","exit","transition","variants","whileHover","whileTap","whileInView","layout","layoutId"];',
    '  var motion = new Proxy({}, {',
    '    get: function(_, tag) {',
    '      return function(props) {',
    '        var p = Object.assign({}, props);',
    '        MOTION_STRIP.forEach(function(k) { delete p[k]; });',
    '        return React.createElement(String(tag), p, p.children);',
    '      };',
    '    }',
    '  });',
    '',
    '  var builtins = {',
    '    "react": React,',
    '    "react-dom/client": { createRoot: ReactDOM.createRoot },',
    '    "lucide-react": new Proxy({}, { get: function(_, n) { return createLucideIcon(String(n)); } }),',
    '    "framer-motion": {',
    '      motion: motion,',
    '      AnimatePresence: function(p) { return React.createElement(React.Fragment, null, p.children); },',
    '      useInView: function() { return true; },',
    '      useAnimation: function() { return { start: function(){}, stop: function(){} }; },',
    '      useMotionValue: function(v) { return { get: function(){ return v; }, set: function(){} }; },',
    '      useTransform: function() { return 0; },',
    '      useSpring: function(v) { return v; },',
    '      useScroll: function() { return { scrollY: { get: function(){ return 0; } }, scrollYProgress: { get: function(){ return 0; } } }; }',
    '    },',
    '    "clsx": clsx,',
    '    "tailwind-merge": { twMerge: function() { return Array.from(arguments).filter(Boolean).join(" "); } },',
    '    "react-router-dom": {',
    '      BrowserRouter: function(p) { return React.createElement(React.Fragment, null, p.children); },',
    '      Routes: function(p) { return React.createElement(React.Fragment, null, p.children); },',
    '      Route: function(p) { return React.createElement(React.Fragment, null, p.element || p.children); },',
    '      Link: function(p) { return React.createElement("a", { href: p.to || "#", className: p.className }, p.children); },',
    '      NavLink: function(p) { return React.createElement("a", { href: p.to || "#", className: p.className }, p.children); },',
    '      useNavigate: function() { return function() {}; },',
    '      useLocation: function() { return { pathname: "/" }; },',
    '      useParams: function() { return {}; }',
    '    }',
    '  };',
    '',
    '  function normalizePath(path) {',
    '    return String(path)',
    '      .replace(/[\\\\]+/g, "/")',
    '      .replace(/^\\.\\//,  "")',
    '      .replace(/^\\//, "");',
    '  }',
    '',
    '  function dirname(path) {',
    '    var p = normalizePath(path);',
    '    var idx = p.lastIndexOf("/");',
    '    return idx === -1 ? "" : p.slice(0, idx);',
    '  }',
    '',
    '  function joinPath(base, rel) {',
    '    var stack = normalizePath(base).split("/").filter(Boolean);',
    '    var parts = normalizePath(rel).split("/").filter(Boolean);',
    '    for (var i = 0; i < parts.length; i++) {',
    '      if (parts[i] === ".") continue;',
    '      if (parts[i] === "..") stack.pop();',
    '      else stack.push(parts[i]);',
    '    }',
    '    return stack.join("/");',
    '  }',
    '',
    '  function resolveImport(fromPath, spec) {',
    '    if (spec.indexOf("@/") === 0) return resolveFile("src/" + spec.slice(2));',
    '    if (spec.indexOf("src/") === 0) return resolveFile(spec);',
    '    if (spec.indexOf("/") === 0) return resolveFile(spec.slice(1));',
    '    if (spec.indexOf("./") === 0 || spec.indexOf("../") === 0) return resolveFile(joinPath(dirname(fromPath), spec));',
    '    return spec;',
    '  }',
    '',
    '  function resolveFile(basePath) {',
    '    var p = normalizePath(basePath);',
    '    var alt = p.indexOf("src/") === 0 ? p.slice(4) : ("src/" + p);',
    '    var exts = [".tsx", ".ts", ".jsx", ".js", ".css"];',
    '    var idxF = ["/index.tsx", "/index.ts", "/index.jsx", "/index.js"];',
    '    var candidates = [p];',
    '    var i;',
    '    for (i = 0; i < exts.length; i++) candidates.push(p + exts[i]);',
    '    for (i = 0; i < idxF.length; i++) candidates.push(p + idxF[i]);',
    '    candidates.push(alt);',
    '    for (i = 0; i < exts.length; i++) candidates.push(alt + exts[i]);',
    '    for (i = 0; i < idxF.length; i++) candidates.push(alt + idxF[i]);',
    '    for (i = 0; i < candidates.length; i++) {',
    '      if (Object.prototype.hasOwnProperty.call(VIRTUAL_FILES, candidates[i])) return candidates[i];',
    '      var lower = FILE_PATHS_LOWER.get(String(candidates[i]).toLowerCase());',
    '      if (lower) return lower;',
    '    }',
    '    var targetBase = p.split("/").pop();',
    '    if (targetBase) {',
    '      var re = /\\.(tsx|ts|jsx|js|css)$/i;',
    '      var loose = FILE_PATHS.find(function(fp) {',
    '        var base = fp.split("/").pop() || "";',
    '        if (base === targetBase) return true;',
    '        return base.replace(re, "") === targetBase.replace(re, "");',
    '      });',
    '      if (loose) return loose;',
    '    }',
    '    return p;',
    '  }',
    '',
    '  function transpile(path, source) {',
    '    return window.Babel.transform(source, {',
    '      filename: path,',
    '      presets: [',
    '        ["typescript", { allExtensions: true, isTSX: path.indexOf(".tsx") !== -1 || path.indexOf(".jsx") !== -1 }],',
    '        ["react", { runtime: "classic" }]',
    '      ],',
    '      plugins: ["transform-modules-commonjs"],',
    '      sourceType: "module"',
    '    }).code;',
    '  }',
    '',
    '  function runModule(path) {',
    '    var normalized = resolveFile(path);',
    '    if (moduleCache[normalized]) return moduleCache[normalized].exports;',
    '    if (normalized.indexOf(".css") === normalized.length - 4) {',
    '      moduleCache[normalized] = { exports: {} };',
    '      return moduleCache[normalized].exports;',
    '    }',
    '    var source = VIRTUAL_FILES[normalized];',
    '    if (typeof source !== "string") {',
    '      var maybeComp = normalized.split("/").pop() || normalized;',
    '      var compName = maybeComp.replace(/\\.(tsx|ts|jsx|js)$/i, "");',
    '      if (/^[A-Z]/.test(compName)) {',
    '        var Missing = function() {',
    '          return React.createElement("div", {',
    '            style: { border: "1px solid #fca5a5", background: "#fef2f2", color: "#991b1b", padding: "8px 10px", borderRadius: "8px", margin: "8px", fontFamily: "ui-monospace, monospace", fontSize: "12px" }',
    '          }, "Missing module: " + normalized);',
    '        };',
    '        moduleCache[normalized] = {',
    '          exports: new Proxy({ __esModule: true, default: Missing }, {',
    '            get: function(t, prop) { return prop in t ? t[prop] : Missing; }',
    '          })',
    '        };',
    '        return moduleCache[normalized].exports;',
    '      }',
    '      throw new Error("Module not found: " + normalized);',
    '    }',
    '    var mod = { exports: {} };',
    '    moduleCache[normalized] = mod;',
    '    var localRequire = function(spec) {',
    '      if (Object.prototype.hasOwnProperty.call(builtins, spec)) return builtins[spec];',
    '      var resolved = resolveImport(normalized, spec);',
    '      if (Object.prototype.hasOwnProperty.call(builtins, resolved)) return builtins[resolved];',
    '      return runModule(resolveFile(resolved));',
    '    };',
    '    var compiled = transpile(normalized, source);',
    '    var fn = new Function("require", "module", "exports", compiled);',
    '    fn(localRequire, mod, mod.exports);',
    '    return mod.exports;',
    '  }',
    '',
    '  function renderError(title, err) {',
    '    var root = document.getElementById("root");',
    '    root.innerHTML = \'<div style="padding:16px;color:#b91c1c;font-family:ui-monospace,monospace;">\'',
    '      + "<strong>" + title + "<\\/strong>"',
    '      + \'<pre style="white-space:pre-wrap;margin-top:8px;">\' + String(err && (err.stack || err.message || err)) + "<\\/pre><\\/div>";',
    '  }',
    '',
    '  try {',
    '    window.addEventListener("error", function(ev) {',
    '      var msg = String((ev && ev.message) || "");',
    '      if (msg.indexOf("Blocked a frame with origin") !== -1) ev.preventDefault();',
    '    });',
    '    if (AGGREGATED_CSS) {',
    '      var style = document.createElement("style");',
    '      style.textContent = AGGREGATED_CSS;',
    '      document.head.appendChild(style);',
    '    }',
    '    var entryPaths = ["src/main.tsx","src/main.jsx","main.tsx","main.jsx","src/App.tsx","src/App.jsx","App.tsx","App.jsx"];',
    '    var entry = null;',
    '    for (var ei = 0; ei < entryPaths.length; ei++) {',
    '      if (Object.prototype.hasOwnProperty.call(VIRTUAL_FILES, entryPaths[ei])) { entry = entryPaths[ei]; break; }',
    '    }',
    '    if (!entry) throw new Error("No entry file found. Expected src/main.tsx or src/App.tsx");',
    '    if (entry.indexOf("main.") !== -1) {',
    '      runModule(entry);',
    '    } else {',
    '      var appExports = runModule(entry);',
    '      var App = appExports.default || appExports.App || appExports;',
    '      if (typeof App !== "function") throw new Error("App component not found in " + entry);',
    '      var root = ReactDOM.createRoot(document.getElementById("root"));',
    '      root.render(React.createElement(App));',
    '    }',
    '  } catch (err) {',
    '    console.error(err);',
    '    renderError("Preview runtime error", err);',
    '  }',
    '})();',
  ].join('\n');

  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    '  <meta charset="UTF-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin><\\/script>',
    '  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin><\\/script>',
    '  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\\/script>',
    '  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"><\\/script>',
    '  <style>',
    '    * { box-sizing: border-box; }',
    '    html, body, #root { width: 100%; min-height: 100%; margin: 0; }',
    '    body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }',
    '  </style>',
    '</head>',
    '<body>',
    '  <div id="root"></div>',
    '  <script>' + script + '<\\/script>',
    '</body>',
    '</html>',
  ].join('\n');
}

// ── PreviewPanel component ──────────────────────────────────────

export function PreviewPanel({
  files,
  selectedFile,
  onSelectFile,
  currentFileContent,
  viewMode,
  viewport,
  viewportWidth,
  refreshKey,
  onRefresh,
}: PreviewPanelProps) {
  const hasFiles = files.length > 0;

  const previewHtml = useMemo(() => {
    if (!hasFiles) return '';
    return buildPreviewHtml(files);
  }, [files, hasFiles, refreshKey]);

  // ── Code mode ───────────────────────────────────────────────
  if (viewMode === 'code') {
    return (
      <div className="h-full flex overflow-hidden">
        <div className="w-52 shrink-0 border-r border-border bg-muted/5 overflow-hidden">
          <div className="px-3 py-2 border-b border-border">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Files
            </h4>
          </div>
          <ScrollArea className="h-[calc(100%-33px)]">
            <FileTree
              files={files}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              expanded
            />
          </ScrollArea>
        </div>
        <div className="flex-1 overflow-hidden">
          <CodeEditor
            code={currentFileContent || '// Select a file to view its contents'}
            language={selectedFile?.endsWith('.css') ? 'css' : 'typescript'}
            filename={selectedFile || undefined}
          />
        </div>
      </div>
    );
  }

  // ── Preview mode ──────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      {hasFiles && (
        <div className="h-9 shrink-0 border-b border-border flex items-center justify-between px-3 bg-muted/10">
          <span className="text-xs text-muted-foreground">
            {viewport.charAt(0).toUpperCase() + viewport.slice(1)} Preview
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            className="h-6 w-6"
            aria-label="Refresh preview"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div
        className={cn(
          'flex-1 flex items-start justify-center overflow-auto',
          'bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]',
          hasFiles ? 'p-4' : 'p-0'
        )}
      >
        {hasFiles ? (
          <motion.div
            key={viewport}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-background rounded-lg shadow-xl border border-border overflow-hidden"
            style={{
              width: viewportWidth,
              maxWidth: '100%',
              height: VIEWPORT_HEIGHTS[viewport],
            }}
          >
            <iframe
              key={refreshKey}
              srcDoc={previewHtml}
              className="w-full h-full border-0 bg-white"
              sandbox="allow-scripts"
              title="Website Preview"
            />
          </motion.div>
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                <Eye className="h-8 w-8 opacity-30" />
              </div>
              <p className="text-sm font-medium mb-1">No preview yet</p>
              <p className="text-xs text-muted-foreground/70">
                Start a conversation to see your website here
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}