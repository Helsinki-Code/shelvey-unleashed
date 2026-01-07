import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Code, FolderTree, Monitor, Tablet, Smartphone, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileTree } from './FileTree';
import { CodeEditor } from './CodeEditor';
import { SandboxPreview } from './SandboxPreview';
import { cn } from '@/lib/utils';
import type { ProjectFile } from './V0Builder';

type ViewportSize = 'desktop' | 'tablet' | 'mobile';

interface PreviewPanelProps {
  files: ProjectFile[];
  selectedFile: string | null;
  onSelectFile: (path: string | null) => void;
  currentFileContent?: string;
}

export function PreviewPanel({
  files,
  selectedFile,
  onSelectFile,
  currentFileContent,
}: PreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'files'>('preview');
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [refreshKey, setRefreshKey] = useState(0);

  const viewportSizes: Record<ViewportSize, { width: string; label: string }> = {
    desktop: { width: '100%', label: 'Desktop' },
    tablet: { width: '768px', label: 'Tablet' },
    mobile: { width: '375px', label: 'Mobile' },
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Get the main App.tsx content for preview
  const appFile = files.find(f => f.path === 'src/App.tsx' || f.path === 'App.tsx');
  const previewCode = appFile?.content || '';

  return (
    <div className="h-full flex flex-col bg-muted/20">
      {/* Preview Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/50">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="h-8">
            <TabsTrigger value="preview" className="text-xs gap-1.5 h-7 px-3">
              <Eye className="h-3.5 w-3.5" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="code" className="text-xs gap-1.5 h-7 px-3">
              <Code className="h-3.5 w-3.5" />
              Code
            </TabsTrigger>
            <TabsTrigger value="files" className="text-xs gap-1.5 h-7 px-3">
              <FolderTree className="h-3.5 w-3.5" />
              Files
              {files.length > 0 && (
                <span className="ml-1 text-[10px] bg-primary/20 text-primary px-1.5 rounded-full">
                  {files.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === 'preview' && (
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted rounded-lg p-0.5">
              {(['desktop', 'tablet', 'mobile'] as ViewportSize[]).map((size) => (
                <Button
                  key={size}
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewport(size)}
                  className={cn(
                    "h-7 w-7 rounded-md",
                    viewport === size && "bg-background shadow-sm"
                  )}
                >
                  {size === 'desktop' && <Monitor className="h-3.5 w-3.5" />}
                  {size === 'tablet' && <Tablet className="h-3.5 w-3.5" />}
                  {size === 'mobile' && <Smartphone className="h-3.5 w-3.5" />}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              className="h-7 w-7"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'preview' && (
          <div className="h-full flex items-start justify-center p-4 bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
            <motion.div
              key={viewport}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              style={{ width: viewportSizes[viewport].width, maxWidth: '100%' }}
              className="h-full bg-background rounded-lg shadow-xl border border-border overflow-hidden"
            >
              {files.length > 0 ? (
                <SandboxPreview 
                  key={refreshKey}
                  code={previewCode}
                  files={files}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Eye className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Start a conversation to generate your website</p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {activeTab === 'code' && (
          <div className="h-full flex">
            {/* File sidebar */}
            <div className="w-48 border-r border-border bg-background/50">
              <ScrollArea className="h-full">
                <FileTree
                  files={files}
                  selectedFile={selectedFile}
                  onSelectFile={onSelectFile}
                />
              </ScrollArea>
            </div>
            {/* Code editor */}
            <div className="flex-1">
              <CodeEditor
                code={currentFileContent || '// Select a file to view its contents'}
                language={selectedFile?.endsWith('.tsx') || selectedFile?.endsWith('.ts') ? 'typescript' : 'css'}
                filename={selectedFile || undefined}
              />
            </div>
          </div>
        )}

        {activeTab === 'files' && (
          <ScrollArea className="h-full">
            <div className="p-4">
              <FileTree
                files={files}
                selectedFile={selectedFile}
                onSelectFile={(path) => {
                  onSelectFile(path);
                  setActiveTab('code');
                }}
                expanded
              />
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
