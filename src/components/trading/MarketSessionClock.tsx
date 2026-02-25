import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MARKET_SESSIONS } from '@/lib/trading-agents';

export const MarketSessionClock = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const utcHour = now.getUTCHours();

  const isSessionActive = (sessionId: string) => {
    switch (sessionId) {
      case 'asia': return utcHour >= 0 && utcHour < 9;
      case 'europe': return utcHour >= 7 && utcHour < 16;
      case 'americas': return utcHour >= 13 && utcHour < 21;
      case 'crypto': return true;
      default: return false;
    }
  };

  const isOverlap = () => {
    if (utcHour >= 7 && utcHour < 9) return 'Asia ↔ Europe';
    if (utcHour >= 13 && utcHour < 16) return 'Europe ↔ Americas';
    return null;
  };

  const overlap = isOverlap();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">🌐 24-Hour Market Coverage</CardTitle>
          <span className="font-mono text-xs text-muted-foreground">
            {now.toUTCString().slice(17, 25)} UTC
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {MARKET_SESSIONS.map((session) => {
          const active = isSessionActive(session.id);
          return (
            <div
              key={session.id}
              className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                active ? 'border-primary/30 bg-primary/5' : 'border-border/30 opacity-60'
              }`}
            >
              <span className="text-xl">{session.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{session.label}</span>
                  {active && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                </div>
                <p className="text-xs text-muted-foreground">{session.hours} • {session.cities}</p>
              </div>
              <Badge variant={active ? 'default' : 'outline'} className="text-[10px]">
                {active ? 'LIVE' : 'CLOSED'}
              </Badge>
            </div>
          );
        })}
        {overlap && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <span className="text-sm">🔄</span>
            <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
              OVERLAP: {overlap} — Peak Opportunity Window
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
