import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Send, Loader2, Sparkles, Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useCEO } from '@/hooks/useCEO';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  attachments?: UploadedFile[];
}

interface UploadedFile {
  name: string;
  url: string;
  type: 'image' | 'document';
  path: string;
}

interface ProjectCreationCEOChatProps {
  open: boolean;
  onClose: () => void;
  onProjectCreated: () => void;
}

export const ProjectCreationCEOChat = ({ open, onClose, onProjectCreated }: ProjectCreationCEOChatProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { ceoName, ceoAvatarUrl } = useCEO();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftIndustry, setDraftIndustry] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Reset state when dialog opens
  const resetState = () => {
    setMessages([
      {
        role: 'assistant',
        content: `Hello! I'm ${ceoName}, and I'm excited to help you create a new business project!

Tell me about your business idea - what problem are you solving? Who is it for?

Feel free to upload any existing logos, documents, or reference materials you'd like me to consider.`,
      },
    ]);
    setInput('');
    setUploadedFiles([]);
    setDraftName('');
    setDraftIndustry('');
  };

  // Initialize / reset whenever the dialog is opened
  useEffect(() => {
    if (open) {
      resetState();
    }
  }, [open]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    setIsUploading(true);
    const newFiles: UploadedFile[] = [];

    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith('image/');
      const timestamp = Date.now();
      const path = `${user.id}/pending/${timestamp}/${file.name}`;

      try {
        const { error } = await supabase.storage
          .from('project-assets')
          .upload(path, file, { upsert: true });

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('project-assets')
          .getPublicUrl(path);

        newFiles.push({
          name: file.name,
          url: urlData.publicUrl,
          type: isImage ? 'image' : 'document',
          path,
        });

        toast.success(`Uploaded ${file.name}`);
      } catch (err) {
        console.error('Upload error:', err);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
    setIsUploading(false);

    // Add message acknowledging uploads
    if (newFiles.length > 0) {
      const fileNames = newFiles.map(f => f.name).join(', ');
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `I see you've uploaded: ${fileNames}. I'll make sure our AI agents use ${newFiles.length === 1 ? 'this' : 'these'} in your project! ${newFiles.some(f => f.type === 'image') ? 'If any of these are logos, we\'ll use them as your primary brand asset.' : ''}`,
        },
      ]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = async (file: UploadedFile) => {
    try {
      await supabase.storage.from('project-assets').remove([file.path]);
      setUploadedFiles(prev => prev.filter(f => f.path !== file.path));
      toast.success(`Removed ${file.name}`);
    } catch (err) {
      console.error('Remove error:', err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !user) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, attachments: uploadedFiles.length > 0 ? [...uploadedFiles] : undefined }]);
    setIsLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ceo-agent-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({
            messages: [...messages, { role: 'user', content: userMessage }].map(m => ({
              role: m.role,
              content: m.content,
            })),
            currentPage: '/projects/new',
            context: {
              uploadedAssets: uploadedFiles,
            },
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to get response');

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      let assistantMessage = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                assistantMessage += content;
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last?.role === 'assistant' && prev.length > 1) {
                    return [...prev.slice(0, -1), { role: 'assistant', content: assistantMessage }];
                  }
                  return [...prev, { role: 'assistant', content: assistantMessage }];
                });
              }
            } catch {}
          }
        }
      }

      // Try to prefill project fields if CEO suggests them
      const nameMatch =
        assistantMessage.match(/project name\s*[:\-]\s*([^\n]+)/i) ||
        assistantMessage.match(/\bname\s*[:\-]\s*([^\n]+)/i);
      const industryMatch = assistantMessage.match(/industry\s*[:\-]\s*([^\n]+)/i);

      if (nameMatch && !draftName.trim()) {
        setDraftName(nameMatch[1].trim().replace(/[*"]/g, ''));
      }
      if (industryMatch && !draftIndustry.trim()) {
        setDraftIndustry(industryMatch[1].trim().replace(/[*"]/g, ''));
      }

    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to get response');
    } finally {
      setIsLoading(false);
    }
  };

  const createProject = async () => {
    if (!user) return;
    if (!draftName.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    setIsCreating(true);

    try {
      const uploadedAssets = uploadedFiles.length
        ? uploadedFiles.map((f) => ({
            type: f.type,
            url: f.url,
            filename: f.name,
            originalPath: f.path,
          }))
        : null;

      const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';

      const { data, error } = await supabase
        .from('business_projects')
        .insert([
          {
            user_id: user.id,
            name: draftName.trim(),
            description: lastUserMessage || null,
            industry: draftIndustry.trim() || null,
            target_market: 'General consumers',
            status: 'active',
            business_model: uploadedAssets ? { uploaded_assets: uploadedAssets } : null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (uploadedFiles.length > 0 && data) {
        for (const file of uploadedFiles) {
          const newPath = `${user.id}/${data.id}/${file.name}`;
          try {
            await supabase.storage.from('project-assets').move(file.path, newPath);
          } catch (moveErr) {
            console.warn('Failed to move file:', moveErr);
          }
        }
      }

      toast.success('Project created successfully!');
      onProjectCreated();
      onClose();
      navigate(`/projects/${data.id}/overview`, { state: { newProject: true } });
    } catch (error) {
      console.error('Create project error:', error);
      toast.error('Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); resetState(); } }}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {ceoAvatarUrl ? (
              <img src={ceoAvatarUrl} alt={ceoName} className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <Bot className="w-5 h-5 text-primary" />
            )}
            Create Project with {ceoName}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {message.attachments.map((att, i) => (
                        <div key={i} className="flex items-center gap-1 text-xs bg-background/20 rounded px-2 py-1">
                          {att.type === 'image' ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                          {att.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Uploaded Files Preview */}
        {uploadedFiles.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2">Uploaded files:</p>
            <div className="flex flex-wrap gap-2">
              {uploadedFiles.map((file, i) => (
                <div key={i} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 text-sm">
                  {file.type === 'image' ? (
                    <img src={file.url} alt={file.name} className="w-6 h-6 rounded object-cover" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  <span className="max-w-[100px] truncate">{file.name}</span>
                  <button onClick={() => removeFile(file)} className="hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Project Details + Create */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-medium">Project details</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Project name</p>
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="e.g. Acme Fitness"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Industry (optional)</p>
              <Input
                value={draftIndustry}
                onChange={(e) => setDraftIndustry(e.target.value)}
                placeholder="e.g. E-commerce"
              />
            </div>
          </div>

          <div className="mt-4">
            <Button onClick={createProject} disabled={isCreating || !draftName.trim()} className="w-full">
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            Tip: you can keep chatting—this button just saves the project when you're ready.
          </p>
        </Card>
        {/* Input */}
        <div className="flex gap-2 pt-4 border-t">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder="Describe your business idea..."
            className="min-h-[60px] resize-none flex-1"
            disabled={isLoading}
          />
          <Button onClick={sendMessage} disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
