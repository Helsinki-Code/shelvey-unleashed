import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Link2, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface RadialTimelineItem {
  id: number;
  title: string;
  date: string;
  content: string;
  category: string;
  icon: React.ElementType;
  relatedIds: number[];
  status: "completed" | "in-progress" | "pending";
  energy: number;
}

interface RadialOrbitalTimelineProps {
  timelineData: RadialTimelineItem[];
}

export default function RadialOrbitalTimeline({ timelineData }: RadialOrbitalTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [rotationAngle, setRotationAngle] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rotationTimer: ReturnType<typeof setInterval> | null = null;
    if (autoRotate) {
      rotationTimer = setInterval(() => {
        setRotationAngle((prev) => Number(((prev + 0.25) % 360).toFixed(3)));
      }, 50);
    }
    return () => {
      if (rotationTimer) clearInterval(rotationTimer);
    };
  }, [autoRotate]);

  const getRelatedItems = (itemId: number): number[] => {
    const current = timelineData.find((item) => item.id === itemId);
    return current ? current.relatedIds : [];
  };

  const isRelatedToActive = (itemId: number): boolean => {
    if (!activeNodeId) return false;
    return getRelatedItems(activeNodeId).includes(itemId);
  };

  const toggleItem = (id: number) => {
    setExpandedItems((prev) => {
      const next: Record<number, boolean> = {};
      for (const key of Object.keys(prev)) next[Number(key)] = false;
      next[id] = !prev[id];

      if (!prev[id]) {
        setActiveNodeId(id);
        setAutoRotate(false);
        const related = getRelatedItems(id);
        const pulse: Record<number, boolean> = {};
        for (const relId of related) pulse[relId] = true;
        setPulseEffect(pulse);
      } else {
        setActiveNodeId(null);
        setAutoRotate(true);
        setPulseEffect({});
      }
      return next;
    });
  };

  const nodePositions = useMemo(() => {
    return timelineData.map((item, index) => {
      const angle = ((index / timelineData.length) * 360 + rotationAngle) % 360;
      const radius = 180;
      const radian = (angle * Math.PI) / 180;
      const x = radius * Math.cos(radian);
      const y = radius * Math.sin(radian);
      const zIndex = Math.round(100 + 50 * Math.cos(radian));
      const opacity = Math.max(0.45, Math.min(1, 0.45 + 0.55 * ((1 + Math.sin(radian)) / 2)));
      return { item, x, y, zIndex, opacity };
    });
  }, [timelineData, rotationAngle]);

  const getStatusStyles = (status: RadialTimelineItem["status"]) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-400/40";
      case "in-progress":
        return "bg-sky-500/20 text-sky-300 border-sky-400/40";
      default:
        return "bg-muted/30 text-muted-foreground border-border";
    }
  };

  return (
    <div
      className="w-full min-h-[560px] rounded-2xl border border-border bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden"
      ref={containerRef}
      onClick={(e) => {
        if (e.target === containerRef.current) {
          setExpandedItems({});
          setActiveNodeId(null);
          setPulseEffect({});
          setAutoRotate(true);
        }
      }}
    >
      <div className="relative h-[560px] flex items-center justify-center">
        <div className="absolute w-[380px] h-[380px] rounded-full border border-primary/20" />
        <div className="absolute w-14 h-14 rounded-full bg-gradient-to-br from-primary to-cyan-400/80 flex items-center justify-center shadow-xl shadow-primary/30">
          <div className="w-7 h-7 rounded-full bg-white/90" />
        </div>

        {nodePositions.map(({ item, x, y, zIndex, opacity }) => {
          const isExpanded = expandedItems[item.id];
          const isRelated = isRelatedToActive(item.id);
          const isPulsing = pulseEffect[item.id];
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              className="absolute transition-all duration-700 cursor-pointer"
              style={{
                transform: `translate(${x}px, ${y}px)`,
                zIndex: isExpanded ? 200 : zIndex,
                opacity: isExpanded ? 1 : opacity,
              }}
              onClick={(e) => {
                e.stopPropagation();
                toggleItem(item.id);
              }}
            >
              <div
                className={cn("absolute rounded-full -inset-1", isPulsing && "animate-pulse")}
                style={{
                  background: "radial-gradient(circle, rgba(56,189,248,0.25) 0%, rgba(56,189,248,0) 70%)",
                  width: `${item.energy * 0.45 + 40}px`,
                  height: `${item.energy * 0.45 + 40}px`,
                  left: `-${(item.energy * 0.45 + 40 - 40) / 2}px`,
                  top: `-${(item.energy * 0.45 + 40 - 40) / 2}px`,
                }}
              />
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  isExpanded
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/40 scale-125"
                    : isRelated
                      ? "bg-cyan-400/20 text-cyan-200 border-cyan-300"
                      : "bg-card text-foreground border-border",
                )}
              >
                <Icon size={16} />
              </div>
              <div className={cn("absolute top-12 whitespace-nowrap text-xs font-semibold transition-all", isExpanded ? "text-foreground scale-110" : "text-muted-foreground")}>
                {item.title}
              </div>

              {isExpanded && (
                <Card className="absolute top-20 left-1/2 -translate-x-1/2 w-72 bg-card/95 backdrop-blur border-border shadow-2xl">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <Badge className={getStatusStyles(item.status)}>
                        {item.status === "completed" ? "COMPLETE" : item.status === "in-progress" ? "IN PROGRESS" : "PENDING"}
                      </Badge>
                      <span className="text-xs font-mono text-muted-foreground">{item.date}</span>
                    </div>
                    <CardTitle className="text-sm mt-2">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    <p>{item.content}</p>
                    <div className="mt-4 pt-3 border-t border-border">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="flex items-center"><Zap size={10} className="mr-1" /> Energy Level</span>
                        <span className="font-mono">{item.energy}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-sky-500 to-emerald-500" style={{ width: `${item.energy}%` }} />
                      </div>
                    </div>

                    {item.relatedIds.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-border">
                        <div className="flex items-center mb-2">
                          <Link2 size={10} className="mr-1" />
                          <h4 className="text-xs uppercase tracking-wider font-medium">Connected Steps</h4>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {item.relatedIds.map((relatedId) => {
                            const related = timelineData.find((t) => t.id === relatedId);
                            return (
                              <Button
                                key={relatedId}
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 py-0 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleItem(relatedId);
                                }}
                              >
                                {related?.title}
                                <ArrowRight size={8} className="ml-1" />
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

