import { motion } from 'framer-motion';
import { Check, ExternalLink, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StoreConfig {
  id: string;
  name: string;
  icon: string;
  mcpId: string;
  requiredKeys: string[];
  color: string;
}

interface StoreConnectionCardProps {
  store: StoreConfig;
  isConnected: boolean;
  isSelected: boolean;
  isLoading: boolean;
  onSelect: () => void;
}

export const StoreConnectionCard = ({
  store,
  isConnected,
  isSelected,
  isLoading,
  onSelect
}: StoreConnectionCardProps) => {
  if (isLoading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-12 w-12 rounded-lg mb-3" />
        <Skeleton className="h-4 w-20 mb-2" />
        <Skeleton className="h-3 w-16" />
      </Card>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        className={cn(
          "cursor-pointer transition-all duration-200 overflow-hidden",
          isSelected && "ring-2 ring-primary border-primary",
          isConnected ? "hover:border-primary/50" : "opacity-75 hover:opacity-100"
        )}
        onClick={onSelect}
      >
        <div className={cn(
          "h-1 bg-gradient-to-r",
          store.color
        )} />
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <span className="text-3xl">{store.icon}</span>
            {isConnected ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                <Check className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-muted text-muted-foreground">
                <AlertCircle className="h-3 w-3 mr-1" />
                Setup Required
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-lg mb-1">{store.name}</h3>
          <p className="text-sm text-muted-foreground">
            {isConnected ? 'Click to manage' : 'Configure API keys'}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};
