import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const WORKFLOW_STEPS = [
  { emoji: '🧠', label: 'Strategy & Market Regime Assessment', active: true },
  { emoji: '🔍', label: 'Research, News & Sentiment Scanning', active: true },
  { emoji: '📊', label: 'Technical & Quantitative Analysis', active: true },
  { emoji: '🎯', label: 'Signal Generation & Opportunity Detection', active: false },
  { emoji: '🗳️', label: 'Multi-Agent Consensus & Validation', active: false },
  { emoji: '🛡️', label: 'Risk Assessment & Position Sizing', active: false },
  { emoji: '⚡', label: 'Trade Execution (Entry)', active: false },
  { emoji: '👁️', label: 'Active Trade Monitoring & Management', active: false },
  { emoji: '🎯', label: 'Take Profit / Stop Loss / Trail / Scale', active: false },
  { emoji: '📈', label: 'Performance Logging & Analysis', active: false },
  { emoji: '🔄', label: 'Strategy Optimization & Learning', active: false },
  { emoji: '💬', label: 'User Reporting & Notifications', active: false },
];

export const WorkflowEngine = () => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">⚙️ Autonomous Workflow Engine</CardTitle>
          <Badge variant="outline" className="text-[10px] font-mono">24/7/365</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {WORKFLOW_STEPS.map((step, idx) => (
            <div key={idx} className="flex items-center gap-3">
              {/* Connector line */}
              <div className="flex flex-col items-center w-6">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  step.active ? 'bg-primary/20 ring-2 ring-primary/40' : 'bg-muted'
                }`}>
                  {step.emoji}
                </div>
                {idx < WORKFLOW_STEPS.length - 1 && (
                  <div className={`w-0.5 h-4 ${step.active ? 'bg-primary/30' : 'bg-border'}`} />
                )}
              </div>
              <span className={`text-xs ${step.active ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
              {step.active && <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse ml-auto" />}
            </div>
          ))}
          {/* Loop indicator */}
          <div className="flex items-center gap-3 pt-1">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">
              🔁
            </div>
            <span className="text-xs font-medium text-primary">REPEAT — 24/7/365 — ACROSS ALL MARKETS</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
