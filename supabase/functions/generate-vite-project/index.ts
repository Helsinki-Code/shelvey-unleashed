import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerationRequest {
  projectId: string;
  businessName: string;
  industry: string;
  description: string;
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    logo?: string;
  };
  approvedSpecs?: any;
  prompt?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const encoder = new TextEncoder();
  
  const sendSSE = (controller: ReadableStreamDefaultController, data: any) => {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(encoder.encode(message));
  };

  try {
    const V0_API_KEY = Deno.env.get('V0_API_KEY');
    if (!V0_API_KEY) {
      throw new Error('V0_API_KEY is not configured');
    }

    const body: GenerationRequest = await req.json();
    const { projectId, businessName, industry, description, branding, approvedSpecs, prompt } = body;

    // Extract brand colors
    const primaryColor = branding?.primaryColor || approvedSpecs?.globalStyles?.primaryColor || '#3B82F6';
    const secondaryColor = branding?.secondaryColor || approvedSpecs?.globalStyles?.secondaryColor || '#8B5CF6';
    const accentColor = branding?.accentColor || approvedSpecs?.globalStyles?.accentColor || '#F59E0B';
    const logoUrl = branding?.logo || approvedSpecs?.brandAssets?.logoUrl;

    // Get pages from specs
    const pages = approvedSpecs?.pages || [
      { name: 'Home', route: '/', sections: ['Hero', 'Features', 'About', 'Testimonials', 'CTA', 'Footer'] },
      { name: 'About', route: '/about', sections: ['Hero', 'Story', 'Team', 'Values', 'Footer'] },
      { name: 'Contact', route: '/contact', sections: ['Hero', 'ContactForm', 'Map', 'Footer'] },
    ];

    const stream = new ReadableStream({
      async start(controller) {
        try {
          sendSSE(controller, { type: 'status', message: '📦 Creating Vite project structure...' });

          // Generate the project files
          const files: { path: string; content: string; fileType: string }[] = [];

          // 1. package.json
          sendSSE(controller, { type: 'status', message: '📄 Generating package.json...' });
          files.push({
            path: 'package.json',
            content: JSON.stringify({
              name: businessName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
              private: true,
              version: '0.0.1',
              type: 'module',
              scripts: {
                dev: 'vite',
                build: 'tsc && vite build',
                preview: 'vite preview',
              },
              dependencies: {
                react: '^18.2.0',
                'react-dom': '^18.2.0',
                'react-router-dom': '^6.20.0',
                'framer-motion': '^10.16.0',
                'lucide-react': '^0.290.0',
              },
              devDependencies: {
                '@types/react': '^18.2.0',
                '@types/react-dom': '^18.2.0',
                '@vitejs/plugin-react': '^4.2.0',
                autoprefixer: '^10.4.16',
                postcss: '^8.4.31',
                tailwindcss: '^3.3.5',
                typescript: '^5.2.2',
                vite: '^5.0.0',
              },
            }, null, 2),
            fileType: 'config',
          });
          sendSSE(controller, { type: 'file_complete', path: 'package.json', content: files[files.length - 1].content, fileType: 'config' });

          // 2. vite.config.ts
          sendSSE(controller, { type: 'status', message: '⚙️ Generating vite.config.ts...' });
          files.push({
            path: 'vite.config.ts',
            content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})`,
            fileType: 'config',
          });
          sendSSE(controller, { type: 'file_complete', path: 'vite.config.ts', content: files[files.length - 1].content, fileType: 'config' });

          // 3. tailwind.config.js
          sendSSE(controller, { type: 'status', message: '🎨 Generating Tailwind config...' });
          files.push({
            path: 'tailwind.config.js',
            content: `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '${primaryColor}',
        secondary: '${secondaryColor}',
        accent: '${accentColor}',
      },
    },
  },
  plugins: [],
}`,
            fileType: 'config',
          });
          sendSSE(controller, { type: 'file_complete', path: 'tailwind.config.js', content: files[files.length - 1].content, fileType: 'config' });

          // 4. index.html
          sendSSE(controller, { type: 'status', message: '📄 Generating index.html...' });
          files.push({
            path: 'index.html',
            content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${businessName}</title>
    <meta name="description" content="${description}" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
            fileType: 'config',
          });
          sendSSE(controller, { type: 'file_complete', path: 'index.html', content: files[files.length - 1].content, fileType: 'config' });

          // 5. src/main.tsx
          sendSSE(controller, { type: 'status', message: '⚛️ Generating main.tsx...' });
          files.push({
            path: 'src/main.tsx',
            content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)`,
            fileType: 'component',
          });
          sendSSE(controller, { type: 'file_complete', path: 'src/main.tsx', content: files[files.length - 1].content, fileType: 'component' });

          // 6. src/index.css
          sendSSE(controller, { type: 'status', message: '🎨 Generating styles...' });
          files.push({
            path: 'src/index.css',
            content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --primary: ${primaryColor};
  --secondary: ${secondaryColor};
  --accent: ${accentColor};
}

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}`,
            fileType: 'style',
          });
          sendSSE(controller, { type: 'file_complete', path: 'src/index.css', content: files[files.length - 1].content, fileType: 'style' });

          // 7. Generate App.tsx with React Router
          sendSSE(controller, { type: 'status', message: '🔄 Generating App with routing...' });
          const routeImports = pages.map((p: any) => `import ${p.name.replace(/\s+/g, '')}Page from './pages/${p.name.replace(/\s+/g, '')}'`).join('\n');
          const routes = pages.map((p: any) => `<Route path="${p.route}" element={<${p.name.replace(/\s+/g, '')}Page />} />`).join('\n          ');

          files.push({
            path: 'src/App.tsx',
            content: `import { Routes, Route } from 'react-router-dom'
${routeImports}
import Layout from './components/Layout'

function App() {
  return (
    <Layout>
      <Routes>
        ${routes}
      </Routes>
    </Layout>
  )
}

export default App`,
            fileType: 'component',
          });
          sendSSE(controller, { type: 'file_complete', path: 'src/App.tsx', content: files[files.length - 1].content, fileType: 'component' });

          // 8. Generate Layout component
          sendSSE(controller, { type: 'status', message: '🏗️ Generating Layout component...' });
          const navLinks = pages.map((p: any) => `<Link to="${p.route}" className="hover:text-primary transition">${p.name}</Link>`).join('\n            ');
          
          files.push({
            path: 'src/components/Layout.tsx',
            content: `import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <nav className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold">${businessName}</Link>
          <div className="flex items-center gap-6">
            ${navLinks}
          </div>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>&copy; ${new Date().getFullYear()} ${businessName}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}`,
            fileType: 'component',
          });
          sendSSE(controller, { type: 'file_complete', path: 'src/components/Layout.tsx', content: files[files.length - 1].content, fileType: 'component' });

          // 9. Generate each page using v0 API
          for (const page of pages) {
            sendSSE(controller, { type: 'status', message: `🎨 Generating ${page.name} page with v0...` });
            
            const pagePrompt = `Create a modern, production-ready React page component for a ${industry} business called "${businessName}".

Page: ${page.name}
Route: ${page.route}
Sections: ${(page.sections || []).join(', ')}
Description: ${description}

Use these brand colors:
- Primary: ${primaryColor}
- Secondary: ${secondaryColor}
- Accent: ${accentColor}

Requirements:
1. Use Tailwind CSS with arbitrary values for exact hex colors
2. Use framer-motion for smooth animations
3. Use lucide-react for icons
4. Make it fully responsive
5. Include beautiful gradients and shadows
6. Export as default function

Only output the React component code, no explanations.`;

            try {
              const v0Response = await fetch('https://api.v0.dev/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${V0_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'v0-1.5-md',
                  messages: [{ role: 'user', content: pagePrompt }],
                  stream: false,
                  max_completion_tokens: 8000,
                }),
              });

              if (!v0Response.ok) {
                throw new Error(`v0 API error: ${v0Response.status}`);
              }

              const v0Data = await v0Response.json();
              let pageCode = v0Data.choices?.[0]?.message?.content || '';
              
              // Clean up code
              const codeBlockMatch = pageCode.match(/```(?:tsx?|jsx?)?\s*\n([\s\S]*?)```/);
              if (codeBlockMatch) {
                pageCode = codeBlockMatch[1].trim();
              }

              files.push({
                path: `src/pages/${page.name.replace(/\s+/g, '')}.tsx`,
                content: pageCode,
                fileType: 'page',
              });
              sendSSE(controller, { 
                type: 'file_complete', 
                path: `src/pages/${page.name.replace(/\s+/g, '')}.tsx`, 
                content: pageCode, 
                fileType: 'page' 
              });

            } catch (error) {
              console.error(`Error generating ${page.name}:`, error);
              // Create fallback page
              files.push({
                path: `src/pages/${page.name.replace(/\s+/g, '')}.tsx`,
                content: `export default function ${page.name.replace(/\s+/g, '')}Page() {
  return (
    <div className="py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-4">${page.name}</h1>
        <p className="text-gray-600">${description}</p>
      </div>
    </div>
  )
}`,
                fileType: 'page',
              });
              sendSSE(controller, { 
                type: 'file_complete', 
                path: `src/pages/${page.name.replace(/\s+/g, '')}.tsx`, 
                content: files[files.length - 1].content, 
                fileType: 'page' 
              });
            }
          }

          // 10. TypeScript config
          sendSSE(controller, { type: 'status', message: '📝 Generating TypeScript config...' });
          files.push({
            path: 'tsconfig.json',
            content: JSON.stringify({
              compilerOptions: {
                target: 'ES2020',
                useDefineForClassFields: true,
                lib: ['ES2020', 'DOM', 'DOM.Iterable'],
                module: 'ESNext',
                skipLibCheck: true,
                moduleResolution: 'bundler',
                allowImportingTsExtensions: true,
                resolveJsonModule: true,
                isolatedModules: true,
                noEmit: true,
                jsx: 'react-jsx',
                strict: true,
                noUnusedLocals: true,
                noUnusedParameters: true,
                noFallthroughCasesInSwitch: true,
                baseUrl: '.',
                paths: {
                  '@/*': ['./src/*'],
                },
              },
              include: ['src'],
              references: [{ path: './tsconfig.node.json' }],
            }, null, 2),
            fileType: 'config',
          });
          sendSSE(controller, { type: 'file_complete', path: 'tsconfig.json', content: files[files.length - 1].content, fileType: 'config' });

          files.push({
            path: 'tsconfig.node.json',
            content: JSON.stringify({
              compilerOptions: {
                composite: true,
                skipLibCheck: true,
                module: 'ESNext',
                moduleResolution: 'bundler',
                allowSyntheticDefaultImports: true,
              },
              include: ['vite.config.ts'],
            }, null, 2),
            fileType: 'config',
          });
          sendSSE(controller, { type: 'file_complete', path: 'tsconfig.node.json', content: files[files.length - 1].content, fileType: 'config' });

          // PostCSS config
          files.push({
            path: 'postcss.config.js',
            content: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,
            fileType: 'config',
          });
          sendSSE(controller, { type: 'file_complete', path: 'postcss.config.js', content: files[files.length - 1].content, fileType: 'config' });

          // Complete
          sendSSE(controller, { type: 'complete', message: 'Project generated successfully!', files });
          sendSSE(controller, { type: '[DONE]' });
          controller.close();

        } catch (error) {
          console.error('Generation error:', error);
          sendSSE(controller, { type: 'error', message: error instanceof Error ? error.message : 'Generation failed' });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
