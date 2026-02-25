import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

const TRUST_ITEMS = [
  'Your funds stay in YOUR accounts — always',
  'Agents have TRADE-ONLY access — never withdrawals',
  'API keys are encrypted with AES-256',
  'Full audit trail of every decision and trade',
  'Real-time monitoring with instant alerts',
  'Kill switch — pause everything instantly',
  'Paper trading sandbox for risk-free testing',
  'Maximum drawdown circuit breakers',
  'No black boxes — every trade decision is explained',
  'User retains full control at all times',
];

export const TrustFramework = () => {
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">🔒 Safety & Trust Architecture</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TRUST_ITEMS.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm">
              <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
              <span className="text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
