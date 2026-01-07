import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {suggestions.map((suggestion, index) => (
        <motion.button
          key={suggestion}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => onSelect(suggestion)}
          className="group inline-flex items-center gap-2 px-3 py-2 rounded-full bg-muted hover:bg-primary/10 border border-border hover:border-primary/30 text-sm text-muted-foreground hover:text-foreground transition-all duration-200"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary opacity-50 group-hover:opacity-100" />
          <span className="max-w-[200px] truncate">{suggestion}</span>
        </motion.button>
      ))}
    </div>
  );
}
