import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  File,
  FolderOpen,
  Folder,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectFile } from './V0Builder';

interface FileTreeProps {
  files: ProjectFile[];
  selectedFile: string | null;
  onSelectFile: (path: string | null) => void;
  expanded?: boolean;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
  file?: ProjectFile;
}

function buildTree(files: ProjectFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  files.forEach((file) => {
    const parts = file.path.split('/');
    let current = root;

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      const existing = current.find((n) => n.name === part);

      if (existing) {
        if (!isFile && existing.children) {
          current = existing.children;
        }
      } else {
        const newNode: TreeNode = {
          name: part,
          path: parts.slice(0, index + 1).join('/'),
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : [],
          file: isFile ? file : undefined,
        };
        current.push(newNode);
        if (!isFile && newNode.children) {
          current = newNode.children;
        }
      }
    });
  });

  return root;
}

const FILE_ICONS: Record<string, string> = {
  tsx: '⚛️',
  ts: '📘',
  css: '🎨',
  json: '📋',
  html: '🌐',
};

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop() || '';
  return FILE_ICONS[ext] || '📄';
}

interface TreeItemProps {
  node: TreeNode;
  selectedFile: string | null;
  onSelectFile: (path: string | null) => void;
  depth: number;
  defaultExpanded?: boolean;
}

function TreeItem({
  node,
  selectedFile,
  onSelectFile,
  depth,
  defaultExpanded,
}: TreeItemProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded ?? depth < 2);
  const isSelected = selectedFile === node.path;
  const paddingLeft = `${depth * 12 + 8}px`;

  if (node.type === 'file') {
    return (
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => onSelectFile(node.path)}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-md text-sm transition-colors',
          isSelected
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
        style={{ paddingLeft }}
      >
        <span className="text-xs shrink-0">{getFileIcon(node.name)}</span>
        <span className="truncate">{node.name}</span>
      </motion.button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-md text-sm transition-colors text-foreground hover:bg-muted/50"
        style={{ paddingLeft }}
      >
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        {isOpen ? (
          <FolderOpen className="h-4 w-4 text-primary shrink-0" />
        ) : (
          <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="truncate font-medium">{node.name}</span>
      </button>

      <AnimatePresence>
        {isOpen && node.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <TreeItem
                key={child.path}
                node={child}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
                depth={depth + 1}
                defaultExpanded={defaultExpanded}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FileTree({
  files,
  selectedFile,
  onSelectFile,
  expanded,
}: FileTreeProps) {
  const tree = buildTree(files);

  if (files.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        <File className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p>No files generated yet</p>
      </div>
    );
  }

  return (
    <div className="py-1.5 px-1">
      {tree.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          selectedFile={selectedFile}
          onSelectFile={onSelectFile}
          depth={0}
          defaultExpanded={expanded}
        />
      ))}
    </div>
  );
}