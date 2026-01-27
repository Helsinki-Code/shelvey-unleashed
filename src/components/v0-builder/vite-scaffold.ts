import type { ProjectFile } from "./V0Builder";

function upsert(files: ProjectFile[], file: ProjectFile) {
  const idx = files.findIndex((f) => f.path === file.path);
  if (idx >= 0) files[idx] = file;
  else files.push(file);
}

function has(files: ProjectFile[], path: string) {
  return files.some((f) => f.path === path);
}

/**
 * Ensures the deployment payload is a complete Vite + React project.
 * This makes deployments deterministic even when the AI only generated src/*.
 */
export function ensureViteScaffold(inputFiles: ProjectFile[], projectName: string): ProjectFile[] {
  const files = [...inputFiles];

  // Core root files
  if (!has(files, "package.json")) {
    upsert(files, {
      path: "package.json",
      type: "json",
      content: JSON.stringify(
        {
          name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-") || "website",
          private: true,
          version: "0.0.0",
          type: "module",
          scripts: {
            dev: "vite",
            build: "tsc -b && vite build",
            preview: "vite preview",
          },
          dependencies: {
            react: "^18.3.1",
            "react-dom": "^18.3.1",
            "react-router-dom": "^6.30.1",
            "framer-motion": "^12.23.25",
            "lucide-react": "^0.462.0",
            clsx: "^2.1.1",
            "tailwind-merge": "^2.6.0",
          },
          devDependencies: {
            "@types/react": "^18.3.11",
            "@types/react-dom": "^18.3.1",
            "@vitejs/plugin-react": "^4.3.4",
            autoprefixer: "^10.4.20",
            postcss: "^8.4.49",
            tailwindcss: "^3.4.14",
            typescript: "^5.6.3",
            vite: "^5.4.10",
          },
        },
        null,
        2
      ),
    });
  }

  if (!has(files, "index.html")) {
    upsert(files, {
      path: "index.html",
      type: "html",
      content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    });
  }

  if (!has(files, "vite.config.ts")) {
    upsert(files, {
      path: "vite.config.ts",
      type: "ts",
      content: `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
});
`,
    });
  }

  if (!has(files, "postcss.config.js")) {
    upsert(files, {
      path: "postcss.config.js",
      type: "ts",
      content: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`,
    });
  }

  if (!has(files, "tailwind.config.ts")) {
    upsert(files, {
      path: "tailwind.config.ts",
      type: "ts",
      content: `import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
`,
    });
  }

  if (!has(files, "tsconfig.json")) {
    upsert(files, {
      path: "tsconfig.json",
      type: "json",
      content: JSON.stringify(
        {
          compilerOptions: {
            target: "ES2020",
            useDefineForClassFields: true,
            lib: ["ES2020", "DOM", "DOM.Iterable"],
            module: "ESNext",
            skipLibCheck: true,
            moduleResolution: "Bundler",
            resolveJsonModule: true,
            isolatedModules: true,
            noEmit: true,
            jsx: "react-jsx",
            strict: true,
            baseUrl: ".",
            paths: { "@/*": ["src/*"] },
          },
          include: ["src"],
          references: [{ path: "./tsconfig.node.json" }],
        },
        null,
        2
      ),
    });
  }

  if (!has(files, "tsconfig.node.json")) {
    upsert(files, {
      path: "tsconfig.node.json",
      type: "json",
      content: JSON.stringify(
        {
          compilerOptions: {
            composite: true,
            skipLibCheck: true,
            module: "ESNext",
            moduleResolution: "Bundler",
            allowSyntheticDefaultImports: true,
          },
          include: ["vite.config.ts"],
        },
        null,
        2
      ),
    });
  }

  // Core src files
  if (!has(files, "src/main.tsx")) {
    upsert(files, {
      path: "src/main.tsx",
      type: "tsx",
      content: `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
    });
  }

  if (!has(files, "src/index.css")) {
    upsert(files, {
      path: "src/index.css",
      type: "css",
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;
`,
    });
  }

  if (!has(files, "src/vite-env.d.ts")) {
    upsert(files, {
      path: "src/vite-env.d.ts",
      type: "ts",
      content: `/// <reference types="vite/client" />
`,
    });
  }

  return files;
}
