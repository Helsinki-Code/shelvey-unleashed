import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, PhoneOff, Mic, MicOff, Volume2, X, Bot,
  Search, TrendingUp, Code, Palette, FileText, DollarSign,
  Users, Settings, BarChart, Shield, Rocket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useOpenAIRealtime } from '@/hooks/useOpenAIRealtime';
import { ALL_AGENTS, DIVISION_COLORS, DIVISION_NAMES } from '@/lib/all-agents';

// Map agent IDs to voice session configs
const AGENT_VOICE_MAP: Record<string, string> = {
  'agent-1': 'research',
  'agent-2': 'research',
  'agent-3': 'research',
  'agent-6': 'content',
  'agent-7': 'content',
  'agent-8': 'content',
  'agent-13': 'sales',
  'agent-14': 'sales',
  'agent-15': 'support',
  'ceo': 'ceo',
};

interface AllAgentVoiceCallProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedAgentId?: string;
}

export const AllAgentVoiceCall = ({ isOpen, onClose, preselectedAgentId }: AllAgentVoiceCallProps) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(preselectedAgentId || null);
  const [isMuted, setIsMuted] = useState(false);

  const selectedAgent = ALL_AGENTS.find(a => a.id === selectedAgentId);
  const voiceAgentId = selectedAgentId ? (AGENT_VOICE_MAP[selectedAgentId] || 'ceo') : 'ceo';

  const {
    isConnected,
    isConnecting,
    isSpeaking,
    messages,
    inputLevel,
    outputLevel,
    connect,
    disconnect,
  } = useOpenAIRealtime({
    agentId: voiceAgentId,
    onMessage: (msg) => console.log('Voice message:', msg),
    onSpeakingChange: (speaking) => console.log('Speaking:', speaking),
  });

  const handleConnect = async () => {
    if (!selectedAgentId) return;
    await connect();
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleAgentSelect = (agentId: string) => {
    if (isConnected) {
      disconnect();
    }
    setSelectedAgentId(agentId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-5xl"
      >
        <Card className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>

          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              Voice Call with AI Agents
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Agent Selection */}
              <div>
                <h3 className="font-semibold mb-3">Select an Agent to Call</h3>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {/* CEO Agent */}
                    <Card
                      className={`cursor-pointer transition-all hover:border-primary/50 ${
                        selectedAgentId === 'ceo' ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => handleAgentSelect('ceo')}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
                          <Bot className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">Ava - CEO Agent</p>
                          <p className="text-xs text-muted-foreground">Strategic leadership & business planning</p>
                        </div>
                        <Badge className="bg-primary/20 text-primary">CEO</Badge>
                      </CardContent>
                    </Card>

                    {/* All 25 Agents */}
                    {ALL_AGENTS.map((agent) => (
                      <Card
                        key={agent.id}
                        className={`cursor-pointer transition-all hover:border-primary/50 ${
                          selectedAgentId === agent.id ? 'border-primary bg-primary/5' : ''
                        }`}
                        onClick={() => handleAgentSelect(agent.id)}
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${DIVISION_COLORS[agent.division]}`}>
                            <agent.icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{agent.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{agent.role}</p>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {DIVISION_NAMES[agent.division]}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Call Interface */}
              <div className="flex flex-col">
                {selectedAgentId ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                    {/* Agent Avatar */}
                    <div className="relative">
                      <motion.div
                        animate={{
                          scale: isSpeaking ? [1, 1.05, 1] : 1,
                        }}
                        transition={{ repeat: isSpeaking ? Infinity : 0, duration: 0.5 }}
                        className={`w-32 h-32 rounded-full flex items-center justify-center ${
                          selectedAgentId === 'ceo'
                            ? 'bg-gradient-to-br from-primary to-accent'
                            : `bg-gradient-to-br ${DIVISION_COLORS[selectedAgent?.division || 'research']}`
                        }`}
                      >
                        {selectedAgentId === 'ceo' ? (
                          <Bot className="w-16 h-16 text-white" />
                        ) : (
                          selectedAgent && <selectedAgent.icon className="w-16 h-16 text-white" />
                        )}
                      </motion.div>
                      {isConnected && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                          <Badge className="bg-green-500 text-white">Connected</Badge>
                        </div>
                      )}
                    </div>

                    {/* Agent Info */}
                    <div className="text-center">
                      <h3 className="text-xl font-bold">
                        {selectedAgentId === 'ceo' ? 'Ava - CEO Agent' : selectedAgent?.name}
                      </h3>
                      <p className="text-muted-foreground">
                        {selectedAgentId === 'ceo' ? 'Strategic Leadership' : selectedAgent?.role}
                      </p>
                    </div>

                    {/* Audio Levels */}
                    {isConnected && (
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">Your Voice</p>
                          <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-primary"
                              animate={{ width: `${inputLevel * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">Agent Voice</p>
                          <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-accent"
                              animate={{ width: `${outputLevel * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Call Controls */}
                    <div className="flex items-center gap-4">
                      {!isConnected ? (
                        <Button
                          size="lg"
                          className="bg-green-500 hover:bg-green-600 text-white rounded-full w-16 h-16"
                          onClick={handleConnect}
                          disabled={isConnecting}
                        >
                          <Phone className="w-6 h-6" />
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            className="rounded-full w-12 h-12"
                            onClick={() => setIsMuted(!isMuted)}
                          >
                            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                          </Button>
                          <Button
                            size="lg"
                            className="bg-red-500 hover:bg-red-600 text-white rounded-full w-16 h-16"
                            onClick={handleDisconnect}
                          >
                            <PhoneOff className="w-6 h-6" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="rounded-full w-12 h-12"
                          >
                            <Volume2 className="w-5 h-5" />
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Status */}
                    <p className="text-sm text-muted-foreground">
                      {isConnecting && 'Connecting...'}
                      {isConnected && !isSpeaking && 'Connected - Start speaking'}
                      {isConnected && isSpeaking && 'Agent is speaking...'}
                      {!isConnected && !isConnecting && 'Click to start call'}
                    </p>

                    {/* Recent Messages */}
                    {messages.length > 0 && (
                      <div className="w-full max-h-32 overflow-y-auto bg-muted/50 rounded-lg p-3">
                        <p className="text-xs font-medium mb-2">Transcript</p>
                        {messages.slice(-3).map((msg, i) => (
                          <p key={i} className={`text-sm ${msg.role === 'user' ? 'text-primary' : ''}`}>
                            <span className="font-medium">{msg.role === 'user' ? 'You' : 'Agent'}:</span>{' '}
                            {msg.content}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Select an agent from the list to start a voice call</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
