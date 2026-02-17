import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CodeEditorProps {
  code: string;
  language?: string;
  filename?: string;
}

const LANG_MAP: Record<string, string> = {
  tsx: 'typescript',
  ts: 'typescript',
  jsx: 'javascript',
  js: 'javascript',
  css: 'css',
  json: 'json',
  html: 'html',
};

export function CodeEditor({
  code,
  language = 'typescript',
  filename,
}: CodeEditorProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resolvedLanguage = filename
    ? LANG_MAP[filename.split('.').pop() || ''] || language
    : language;

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      {/* Header */}
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#252526] shrink-0">
          <div className="flex items-center gap-2 text-neutral-400 min-w-0">
            <FileCode className="h-4 w-4 shrink-0" />
            <span className="text-sm font-mono truncate">{filename}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className={cn(
              'h-7 text-xs shrink-0',
              'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            )}
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

      {/* Code area */}
      <div className="flex-1 overflow-auto">
        <SyntaxHighlighter
          language={resolvedLanguage}
          style={oneDark}
          showLineNumbers
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: '13px',
            lineHeight: '1.6',
            minHeight: '100%',
          }}
          lineNumberStyle={{
            minWidth: '3em',
            paddingRight: '1em',
            color: '#4b5563',
            userSelect: 'none',
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}