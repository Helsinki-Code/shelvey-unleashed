import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {suggestions.map((suggestion, index) => (
        <motion.button
          key={suggestion}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.08, duration: 0.2 }}
          onClick={() => onSelect(suggestion)}
          className="group text-left px-3.5 py-2.5 rounded-xl bg-muted/30 hover:bg-muted border border-border hover:border-primary/20 text-sm text-muted-foreground hover:text-foreground transition-all duration-200 flex items-center gap-2.5"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary/50 group-hover:text-primary shrink-0 transition-colors" />
          <span className="line-clamp-2">{suggestion}</span>
        </motion.button>
      ))}
    </div>
  );
}