import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Buffer } from "node:buffer";
import { Sandbox } from "npm:@vercel/sandbox@1.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Runtime = "node22" | "node24";

interface ProjectFileInput {
  path: string;
  content: string;
  type?: string;
  fileType?: string;
}

async function ensureDependenciesInstalled(sandbox: Sandbox) {
  const hasNodeModules = await sandbox.runCommand({
    cmd: "sh",
    args: ["-lc", "test -d /vercel/sandbox/project/node_modules"],
  });

  if (hasNodeModules.exitCode === 0) return;

  const install = await sandbox.runCommand({
    cmd: "npm",
    args: ["install", "--silent", "--no-audit", "--no-fund"],
    cwd: "/vercel/sandbox/project",
  });

  if (install.exitCode !== 0) {
    throw new Error(`npm install failed: ${await install.stderr()}`);
  }
}

async function ensureDevServerRunning(sandbox: Sandbox) {
  const probe = await sandbox.runCommand({
    cmd: "sh",
    args: ["-lc", "pgrep -f 'vite --host 0.0.0.0 --port 5173|npm run dev' >/dev/null"],
  });

  if (probe.exitCode === 0) return;

  await sandbox.runCommand({
    cmd: "npm",
    args: ["run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"],
    cwd: "/vercel/sandbox/project",
    detached: true,
  });
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeFilePath(path: string) {
  return String(path).replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/^\/+/, "");
}

function getCredentials() {
  const token = Deno.env.get("VERCEL_SANDBOX_TOKEN") || Deno.env.get("VERCEL_TOKEN") || Deno.env.get("VERCEL_API_TOKEN");
  const teamId = Deno.env.get("VERCEL_SANDBOX_TEAM_ID") || Deno.env.get("VERCEL_TEAM_ID");
  const projectId = Deno.env.get("VERCEL_SANDBOX_PROJECT_ID") || Deno.env.get("VERCEL_PROJECT_ID");

  if (!token || !teamId || !projectId) {
    throw new Error(
      "Missing Vercel Sandbox credentials. Configure VERCEL_SANDBOX_TOKEN (or VERCEL_API_TOKEN), VERCEL_SANDBOX_TEAM_ID, and VERCEL_SANDBOX_PROJECT_ID.",
    );
  }

  return { token, teamId, projectId };
}

function ensureMinimumViteFiles(files: ProjectFileInput[]): ProjectFileInput[] {
  const normalized = files.map((f) => ({
    ...f,
    path: normalizeFilePath(f.path),
  }));

  const has = (p: string) => normalized.some((f) => f.path === p);

  if (!has("package.json")) {
    normalized.push({
      path: "package.json",
      content: JSON.stringify(
        {
          name: "sandbox-preview",
          private: true,
          version: "0.0.0",
          scripts: {
            dev: "vite --host 0.0.0.0 --port 5173",
            build: "vite build",
          },
          dependencies: {
            react: "^18.3.1",
            "react-dom": "^18.3.1",
            "lucide-react": "^0.462.0",
            "framer-motion": "^12.23.25",
          },
          devDependencies: {
            vite: "^5.4.19",
            "@vitejs/plugin-react-swc": "^3.11.0",
            typescript: "^5.8.3",
            "@types/react": "^18.3.23",
            "@types/react-dom": "^18.3.7",
            tailwindcss: "^3.4.17",
            postcss: "^8.5.6",
            autoprefixer: "^10.4.21",
          },
        },
        null,
        2,
      ),
    });
  }

  if (!has("index.html")) {
    normalized.push({
      path: "index.html",
      content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vercel Sandbox Preview</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
    });
  }

  if (!has("src/main.tsx")) {
    normalized.push({
      path: "src/main.tsx",
      content: `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
    });
  }

  if (!has("src/App.tsx") && !has("App.tsx")) {
    normalized.push({
      path: "src/App.tsx",
      content: `export default function App() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Sandbox Preview Ready</h1>
      <p>Your generated app files are syncing now.</p>
    </main>
  );
}`,
    });
  }

  return normalized;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRole) throw new Error("Supabase env is missing");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ success: false, error: "Missing Authorization header" }, 401);

    const userClient = createClient(supabaseUrl, serviceRole, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const body = await req.json();
    const action = String(body?.action || "");
    const credentials = getCredentials();

    if (action === "provision_preview") {
      const filesRaw = Array.isArray(body?.files) ? (body.files as ProjectFileInput[]) : [];
      const runtime = (body?.runtime as Runtime) || "node24";
      const timeoutMs = Number(body?.timeoutMs || 30 * 60 * 1000);
      const files = ensureMinimumViteFiles(filesRaw);

      const sandbox = await Sandbox.create({
        token: credentials.token,
        teamId: credentials.teamId,
        projectId: credentials.projectId,
        runtime,
        ports: [5173],
        timeout: timeoutMs,
      });

      const writeBatch = files.map((f) => ({
        path: `project/${normalizeFilePath(f.path)}`,
        content: Buffer.from(String(f.content || ""), "utf8"),
      }));
      await sandbox.writeFiles(writeBatch);

      await ensureDependenciesInstalled(sandbox);
      await ensureDevServerRunning(sandbox);

      return jsonResponse({
        success: true,
        sandboxId: sandbox.sandboxId,
        previewUrl: sandbox.domain(5173),
        status: sandbox.status,
        timeout: sandbox.timeout,
      });
    }

    if (action === "update_files") {
      const sandboxId = String(body?.sandboxId || "");
      if (!sandboxId) return jsonResponse({ success: false, error: "sandboxId is required" }, 400);

      const filesRaw = Array.isArray(body?.files) ? (body.files as ProjectFileInput[]) : [];
      const files = ensureMinimumViteFiles(filesRaw);

      const sandbox = await Sandbox.get({
        sandboxId,
        token: credentials.token,
        teamId: credentials.teamId,
        projectId: credentials.projectId,
      });

      const writeBatch = files.map((f) => ({
        path: `project/${normalizeFilePath(f.path)}`,
        content: Buffer.from(String(f.content || ""), "utf8"),
      }));
      await sandbox.writeFiles(writeBatch);
      await ensureDependenciesInstalled(sandbox);
      await ensureDevServerRunning(sandbox);

      return jsonResponse({
        success: true,
        sandboxId: sandbox.sandboxId,
        status: sandbox.status,
        previewUrl: sandbox.domain(5173),
      });
    }

    if (action === "get_status") {
      const sandboxId = String(body?.sandboxId || "");
      if (!sandboxId) return jsonResponse({ success: false, error: "sandboxId is required" }, 400);

      const sandbox = await Sandbox.get({
        sandboxId,
        token: credentials.token,
        teamId: credentials.teamId,
        projectId: credentials.projectId,
      });
      await ensureDependenciesInstalled(sandbox);
      await ensureDevServerRunning(sandbox);

      const previewUrl = sandbox.routes.find((r) => r.port === 5173)?.url || sandbox.domain(5173);
      return jsonResponse({
        success: true,
        sandboxId: sandbox.sandboxId,
        status: sandbox.status,
        previewUrl,
        timeout: sandbox.timeout,
        createdAt: sandbox.createdAt,
      });
    }

    if (action === "stop") {
      const sandboxId = String(body?.sandboxId || "");
      if (!sandboxId) return jsonResponse({ success: false, error: "sandboxId is required" }, 400);

      const sandbox = await Sandbox.get({
        sandboxId,
        token: credentials.token,
        teamId: credentials.teamId,
        projectId: credentials.projectId,
      });
      await sandbox.stop();

      return jsonResponse({ success: true, sandboxId });
    }

    return jsonResponse({ success: false, error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error("[vercel-sandbox-preview] error:", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});
