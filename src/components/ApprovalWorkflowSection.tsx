import { motion } from 'framer-motion';
import { Check, User, Crown, Eye, Camera, Link, FileText, Shield } from 'lucide-react';

export const ApprovalWorkflowSection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/10 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/20 mb-6">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-mono text-primary">HUMAN-IN-THE-LOOP</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-foreground">You're </span>
            <span className="text-gradient">Always in Control</span>
          </h2>
          
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Every deliverable requires dual approval. Your AI CEO reviews first, 
            then you make the final call. Nothing progresses without your consent.
          </p>
        </motion.div>
        
        {/* 2-Tier Approval Flow */}
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 items-center">
            {/* Agent Work */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-6 rounded-2xl bg-card border border-border"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Agent Creates</h3>
              <p className="text-sm text-muted-foreground">
                Agents complete deliverables with screenshots, citations, and full work documentation.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="px-2 py-1 rounded bg-muted text-[10px] flex items-center gap-1">
                  <Camera className="w-3 h-3" /> Screenshots
                </span>
                <span className="px-2 py-1 rounded bg-muted text-[10px] flex items-center gap-1">
                  <Link className="w-3 h-3" /> Citations
                </span>
              </div>
            </motion.div>
            
            {/* CEO Review */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center mb-4">
                <Crown className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">CEO Reviews</h3>
              <p className="text-sm text-muted-foreground">
                Your AI CEO evaluates quality, provides feedback, and approves or requests revisions.
              </p>
              <div className="mt-4">
                <div className="flex items-center gap-2 text-xs text-amber-500">
                  <Eye className="w-4 h-4" />
                  <span>Quality Score • Feedback • Approval</span>
                </div>
              </div>
            </motion.div>
            
            {/* User Approval */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                <User className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">You Approve</h3>
              <p className="text-sm text-muted-foreground">
                Final decision is always yours. Accept, request changes, or provide specific feedback.
              </p>
              <div className="mt-4">
                <div className="flex items-center gap-2 text-xs text-emerald-500">
                  <Check className="w-4 h-4" />
                  <span>Final Authority • Full Control</span>
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Flow arrows */}
          <div className="hidden md:flex justify-center items-center gap-4 mt-8">
            <motion.div
              animate={{ x: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <span className="text-sm">Submit</span>
              <div className="w-20 h-px bg-gradient-to-r from-blue-500 to-amber-500" />
            </motion.div>
            <motion.div
              animate={{ x: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <span className="text-sm">Review</span>
              <div className="w-20 h-px bg-gradient-to-r from-amber-500 to-emerald-500" />
            </motion.div>
            <span className="text-sm text-muted-foreground">Approve</span>
          </div>
        </div>
        
        {/* Features grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-4 gap-4 mt-16"
        >
          {[
            { icon: Camera, title: 'Visual Proof', desc: 'Screenshots of every step' },
            { icon: Link, title: 'Real Citations', desc: 'Verifiable sources' },
            { icon: FileText, title: 'Work Logs', desc: 'Complete audit trail' },
            { icon: Shield, title: 'Quality Gates', desc: 'No phase skipping' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-4 rounded-xl bg-card/50 border border-border/50 text-center"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-semibold text-foreground text-sm">{item.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
