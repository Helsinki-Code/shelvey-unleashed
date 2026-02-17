import { motion } from 'framer-motion';
import { Eye, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileTree } from './FileTree';
import { CodeEditor } from './CodeEditor';
import { SandboxPreview } from './SandboxPreview';
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
  const appFile = files.find(
    (f) => f.path === 'src/App.tsx' || f.path === 'App.tsx'
  );
  const previewCode = appFile?.content || '';
  const hasFiles = files.length > 0;

  const viewportHeights: Record<string, string> = {
    desktop: '100%',
    tablet: '1024px',
    mobile: '667px',
  };

  if (viewMode === 'code') {
    return (
      <div className="h-full flex overflow-hidden">
        {/* File tree sidebar */}
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

        {/* Code editor */}
        <div className="flex-1 overflow-hidden">
          <CodeEditor
            code={
              currentFileContent || '// Select a file to view its contents'
            }
            language={
              selectedFile?.endsWith('.css') ? 'css' : 'typescript'
            }
            filename={selectedFile || undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Preview toolbar */}
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

      {/* Preview area */}
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
              height: viewportHeights[viewport],
            }}
          >
            <SandboxPreview
              key={refreshKey}
              code={previewCode}
              files={files}
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