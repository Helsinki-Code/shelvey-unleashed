import { useState, useEffect, useCallback } from 'react';
import { useConversation } from '@elevenlabs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, Activity, Waves, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { agents } from '@/lib/agents-data';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const VoiceAgentInterface = () => {
  const [selectedAgent, setSelectedAgent] = useState(agents[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs');
      logActivity('Voice session started');
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs');
      logActivity('Voice session ended');
    },
    onMessage: (message) => {
      console.log('Message:', message);
      if (message.message) {
        setMessages(prev => [...prev, {
          role: message.source === 'user' ? 'user' : 'assistant',
          content: message.message,
          timestamp: new Date()
        }]);
      }
    },
    onError: (error) => {
      console.error('ElevenLabs error:', error);
    },
  });

  const logActivity = async (action: string) => {
    try {
      await supabase.from('agent_activity_logs').insert({
        agent_id: selectedAgent.id,
        agent_name: selectedAgent.name,
        action,
        status: 'completed',
        metadata: { division: selectedAgent.division }
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  };

  const startConversation = useCallback(async () => {
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start session with ElevenLabs - configure your agent in ElevenLabs dashboard
      // The agentId should be from your ElevenLabs Conversational AI setup
      // For demo purposes, we show the UI - real usage requires an ElevenLabs agent
      console.log('Starting voice session with agent:', selectedAgent.name);
      
      // Note: To use this, create an agent at https://elevenlabs.io/app/conversational-ai
      // Then use either agentId or signedUrl from your backend
      // Example: await conversation.startSession({ agentId: 'your-agent-id' });
      
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  }, [conversation, selectedAgent]);

  const endConversation = useCallback(async () => {
    await conversation.endSession();
    setMessages([]);
  }, [conversation]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Audio visualization
  const inputVolume = conversation.getInputVolume?.() || 0;
  const outputVolume = conversation.getOutputVolume?.() || 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="cyber-text text-4xl font-bold text-gradient mb-4">
            Voice Command Center
          </h1>
          <p className="text-muted-foreground">
            Talk directly to your AI agents using voice commands
          </p>
        </motion.div>

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
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    selectedAgent.id === agent.id 
                      ? 'bg-primary/20 border border-primary/50' 
                      : 'bg-card/50 hover:bg-card border border-transparent'
                  }`}
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
                      conversation.status === 'connected' ? 'cyber-box-glow' : ''
                    }`}
                    style={{ backgroundColor: 'hsl(var(--primary) / 0.2)' }}
                    animate={conversation.isSpeaking ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                  >
                    {selectedAgent.icon}
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{selectedAgent.name}</h3>
                    <p className="text-muted-foreground">{selectedAgent.role}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2 h-2 rounded-full ${
                        conversation.status === 'connected' ? 'bg-primary animate-pulse' : 'bg-muted'
                      }`} />
                      <span className="text-xs text-muted-foreground capitalize">
                        {conversation.status}
                      </span>
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
                        style={{ height: `${inputVolume * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-center">
                    <Volume2 className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                    <div className="w-2 h-16 bg-muted rounded-full overflow-hidden">
                      <motion.div 
                        className="w-full bg-accent rounded-full"
                        style={{ height: `${outputVolume * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Audio Visualization */}
              <div className="flex-1 min-h-[200px] bg-card/50 rounded-lg p-4 mb-6 relative overflow-hidden">
                {conversation.status === 'connected' ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div 
                      className="flex gap-1"
                      animate={{ opacity: conversation.isSpeaking ? 1 : 0.5 }}
                    >
                      {[...Array(20)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-1 bg-primary rounded-full"
                          animate={{
                            height: conversation.isSpeaking 
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
                    </div>
                  </div>
                )}

                {/* Conversation Transcript */}
                <AnimatePresence>
                  {messages.length > 0 && (
                    <div className="absolute bottom-4 left-4 right-4 max-h-32 overflow-y-auto">
                      {messages.slice(-3).map((msg, i) => (
                        <motion.div
                          key={i}
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
                  disabled={conversation.status !== 'connected'}
                  className="w-12 h-12 rounded-full"
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>

                {conversation.status === 'connected' ? (
                  <Button
                    onClick={endConversation}
                    className="w-16 h-16 rounded-full bg-destructive hover:bg-destructive/90"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </Button>
                ) : (
                  <Button
                    onClick={startConversation}
                    className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90 cyber-box-glow"
                  >
                    <Phone className="w-6 h-6" />
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => conversation.setVolume?.({ volume: volume === 0 ? 0.8 : 0 })}
                  disabled={conversation.status !== 'connected'}
                  className="w-12 h-12 rounded-full"
                >
                  {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </Button>
              </div>

              {/* Status Bar */}
              <div className="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  <span>Kokoro TTS Ready</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    conversation.status === 'connected' ? 'bg-primary' : 'bg-muted'
                  }`} />
                  <span>MCP: {conversation.status === 'connected' ? 'Connected' : 'Standby'}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VoiceAgentInterface;
