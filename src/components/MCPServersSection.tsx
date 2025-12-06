import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mcpServers, categoryColors, MCPServer } from '@/lib/mcp-servers';
import { Search, Zap, Clock, Activity, ExternalLink, Check, Loader2, Key } from 'lucide-react';
import { Input } from './ui/input';

const ServerCard = ({ server, index }: { server: MCPServer; index: number }) => {
  const colors = categoryColors[server.category];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className={`relative group p-4 rounded-xl bg-card/50 backdrop-blur border border-border/50 
        hover:border-primary/30 transition-all duration-300 cursor-pointer overflow-hidden`}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
      </div>
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{server.icon}</div>
            <div>
              <h3 className="font-semibold text-foreground">{server.name}</h3>
              <span className={`text-[10px] font-mono uppercase tracking-wider ${colors.text}`}>
                {server.category}
              </span>
            </div>
          </div>
          
          {/* Status indicator */}
          <div className="flex items-center gap-1.5">
            {server.status === 'connected' && (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] text-emerald-400">Live</span>
              </>
            )}
            {server.status === 'syncing' && (
              <>
                <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                <span className="text-[10px] text-amber-400">Syncing</span>
              </>
            )}
            {server.status === 'requires-key' && (
              <>
                <Key className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Key Required</span>
              </>
            )}
          </div>
        </div>
        
        {/* Description */}
        <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
          {server.description}
        </p>
        
        {/* Stats */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{server.latency}ms</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Activity className="w-3 h-3" />
              <span>{server.requestsToday?.toLocaleString()}</span>
            </div>
          </div>
          <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      
      {/* Active pulse for connected servers */}
      {server.status === 'connected' && (
        <motion.div
          className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-500"
          animate={{ 
            boxShadow: ['0 0 0 0 rgba(16, 185, 129, 0.4)', '0 0 0 8px rgba(16, 185, 129, 0)', '0 0 0 0 rgba(16, 185, 129, 0)']
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
};

export const MCPServersSection = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MCPServer['category'] | 'all'>('all');
  
  const categories: Array<MCPServer['category'] | 'all'> = ['all', 'development', 'ai', 'voice', 'social', 'marketing', 'ecommerce', 'trading', 'design', 'automation', 'infrastructure', 'crm'];
  
  const filteredServers = mcpServers.filter(server => {
    const matchesSearch = server.name.toLowerCase().includes(search.toLowerCase()) ||
      server.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || server.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  
  const connectedCount = mcpServers.filter(s => s.status === 'connected').length;
  const totalRequests = mcpServers.reduce((acc, s) => acc + (s.requestsToday || 0), 0);
  
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-background to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/20 mb-6">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-mono text-primary">REAL-TIME MCP CONNECTIONS</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-gradient">52+ MCP Servers</span>
            <span className="text-foreground"> Connected</span>
          </h2>
          
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Real integrations with trading platforms, e-commerce stores, social media, 
            AI services, and more—powering autonomous business operations 24/7.
          </p>
          
          {/* Quick stats */}
          <div className="flex items-center justify-center gap-8 mt-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400">{connectedCount}</div>
              <div className="text-sm text-muted-foreground">Connected</div>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{totalRequests.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Requests Today</div>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-400">99.9%</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
          </div>
        </motion.div>
        
        {/* Search and filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search MCP servers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card/50 border-border/50"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider transition-all
                  ${selectedCategory === cat 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-card/50 text-muted-foreground hover:text-foreground border border-border/50 hover:border-primary/30'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        
        {/* Server grid */}
        <motion.div 
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filteredServers.map((server, index) => (
              <ServerCard key={server.id} server={server} index={index} />
            ))}
          </AnimatePresence>
        </motion.div>
        
        {filteredServers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No servers found matching your criteria
          </div>
        )}
      </div>
    </section>
  );
};
