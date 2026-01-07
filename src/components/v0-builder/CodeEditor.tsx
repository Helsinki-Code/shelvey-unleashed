import { useEffect, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface CodeEditorProps {
  code: string;
  language?: string;
  filename?: string;
}

export function CodeEditor({ code, language = 'typescript', filename }: CodeEditorProps) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Map file extensions to languages
  const getLanguage = (filename?: string): string => {
    if (!filename) return language;
    if (filename.endsWith('.tsx') || filename.endsWith('.ts')) return 'typescript';
    if (filename.endsWith('.jsx') || filename.endsWith('.js')) return 'javascript';
    if (filename.endsWith('.css')) return 'css';
    if (filename.endsWith('.json')) return 'json';
    if (filename.endsWith('.html')) return 'html';
    return language;
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] dark:bg-[#0d0d0d]">
      {/* Header */}
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/20 bg-[#252526]">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileCode className="h-4 w-4" />
            <span className="text-sm font-mono">{filename}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>
      )}

      {/* Code */}
      <div className="flex-1 overflow-auto">
        <SyntaxHighlighter
          language={getLanguage(filename)}
          style={oneDark}
          showLineNumbers
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: '13px',
            lineHeight: '1.5',
            minHeight: '100%',
          }}
          lineNumberStyle={{
            minWidth: '3em',
            paddingRight: '1em',
            color: '#6b7280',
            userSelect: 'none',
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
