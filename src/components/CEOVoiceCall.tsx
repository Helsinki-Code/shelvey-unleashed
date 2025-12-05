import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Mic, MicOff, Volume2, X, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOpenAIRealtime } from '@/hooks/useOpenAIRealtime';

interface CEOVoiceCallProps {
  onClose: () => void;
}

export const CEOVoiceCall = ({ onClose }: CEOVoiceCallProps) => {
  const [isMuted, setIsMuted] = useState(false);

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
    agentId: 'ceo',
    onSpeakingChange: (speaking) => {
      console.log('CEO speaking:', speaking);
    },
  });

  const handleClose = () => {
    if (isConnected) {
      disconnect();
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        className="relative w-full max-w-md mx-4 p-6 rounded-2xl bg-card border border-border shadow-2xl"
      >
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="absolute top-4 right-4"
        >
          <X className="w-4 h-4" />
        </Button>

        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center text-4xl ${
              isConnected ? 'cyber-box-glow' : ''
            }`}
            style={{ backgroundColor: 'hsl(var(--primary) / 0.2)' }}
            animate={isSpeaking ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 0.5 }}
          >
            👔
          </motion.div>
          <h3 className="text-xl font-bold text-foreground">CEO Agent - Ava</h3>
          <p className="text-muted-foreground text-sm">Voice Call</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-primary animate-pulse' : 
              isConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-muted'
            }`} />
            <span className="text-xs text-muted-foreground">
              {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Ready to call'}
            </span>
          </div>
        </div>

        {/* Audio Visualization */}
        <div className="h-32 bg-muted/50 rounded-lg mb-6 relative overflow-hidden">
          {isConnected ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div className="flex gap-1" animate={{ opacity: isSpeaking ? 1 : 0.5 }}>
                {[...Array(15)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-primary rounded-full"
                    animate={{
                      height: isSpeaking 
                        ? [10, Math.random() * 50 + 15, 10] 
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
                <Waves className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {isConnecting ? 'Connecting...' : 'Click to start voice call'}
                </p>
              </div>
            </div>
          )}

          {/* Live Transcript */}
          <AnimatePresence>
            {messages.length > 0 && (
              <div className="absolute bottom-2 left-2 right-2 max-h-20 overflow-y-auto">
                {messages.slice(-2).map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-xs p-1.5 rounded mb-1 ${
                      msg.role === 'user' 
                        ? 'bg-primary/20 text-foreground ml-auto max-w-[80%]' 
                        : 'bg-background/80 text-foreground max-w-[80%]'
                    }`}
                  >
                    {msg.content.slice(0, 100)}{msg.content.length > 100 ? '...' : ''}
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Audio Levels */}
        <div className="flex justify-center gap-8 mb-6">
          <div className="text-center">
            <Mic className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
            <div className="w-3 h-12 bg-muted rounded-full overflow-hidden mx-auto">
              <motion.div 
                className="w-full bg-primary rounded-full"
                style={{ height: `${inputLevel * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">You</span>
          </div>
          <div className="text-center">
            <Volume2 className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
            <div className="w-3 h-12 bg-muted rounded-full overflow-hidden mx-auto">
              <motion.div 
                className="w-full bg-accent rounded-full"
                style={{ height: `${outputLevel * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">CEO</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
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
              className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90"
            >
              {isConnecting ? (
                <div className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
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

        {/* Status */}
        {isSpeaking && (
          <div className="text-center mt-4">
            <Badge variant="secondary" className="animate-pulse">
              CEO is speaking...
            </Badge>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by OpenAI Realtime API
        </p>
      </motion.div>
    </motion.div>
  );
};
