import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, Activity, Waves, Bot, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { agents } from '@/lib/agents-data';
import { useOpenAIRealtime } from '@/hooks/useOpenAIRealtime';
import VoiceCallHistory from './VoiceCallHistory';

// Map frontend agent IDs to voice agent configs
const AGENT_VOICE_MAP: Record<string, string> = {
  'agent-1': 'ceo',
  'agent-2': 'research',
  'agent-3': 'research',
  'agent-4': 'content',
  'agent-5': 'content',
  'agent-6': 'sales',
  'agent-7': 'sales',
  'agent-8': 'support',
};

const VoiceAgentInterface = () => {
  const [selectedAgent, setSelectedAgent] = useState(agents[0]);
  const [isMuted, setIsMuted] = useState(false);
  const [activeTab, setActiveTab] = useState('voice');

  // Get the voice agent ID for the selected agent
  const voiceAgentId = AGENT_VOICE_MAP[selectedAgent.id] || 'ceo';

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
    onSpeakingChange: (speaking) => {
      console.log('Agent speaking:', speaking);
    },
  });

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Phone className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">OpenAI Realtime Voice</span>
          </div>
          <h1 className="cyber-text text-4xl font-bold text-gradient mb-4">
            Voice Command Center
          </h1>
          <p className="text-muted-foreground">
            Talk directly to your AI agents using real-time voice powered by OpenAI
          </p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="voice" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Live Voice
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Call History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="voice">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Agent Selection */}
              <Card className="glass-morphism cyber-border p-6">
                <h2 className="cyber-text text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Select Agent
                </h2>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {agents.slice(0, 10).map((agent) => (
                    <motion.button
                      key={agent.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedAgent(agent)}
                      disabled={isConnected}
                      className={`w-full p-3 rounded-lg text-left transition-all ${
                        selectedAgent.id === agent.id 
                          ? 'bg-primary/20 border border-primary/50' 
                          : 'bg-card/50 hover:bg-card border border-transparent'
                      } ${isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{agent.icon}</span>
                        <div>
                          <p className="font-medium text-foreground text-sm">{agent.name}</p>
                          <p className="text-xs text-muted-foreground">{agent.role}</p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </Card>

              {/* Voice Interface */}
              <Card className="glass-morphism cyber-border p-6 lg:col-span-2">
                <div className="flex flex-col h-full">
                  {/* Selected Agent Display */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <motion.div 
                        className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${
                          isConnected ? 'cyber-box-glow' : ''
                        }`}
                        style={{ backgroundColor: 'hsl(var(--primary) / 0.2)' }}
                        animate={isSpeaking ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                      >
                        {selectedAgent.icon}
                      </motion.div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">{selectedAgent.name}</h3>
                        <p className="text-muted-foreground">{selectedAgent.role}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`w-2 h-2 rounded-full ${
                            isConnected ? 'bg-primary animate-pulse' : 
                            isConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-muted'
                          }`} />
                          <span className="text-xs text-muted-foreground capitalize">
                            {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
                          </span>
                          {isConnected && (
                            <Badge variant="outline" className="text-xs">
                              OpenAI Realtime
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Audio Levels */}
                    <div className="flex gap-4">
                      <div className="text-center">
                        <Mic className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                        <div className="w-2 h-16 bg-muted rounded-full overflow-hidden">
                          <motion.div 
                            className="w-full bg-primary rounded-full"
                            style={{ height: `${inputLevel * 100}%` }}
                            animate={{ height: `${inputLevel * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-center">
                        <Volume2 className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                        <div className="w-2 h-16 bg-muted rounded-full overflow-hidden">
                          <motion.div 
                            className="w-full bg-accent rounded-full"
                            style={{ height: `${outputLevel * 100}%` }}
                            animate={{ height: `${outputLevel * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Audio Visualization */}
                  <div className="flex-1 min-h-[200px] bg-card/50 rounded-lg p-4 mb-6 relative overflow-hidden">
                    {isConnected ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div 
                          className="flex gap-1"
                          animate={{ opacity: isSpeaking ? 1 : 0.5 }}
                        >
                          {[...Array(20)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="w-1 bg-primary rounded-full"
                              animate={{
                                height: isSpeaking 
                                  ? [10, Math.random() * 60 + 20, 10] 
                                  : [10, 15, 10],
                              }}
                              transition={{
                                duration: 0.3,
                                repeat: Infinity,
                                delay: i * 0.05,
                              }}
                            />
                          ))}
                        </motion.div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <Waves className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                          <p className="text-muted-foreground">Click "Start Call" to begin</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Using OpenAI GPT-4o Realtime API
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Conversation Transcript */}
                    <AnimatePresence>
                      {messages.length > 0 && (
                        <div className="absolute bottom-4 left-4 right-4 max-h-32 overflow-y-auto">
                          {messages.slice(-3).map((msg, i) => (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className={`text-sm p-2 rounded mb-1 ${
                                msg.role === 'user' 
                                  ? 'bg-primary/20 text-primary-foreground ml-auto max-w-[70%]' 
                                  : 'bg-muted text-foreground max-w-[70%]'
                              }`}
                            >
                              {msg.content}
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={toggleMute}
                      disabled={!isConnected}
                      className="w-12 h-12 rounded-full"
                    >
                      {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </Button>

                    {isConnected ? (
                      <Button
                        onClick={disconnect}
                        className="w-16 h-16 rounded-full bg-destructive hover:bg-destructive/90"
                      >
                        <PhoneOff className="w-6 h-6" />
                      </Button>
                    ) : (
                      <Button
                        onClick={connect}
                        disabled={isConnecting}
                        className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90 cyber-box-glow"
                      >
                        {isConnecting ? (
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Phone className="w-6 h-6" />
                        )}
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="icon"
                      disabled={!isConnected}
                      className="w-12 h-12 rounded-full"
                    >
                      <Volume2 className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* Status Bar */}
                  <div className="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      <span>OpenAI Realtime</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        isConnected ? 'bg-primary' : 'bg-muted'
                      }`} />
                      <span>WebRTC: {isConnected ? 'Connected' : 'Standby'}</span>
                    </div>
                    {isSpeaking && (
                      <Badge variant="secondary" className="animate-pulse">
                        Agent Speaking...
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <VoiceCallHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default VoiceAgentInterface;
