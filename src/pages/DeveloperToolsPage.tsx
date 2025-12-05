import { Helmet } from 'react-helmet-async';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CodeGeneratorPanel } from '@/components/CodeGeneratorPanel';
import { ShellExecutorPanel } from '@/components/ShellExecutorPanel';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Code, Terminal, Wrench } from 'lucide-react';

const DeveloperToolsPage = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <>
      <Helmet>
        <title>Developer Tools | ShelVey</title>
        <meta name="description" content="AI-powered code generation, shell execution, and developer tools" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="container mx-auto px-4 py-8 pt-24">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                <Wrench className="h-10 w-10 text-primary" />
                <h1 className="text-4xl font-bold">Developer Tools</h1>
              </div>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                AI-powered code generation with patch management and secure shell execution 
                with approval workflows for dangerous operations
              </p>
            </div>

            {/* Tools Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Code Generation</h2>
                </div>
                <CodeGeneratorPanel />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Shell Executor</h2>
                </div>
                <ShellExecutorPanel />
              </div>
            </div>

            {/* Info Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-border bg-card/50 backdrop-blur">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Code className="h-4 w-4 text-primary" />
                  Code Generation
                </h3>
                <p className="text-sm text-muted-foreground">
                  Generate TypeScript/React code from natural language descriptions. 
                  All generated code is tracked as patches for easy management.
                </p>
              </div>
              
              <div className="p-4 rounded-lg border border-border bg-card/50 backdrop-blur">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-primary" />
                  Approval Workflow
                </h3>
                <p className="text-sm text-muted-foreground">
                  High-risk shell commands (rm -rf, sudo, etc.) require explicit 
                  approval before execution, preventing accidental damage.
                </p>
              </div>
              
              <div className="p-4 rounded-lg border border-border bg-card/50 backdrop-blur">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-primary" />
                  Audit Trail
                </h3>
                <p className="text-sm text-muted-foreground">
                  All code patches and shell commands are logged with full audit 
                  trail including timestamps, status, and outputs.
                </p>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default DeveloperToolsPage;
