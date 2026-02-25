import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RISK_PROFILES } from '@/lib/trading-agents';
import { cn } from '@/lib/utils';

interface RiskProfileSelectorProps {
  selected: string;
  onSelect: (id: string) => void;
}

export const RiskProfileSelector = ({ selected, onSelect }: RiskProfileSelectorProps) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">🎚️ Risk Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {RISK_PROFILES.map((profile) => (
          <button
            key={profile.id}
            onClick={() => onSelect(profile.id)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all',
              selected === profile.id
                ? 'border-primary bg-primary/5'
                : 'border-border/30 hover:border-border'
            )}
          >
            <span className="text-xl">{profile.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{profile.label}</span>
                <Badge variant="outline" className="text-[10px]">{profile.targetMonthly}/mo</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{profile.style}</p>
            </div>
            <div className="text-right text-xs shrink-0">
              <p className="text-muted-foreground">Risk/Trade</p>
              <p className="font-mono font-bold">{profile.maxRiskPerTrade}</p>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
};
