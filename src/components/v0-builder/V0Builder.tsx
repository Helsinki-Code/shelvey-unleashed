import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PanelLeftClose, PanelLeft, Rocket, Download, Sparkles,
  Globe, Wand2, Code, Layout, Loader2, CheckCircle2,
  FileCode, Layers, Monitor, Tablet, Smartphone, RefreshCw,
  Send, MessageSquare, X, Plus, Maximize2, Minimize2, GripVertical,
  ChevronLeft, ChevronRight, History, FileText, FolderOpen,
  Play, Pause, RotateCcw, Share2, Settings, Trash2, Edit3,
  Check, Copy, ExternalLink, Zap, Eye, Box, Search, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SandboxPreview } from './SandboxPreview';

export interface ProjectFile {
  path: string;
  content: string;
  type: 'tsx' | 'ts' | 'css' | 'json' | 'html';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  files?: ProjectFile[];
  isStreaming?: boolean;
  timestamp: Date;
}

export interface Chat {
  id: string;
  name?: string;
  messages?: Message[];
  createdAt: string;
  updatedAt: string;
}

interface V0BuilderProps {
  projectId: string;
  project: { name: string; industry: string; description: string };
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    logo?: string;
    headingFont?: string;
    bodyFont?: string;
  };
  approvedSpecs?: any;
  onDeploymentComplete?: (url: string) => void;
}

type ViewMode = 'preview' | 'code';
type Viewport = 'desktop' | 'tablet' | 'mobile';

// Shelvey branding colors
const SHELVEY_PRIMARY = '#16a34a'; // Green
const SHELVEY_SECONDARY = '#0f766e'; // Teal
const SHELVEY_ACCENT = '#0ea5e9'; // Sky blue

export function V0Builder({
  projectId, project, branding, approvedSpecs, onDeploymentComplete,
}: V0BuilderProps) {
  // Core state
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  
  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [leftPanelWidth, setLeftPanelWidth] = useState(38);
  const [rightPanelWidth, setRightPanelWidth] = useState(38);
  const [activePanel, setActivePanel] = useState<'files' | 'chat' | 'preview'>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const projectFilesRef = useRef<ProjectFile[]>([]);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  
  // Computed values
  const currentChat = useMemo(() => 
    chats.find(c => c.id === currentChatId), 
    [chats, currentChatId]
  );
  
  const currentFile = useMemo(() => 
    projectFiles.find(f => f.path === selectedFile),
    [projectFiles, selectedFile]
  );
  
  const filteredChats = useMemo(() => {
    if (!searchQuery) return chats;
    return chats.filter(chat => 
      chat.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.messages?.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [chats, searchQuery]);
  
  // Brand theme
  const brandTheme = useMemo(() => {
    const primary = branding?.primaryColor || SHELVEY_PRIMARY;
    const secondary = branding?.secondaryColor || SHELVEY_SECONDARY;
    const accent = branding?.accentColor || SHELVEY_ACCENT;
    
    const hexToRgba = (hex: string, alpha = 1) => {
      const clean = hex.replace('#', '').trim();
      const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
      const int = Number.parseInt(full, 16);
      if (Number.isNaN(int)) return `rgba(34, 197, 94, ${alpha})`;
      const r = (int >> 16) & 255;
      const g = (int >> 8) & 255;
      const b = int & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    return {
      primary,
      secondary,
      accent,
      panelBg: `linear-gradient(140deg, ${hexToRgba(primary, 0.08)} 0%, ${hexToRgba(secondary, 0.06)} 45%, ${hexToRgba(accent, 0.05)} 100%)`,
      panelBorder: hexToRgba(primary, 0.2),
      softGlow: `0 0 0 1px ${hexToRgba(primary, 0.15)}, 0 8px 24px ${hexToRgba(primary, 0.1)}`,
      gradientText: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
    };
  }, [branding]);
  
  // Load saved chats on mount
  useEffect(() => {
    loadChats();
    loadSavedFiles();
  }, [projectId]);
  
  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Handle window resize
  useEffect(() => {
    const onResize = () => setIsMobileLayout(window.innerWidth < 1024);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  
  // Load chats from database
  const loadChats = async () => {
    try {
      const { data } = await supabase
        .from('v0_chats')
        .select('*')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false });
      
      if (data) {
        const loadedChats: Chat[] = data.map(c => ({
          id: c.id,
          name: c.name,
          messages: c.messages || [],
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        }));
        setChats(loadedChats);
        if (loadedChats.length > 0 && !currentChatId) {
          setCurrentChatId(loadedChats[0].id);
          setMessages(loadedChats[0].messages || []);
        }
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  };
  
  // Load saved files from database
  const loadSavedFiles = async () => {
    try {
      const { data } = await supabase
        .from('website_pages')
        .select('page_name, page_code, page_route')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      
      if (data && data.length > 0) {
        const loaded: ProjectFile[] = data.map(p => ({
          path: p.page_name,
          content: p.page_code || '',
          type: (p.page_name.endsWith('.css') ? 'css' : p.page_name.endsWith('.json') ? 'json' : 'tsx') as ProjectFile['type'],
        }));
        setProjectFiles(loaded);
        setSelectedFile(loaded[0]?.path || null);
      }
    } catch (error) {
      console.error('Failed to load saved files:', error);
    }
  };
  
  // Save chat to database
  const saveChat = useCallback(async (chatId: string, messagesToSave: Message[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const firstUserMessage = messagesToSave.find(m => m.role === 'user');
      const chatName = firstUserMessage?.content.slice(0, 50) || 'Untitled Chat';
      
      await supabase
        .from('v0_chats')
        .upsert({
          id: chatId,
          project_id: projectId,
          user_id: user.id,
          name: chatName,
          messages: messagesToSave,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
    } catch (error) {
      console.error('Failed to save chat:', error);
    }
  }, [projectId]);
  
  // Save files to database
  const saveFilesToDB = useCallback(async (files: ProjectFile[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const rows = files.map((file) => ({
        project_id: projectId,
        user_id: user.id,
        page_name: file.path,
        page_code: file.content,
        page_route: '/' + file.path.replace(/^src\//, '').replace(/\.(tsx|ts|css|json|html)$/, ''),
        status: 'generated',
        updated_at: new Date().toISOString(),
      }));
      
      await supabase
        .from('website_pages')
        .upsert(rows, { onConflict: 'project_id,user_id,page_name', ignoreDuplicates: false });
    } catch (error) {
      console.error('Failed to save files:', error);
    }
  }, [projectId]);
  
  // Create new chat
  const createNewChat = useCallback(() => {
    const newChatId = crypto.randomUUID();
    const newChat: Chat = {
      id: newChatId,
      name: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setChats([newChat, ...chats]);
    setCurrentChatId(newChatId);
    setMessages([]);
    setShowHistory(false);
  }, [chats]);
  
  // Delete chat
  const deleteChat = useCallback(async (chatId: string) => {
    setChats(prev => prev.filter(c => c.id !== chatId));
    if (currentChatId === chatId) {
      const remaining = chats.filter(c => c.id !== chatId);
      if (remaining.length > 0) {
        setCurrentChatId(remaining[0].id);
        setMessages(remaining[0].messages || []);
      } else {
        setCurrentChatId(null);
        setMessages([]);
      }
    }
    try {
      await supabase.from('v0_chats').delete().eq('id', chatId);
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  }, [chats, currentChatId]);
  
  // Handle sending message
  const handleSendMessage = useCallback(async (content: string) => {
    const chatId = currentChatId || crypto.randomUUID();
    
    if (!currentChatId) {
      const newChat: Chat = {
        id: chatId,
        name: content.slice(0, 50),
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setChats([newChat, ...chats]);
      setCurrentChatId(chatId);
    }
    
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    
    setMessages(prev => {
      const updated = [...prev, userMessage];
      saveChat(chatId, updated);
      return updated;
    });
    setIsGenerating(true);
    setInput('');
    
    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: new Date(),
      files: [],
    }]);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/v0-stream-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(m => ({
              role: m.role,
              content: m.content,
            })),
            projectId,
            project,
            branding,
            specs: approvedSpecs,
            existingFiles: projectFiles.map(f => ({
              path: f.path,
              content: f.content,
              type: f.type,
            })),
          }),
        }
      );
      
      if (!response.ok) throw new Error('Generation failed');
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let narrativeContent = '';
      let lineBuffer = '';
      let doneReceived = false;
      let fileBuffer: ProjectFile[] = [];
      
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        
        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue;
          if (!line.startsWith('data: ')) continue;
          
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            doneReceived = true;
            continue;
          }
          
          let event;
          try {
            event = JSON.parse(jsonStr);
          } catch {
            continue;
          }
          
          if (event.type === 'narrative') {
            narrativeContent += event.content || '';
            setMessages(prev => {
              const updated = [...prev];
              const lastIdx = updated.findLastIndex(m => m.id === assistantId);
              if (lastIdx >= 0) {
                updated[lastIdx] = {
                  ...updated[lastIdx],
                  content: narrativeContent,
                };
              }
              return updated;
            });
          } else if (event.type === 'file') {
            const file: ProjectFile = {
              path: event.path,
              content: event.content || event.code || '',
              type: (event.path.endsWith('.css') ? 'css' : 
                     event.path.endsWith('.json') ? 'json' : 
                     event.path.endsWith('.html') ? 'html' : 'tsx') as ProjectFile['type'],
            };
            fileBuffer.push(file);
            projectFilesRef.current = [...projectFilesRef.current, file];
            setProjectFiles(prev => {
              const existing = prev.findIndex(f => f.path === file.path);
              return existing >= 0
                ? prev.map((f, i) => i === existing ? file : f)
                : [...prev, file];
            });
            setSelectedFile(prev => prev || file.path);
          } else if (event.type === 'complete') {
            setMessages(prev => {
              const updated = [...prev];
              const lastIdx = updated.findLastIndex(m => m.id === assistantId);
              if (lastIdx >= 0) {
                updated[lastIdx] = {
                  ...updated[lastIdx],
                  isStreaming: false,
                  files: fileBuffer,
                };
              }
              return updated;
            });
            await saveChat(chatId, [...messages, userMessage, {
              id: assistantId,
              role: 'assistant',
              content: narrativeContent,
              files: fileBuffer,
              isStreaming: false,
              timestamp: new Date(),
            }]);
            await saveFilesToDB([...projectFiles, ...fileBuffer]);
            if (event.url) {
              onDeploymentComplete?.(event.url);
            }
          } else if (event.type === 'error') {
            throw new Error(event.error || 'Generation error');
          }
        }
        
        if (doneReceived && !narrativeContent) {
          setMessages(prev => {
            const updated = [...prev];
            const lastIdx = updated.findLastIndex(m => m.id === assistantId);
            if (lastIdx >= 0) {
              updated[lastIdx] = {
                ...updated[lastIdx],
                isStreaming: false,
                content: 'Generation complete! Check the preview panel.',
              };
            }
            return updated;
          });
          break;
        }
      }
    } catch (error) {
      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.findLastIndex(m => m.id === assistantId);
        if (lastIdx >= 0) {
          updated[lastIdx] = {
            ...updated[lastIdx],
            isStreaming: false,
            content: error instanceof Error ? error.message : 'An error occurred',
          };
        }
        return updated;
      });
    } finally {
      setIsGenerating(false);
    }
  }, [currentChatId, messages, projectFiles, projectId, project, branding, approvedSpecs, saveChat, saveFilesToDB, onDeploymentComplete]);
  
  // Handle file selection
  const handleFileSelect = (filePath: string) => {
    setSelectedFile(filePath);
    setActivePanel('preview');
  };
  
  // Get file icon
  const getFileIcon = (path: string) => {
    if (path.endsWith('.tsx') || path.endsWith('.ts')) return '⚛️';
    if (path.endsWith('.css')) return '🎨';
    if (path.endsWith('.json')) return '📋';
    if (path.endsWith('.html')) return '🌐';
    return '📄';
  };
  
  // Format file size
  const formatFileSize = (content: string) => {
    const bytes = new Blob([content]).size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Left Sidebar - Chat History */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-r border-gray-800 bg-gray-900/50 flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <History className="w-5 h-5" style={{ color: brandTheme.primary }} />
                  Chat History
                </h2>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowHistory(false)}
                  className="h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-gray-800/50 border-gray-700 h-9"
                />
              </div>
            </div>
            
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-1">
                {filteredChats.map((chat) => (
                  <div
                    key={chat.id}
                    className={cn(
                      'group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors',
                      currentChatId === chat.id
                        ? 'bg-gray-800'
                        : 'hover:bg-gray-800/50'
                    )}
                    onClick={() => {
                      setCurrentChatId(chat.id);
                      setMessages(chat.messages || []);
                      setShowHistory(false);
                    }}
                  >
                    <MessageSquare className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {chat.name || 'Untitled Chat'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(chat.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChat(chat.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3 text-gray-500" />
                    </Button>
                  </div>
                ))}
                
                {filteredChats.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No chats yet</p>
                    <Button
                      variant="link"
                      className="mt-2"
                      onClick={createNewChat}
                    >
                      Create your first chat
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <div className="p-3 border-t border-gray-800">
              <Button
                className="w-full"
                onClick={createNewChat}
                style={{
                  background: brandTheme.gradientText,
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      
      {/* Toggle Sidebar Button */}
      <Button
        size="icon"
        variant="ghost"
        className="absolute left-2 top-4 z-50 h-8 w-8 bg-gray-900/80"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? (
          <ChevronLeft className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </Button>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-900/30">
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: brandTheme.gradientText }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold">{project.name}</h1>
              <p className="text-xs text-gray-500">AI Website Builder</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Viewport selector */}
            <div className="flex items-center bg-gray-800 rounded-lg p-1">
              <Button
                size="icon"
                variant={viewport === 'desktop' ? 'secondary' : 'ghost'}
                className="h-7 w-7"
                onClick={() => setViewport('desktop')}
              >
                <Monitor className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant={viewport === 'tablet' ? 'secondary' : 'ghost'}
                className="h-7 w-7"
                onClick={() => setViewport('tablet')}
              >
                <Tablet className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant={viewport === 'mobile' ? 'secondary' : 'ghost'}
                className="h-7 w-7"
                onClick={() => setViewport('mobile')}
              >
                <Smartphone className="w-4 h-4" />
              </Button>
            </div>
            
            {/* View mode toggle */}
            <div className="flex items-center bg-gray-800 rounded-lg p-1">
              <Button
                variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
                className="h-7 px-3"
                onClick={() => setViewMode('preview')}
              >
                <Eye className="w-4 h-4 mr-1" />
                Preview
              </Button>
              <Button
                variant={viewMode === 'code' ? 'secondary' : 'ghost'}
                className="h-7 px-3"
                onClick={() => setViewMode('code')}
              >
                <Code className="w-4 h-4 mr-1" />
                Code
              </Button>
            </div>
            
            <Separator orientation="vertical" className="h-6 bg-gray-700" />
            
            {/* Action buttons */}
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Share2 className="w-4 h-4" />
            </Button>
            <Button
              className="h-8"
              style={{ background: brandTheme.primary }}
            >
              <Rocket className="w-4 h-4 mr-2" />
              Deploy
            </Button>
          </div>
        </header>
        
        {/* Main Split View */}
        <div className="flex-1 flex overflow-hidden" ref={splitContainerRef}>
          {/* Left Panel - Chat Input */}
          <motion.div
            className="flex flex-col border-r border-gray-800 bg-gray-900/20"
            style={{ width: `${leftPanelWidth}%` }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0}
            onDragEnd={(e, { offset, velocity }) => {
              if (Math.abs(offset.x) > 50) {
                setLeftPanelWidth(Math.min(Math.max(leftPanelWidth + offset.x / 10, 25), 55));
              }
            }}
          >
            {/* Files List */}
            <div className="h-1/3 border-b border-gray-800 overflow-hidden">
              <div className="p-3 bg-gray-900/50 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-gray-500" />
                    Project Files
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {projectFiles.length} files
                  </Badge>
                </div>
              </div>
              <ScrollArea className="h-[calc(100%-40px)]">
                <div className="p-2 space-y-1">
                  {projectFiles.map((file) => (
                    <div
                      key={file.path}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors',
                        selectedFile === file.path
                          ? 'bg-gray-800'
                          : 'hover:bg-gray-800/50'
                      )}
                      onClick={() => handleFileSelect(file.path)}
                    >
                      <span className="text-sm">{getFileIcon(file.path)}</span>
                      <span className="flex-1 text-sm truncate">{file.path}</span>
                      <span className="text-xs text-gray-500">
                        {formatFileSize(file.content)}
                      </span>
                    </div>
                  ))}
                  {projectFiles.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-xs">No files generated yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1" ref={scrollRef}>
                <div className="p-4 space-y-4">
                  {messages.map((message) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={message.id}
                      className={cn(
                        'flex gap-3',
                        message.role === 'user' && 'flex-row-reverse'
                      )}
                    >
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                          message.role === 'user'
                            ? 'bg-gray-700'
                            : 'bg-gradient-to-br from-green-500 to-teal-600'
                        )}
                      >
                        {message.role === 'user' ? (
                          <span className="text-sm">👤</span>
                        ) : (
                          <Sparkles className="w-4 h-4 text-white" />
                        )}
                      </div>
                      
                      <div
                        className={cn(
                          'max-w-[80%] rounded-2xl px-4 py-2',
                          message.role === 'user'
                            ? 'bg-gray-800'
                            : 'bg-gray-800/50'
                        )}
                      >
                        {message.role === 'assistant' && message.isStreaming && (
                          <div className="flex items-center gap-1 mb-1">
                            <Loader2 className="w-3 h-3 animate-spin" style={{ color: brandTheme.primary }} />
                            <span className="text-xs text-gray-500">Generating...</span>
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content || (message.isStreaming && (
                            <span className="inline-block w-2 h-4 ml-1 bg-gray-500 animate-pulse" />
                          ))}
                        </p>
                        
                        {message.files && message.files.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {message.files.map((file) => (
                              <Badge
                                key={file.path}
                                variant="outline"
                                className="text-xs cursor-pointer hover:bg-gray-700"
                                onClick={() => handleFileSelect(file.path)}
                              >
                                {getFileIcon(file.path)} {file.path}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
              
              {/* Chat Input */}
              <div className="p-4 border-t border-gray-800">
                <div className="relative">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Describe what you want to build..."
                    className="min-h-[60px] max-h-[120px] pr-12 bg-gray-800/50 border-gray-700 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (input.trim()) {
                          handleSendMessage(input);
                        }
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    className="absolute bottom-2 right-2 h-8 w-8"
                    disabled={!input.trim() || isGenerating}
                    onClick={() => input.trim() && handleSendMessage(input)}
                    style={{ background: brandTheme.primary }}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            </div>
          </motion.div>
          
          {/* Resize Handle */}
          <div
            className="w-1 bg-gray-800 hover:bg-gray-700 cursor-col-resize flex items-center justify-center"
            onMouseDown={(e) => {
              const startX = e.clientX;
              const startWidth = leftPanelWidth;
              
              const onMove = (moveEvent: MouseEvent) => {
                const diff = ((moveEvent.clientX - startX) / window.innerWidth) * 100;
                setLeftPanelWidth(Math.min(Math.max(startWidth + diff, 25), 55));
              };
              
              const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
              };
              
              document.addEventListener('mousemove', onMove);
              document.addEventListener('mouseup', onUp);
            }}
          >
            <div className="w-0.5 h-8 bg-gray-600 rounded-full" />
          </div>
          
          {/* Right Panel - Preview */}
          <motion.div
            className="flex flex-col bg-gray-950"
            style={{ width: `${100 - leftPanelWidth - 2}%` }}
          >
            {/* Preview Toolbar */}
            <div className="h-10 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-900/30">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Preview</span>
                {selectedFile && (
                  <>
                    <span className="text-gray-600">/</span>
                    <span className="text-xs">{selectedFile}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setIsPreviewFullscreen(!isPreviewFullscreen)}
                >
                  {isPreviewFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            
            {/* Preview Frame */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
              <div
                className={cn(
                  'transition-all duration-300 bg-white rounded-lg overflow-hidden shadow-2xl',
                  viewport === 'desktop' && 'w-full h-full',
                  viewport === 'tablet' && 'w-[768px] h-[1024px]',
                  viewport === 'mobile' && 'w-[375px] h-[667px]'
                )}
              >
                {selectedFile ? (
                  <SandboxPreview
                    code={currentFile?.content || ''}
                    files={projectFiles}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Select a file to preview</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
