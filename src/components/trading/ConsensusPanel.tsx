import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ConsensusVote {
  agentEmoji: string;
  agentName: string;
  vote: 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL';
  confidence: number;
  reason: string;
}

interface ConsensusPanelProps {
  symbol?: string;
  votes?: ConsensusVote[];
}

const defaultVotes: ConsensusVote[] = [
  { agentEmoji: '📊', agentName: 'Technical Agent', vote: 'BUY', confidence: 82, reason: 'Breakout above resistance with volume' },
  { agentEmoji: '🧠', agentName: 'Strategy Agent', vote: 'BUY', confidence: 78, reason: 'Aligned with macro thesis' },
  { agentEmoji: '🧾', agentName: 'Sentiment Agent', vote: 'BUY', confidence: 74, reason: 'Bullish social sentiment' },
  { agentEmoji: '📰', agentName: 'News Agent', vote: 'NEUTRAL', confidence: 50, reason: 'No major events pending' },
  { agentEmoji: '🛡️', agentName: 'Risk Agent', vote: 'BUY', confidence: 90, reason: 'Within all risk limits' },
  { agentEmoji: '🤖', agentName: 'Quant Agent', vote: 'BUY', confidence: 85, reason: 'Model confirms signal' },
];

const voteColors: Record<string, string> = {
  BUY: 'bg-green-500/10 text-green-500 border-green-500/30',
  SELL: 'bg-destructive/10 text-destructive border-destructive/30',
  HOLD: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  NEUTRAL: 'bg-muted text-muted-foreground border-border',
};

const voteIcons: Record<string, string> = {
  BUY: '✅',
  SELL: '🔴',
  HOLD: '⏸️',
  NEUTRAL: '⚠️',
};

export const ConsensusPanel = ({ symbol = 'NVDA', votes = defaultVotes }: ConsensusPanelProps) => {
  const buyCount = votes.filter(v => v.vote === 'BUY').length;
  const totalVotes = votes.length;
  const consensusReached = buyCount >= Math.ceil(totalVotes * 0.6);
  const avgConfidence = Math.round(votes.reduce((s, v) => s + v.confidence, 0) / totalVotes);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            🗳️ Trade Decision Framework
          </CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            {symbol}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {votes.map((vote, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.08 }}
            className="flex items-center gap-3 text-sm"
          >
            <span className="text-lg">{vote.agentEmoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{vote.agentName}</p>
              <p className="text-xs text-muted-foreground truncate">{vote.reason}</p>
            </div>
            <Badge variant="outline" className={`${voteColors[vote.vote]} text-xs shrink-0`}>
              {voteIcons[vote.vote]} {vote.vote}
            </Badge>
            <span className="text-xs text-muted-foreground w-10 text-right shrink-0">{vote.confidence}%</span>
          </motion.div>
        ))}

        {/* Consensus Result */}
        <div className="pt-3 border-t border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">
              📋 CONSENSUS: {buyCount}/{totalVotes} APPROVE
            </span>
            <Badge className={consensusReached ? 'bg-green-500' : 'bg-yellow-500'}>
              {consensusReached ? '→ EXECUTE TRADE' : 'PENDING'}
            </Badge>
          </div>
          <Progress value={avgConfidence} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">Average confidence: {avgConfidence}%</p>
        </div>
      </CardContent>
    </Card>
  );
};
