import { useParams, Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, User, Share2, Twitter, Linkedin, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { toast } from 'sonner';

// Blog posts data (same as BlogPage - in production, this would come from a database)
const blogPosts = [
  {
    id: '1',
    slug: 'autonomous-ai-agents-future-business-automation',
    title: 'How Autonomous AI Agents Are Revolutionizing Business Automation in 2024',
    excerpt: 'Discover how ShelVey\'s 25 specialized AI agents work together to automate entire business workflows, from market research to sales execution, without human intervention.',
    content: `The business landscape is undergoing a seismic shift. While traditional automation tools handle repetitive tasks, **autonomous AI agents** are now capable of executing complex, multi-step business operations independently. At ShelVey, we've built the first truly autonomous AI workforce—25 specialized agents that operate like a real company.

## What Makes Autonomous AI Agents Different?

Unlike chatbots or simple automation scripts, autonomous AI agents can:

- **Make decisions independently** based on real-time data
- **Collaborate with other agents** to complete complex tasks
- **Learn and adapt** from outcomes to improve performance
- **Execute multi-step workflows** without human supervision

## ShelVey's 25-Agent Ecosystem

Our agent ecosystem mirrors a real corporate structure:

### Research Division
- Market Research Agent
- Trend Prediction Agent
- Competitor Analysis Agent

### Brand & Design Division
- Brand Identity Agent
- Visual Design Agent
- Content Creator Agent

### Development Division
- Frontend Developer Agent
- Backend Developer Agent
- QA Testing Agent
- DevOps Agent

### Marketing Division
- SEO Optimization Agent
- Social Media Manager
- Paid Ads Specialist
- Influencer Outreach Agent

### Sales Division
- Sales Development Agent
- Sales Closer Agent
- Customer Success Agent

## Real-World Impact

Businesses using autonomous AI agents report:

- **70% reduction** in time-to-market
- **50% cost savings** on operational overhead
- **24/7 operations** without additional staffing
- **Consistent quality** across all deliverables

## Getting Started with ShelVey

Starting your autonomous business journey is simple:

1. Sign up and create your AI CEO
2. Describe your business idea
3. Watch as agents research, design, build, and market your business

The future of business isn't about replacing humans—it's about augmenting human capabilities with intelligent, autonomous systems that handle the execution while you focus on strategy.`,
    author: 'ShelVey Team',
    publishedAt: '2024-12-15',
    readTime: '8 min read',
    category: 'AI Technology',
    tags: ['AI Agents', 'Automation', 'Business', 'Future of Work'],
  },
  {
    id: '2',
    slug: 'mcp-servers-explained-connecting-ai-to-real-world-services',
    title: 'MCP Servers Explained: How ShelVey Connects AI Agents to 27+ Real-World Services',
    excerpt: 'Learn how Model Context Protocol (MCP) servers enable ShelVey\'s AI agents to interact with Stripe, GitHub, social media platforms, and more—creating truly functional business automation.',
    content: `One of the biggest challenges in AI automation is bridging the gap between intelligent language models and real-world actions. Enter **Model Context Protocol (MCP) servers**—the technology that enables ShelVey's agents to actually *do things* in the real world.

## What Are MCP Servers?

MCP (Model Context Protocol) servers act as standardized bridges between AI agents and external services. Instead of building custom integrations for each API, MCP provides a unified protocol that agents can use to:

- **Read data** from external services
- **Execute actions** like creating posts, processing payments, or deploying code
- **Maintain context** across multiple interactions

## ShelVey's 27+ MCP Integrations

Our platform connects to the services businesses actually use:

### Finance & Payments
- **Stripe MCP**: Process payments, manage subscriptions, handle refunds
- **Coinbase MCP**: Cryptocurrency operations and trading

### Development & Deployment
- **GitHub MCP**: Repository management, code commits, PR reviews
- **Vercel MCP**: Automatic deployments and hosting
- **Cloudflare MCP**: DNS management, edge functions, CDN configuration

### Social Media & Marketing
- **Twitter/X MCP**: Post tweets, manage engagement, analytics
- **LinkedIn MCP**: Professional networking and content
- **Instagram MCP**: Visual content publishing
- **Facebook MCP**: Page management and advertising
- **TikTok MCP**: Short-form video distribution

### Productivity
- **Google Calendar MCP**: Scheduling and event management
- **Linear MCP**: Project and issue tracking
- **Calendly MCP**: Meeting scheduling

### AI & Generation
- **OpenAI MCP**: Advanced language processing
- **Fal.ai MCP**: Image generation and editing
- **Perplexity MCP**: Real-time web research

## How Agents Use MCP Servers

When our Social Media Manager agent needs to post content:

1. Content Creator agent generates the post
2. Visual Design agent creates accompanying images via Fal.ai MCP
3. Social Media Manager schedules via Twitter/Instagram/LinkedIn MCPs
4. Analytics tracking begins automatically

All of this happens autonomously, with agents dynamically selecting the right MCP servers for each task.

## Security & Authentication

MCP servers in ShelVey use:

- **User-provided API keys** for personal accounts
- **Admin-provided keys** for general services (DFY plan users)
- **Encrypted storage** for all credentials
- **Row-level security** ensuring data isolation

## The Power of Real Integration

Unlike tools that just generate content and leave you to publish manually, ShelVey agents actually execute real-world actions through these integrations.`,
    author: 'ShelVey Team',
    publishedAt: '2024-12-14',
    readTime: '6 min read',
    category: 'Technology',
    tags: ['MCP', 'API Integration', 'Automation', 'AI Infrastructure'],
  },
  {
    id: '3',
    slug: 'building-business-with-ai-6-phase-methodology',
    title: 'Building a Business with AI: ShelVey\'s 6-Phase Autonomous Methodology',
    excerpt: 'From market research to revenue generation—explore the structured 6-phase approach that ShelVey\'s AI agents use to build complete businesses autonomously.',
    content: `Starting a business traditionally requires months of planning, design, development, and marketing. ShelVey's autonomous AI workforce compresses this timeline dramatically through a structured 6-phase methodology.

## The 6-Phase Business Building Pipeline

### Phase 1: Research & Discovery

**Duration**: 2-3 days  
**Active Agents**: Market Research, Trend Prediction, Competitor Analysis

In this phase, agents analyze market size, identify target demographics, research competitors, and generate comprehensive reports with citations.

### Phase 2: Brand & Identity

**Duration**: 3-4 days  
**Active Agents**: Brand Identity, Visual Design, Content Creator

Agents create logos, color palettes, typography systems, and brand guidelines.

### Phase 3: Development & Build

**Duration**: 5-7 days  
**Active Agents**: Frontend Developer, Backend Developer, QA Testing, DevOps

The development team generates React/TypeScript websites, integrates payment processing, and handles deployment.

### Phase 4: Content Creation

**Duration**: 3-4 days  
**Active Agents**: Content Creator, SEO Optimization, Visual Design

Content production includes website copy, blog posts, email templates, and social media calendars.

### Phase 5: Marketing Launch

**Duration**: 4-5 days  
**Active Agents**: SEO, Social Media Manager, Paid Ads, Influencer Outreach

Launch activities include social campaigns, paid advertising, and influencer partnerships.

### Phase 6: Sales & Growth

**Duration**: Ongoing  
**Active Agents**: Sales Development, Sales Closer, Customer Success

Growth operations include lead pipeline management, sales optimization, and customer onboarding.

## Dual Approval Workflow

Every deliverable requires CEO Agent review AND user approval, ensuring quality while maintaining user control.`,
    author: 'ShelVey Team',
    publishedAt: '2024-12-13',
    readTime: '10 min read',
    category: 'Business Strategy',
    tags: ['Business Building', 'Methodology', 'AI Workflow', 'Entrepreneurship'],
  },
  {
    id: '4',
    slug: 'ai-ceo-personalization-custom-business-partner',
    title: 'Meet Your AI CEO: How ShelVey Creates Your Personalized Business Partner',
    excerpt: 'Discover how ShelVey\'s custom AI CEO system creates a unique, personalized business partner with its own voice, personality, and communication style.',
    content: `What if you could have a CEO dedicated entirely to your business—available 24/7, with perfect recall, and tireless execution? ShelVey makes this possible through our custom AI CEO system.

## Creating Your AI CEO

When you join ShelVey, you create a personalized AI executive with:

- **Custom Name**: Choose or generate a unique name
- **Persona Types**: Friendly, Professional, Direct, Nurturing, or Visionary
- **Voice Selection**: Premium ElevenLabs voices
- **Communication Style**: Formal, casual, or balanced
- **Language Support**: Multiple languages available

## What Your CEO Does

Your AI CEO is an orchestrator that reviews work, delegates tasks, monitors progress, and communicates directly with you through voice calls and emails.

## CEO-Agent Hierarchy

Your CEO sits atop the organizational structure, overseeing the COO and all division managers, creating a realistic corporate structure.`,
    author: 'ShelVey Team',
    publishedAt: '2024-12-12',
    readTime: '7 min read',
    category: 'Product Features',
    tags: ['AI CEO', 'Personalization', 'Voice AI', 'Business Partner'],
  },
  {
    id: '5',
    slug: 'real-time-agent-monitoring-transparency-ai-work',
    title: 'Real-Time Agent Monitoring: Complete Transparency Into Your AI Workforce',
    excerpt: 'See exactly what your AI agents are doing with live activity feeds, screenshots, work logs, and citations—ensuring full transparency and accountability.',
    content: `One of the biggest concerns with AI automation is the "black box" problem. ShelVey solves this with comprehensive real-time monitoring.

## Full Visibility Features

- **Live Activity Feeds**: Every action logged in real-time
- **Screenshot Documentation**: Visual progress captured at each step
- **Work Logs**: Step-by-step action logs with reasoning
- **Citations & Sources**: All research includes verifiable sources

## Dashboard Views

- Global Activity Panel for all agents
- Phase-specific views for detailed progress
- Export capabilities in PDF, Word, JSON, and HTML

## Notification System

Stay informed with browser alerts, email updates, and escalation notices—all configurable per event type.`,
    author: 'ShelVey Team',
    publishedAt: '2024-12-11',
    readTime: '6 min read',
    category: 'Product Features',
    tags: ['Monitoring', 'Transparency', 'AI Accountability', 'Real-Time'],
  },
];

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = blogPosts.find(p => p.slug === slug);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const handleShare = (platform: string) => {
    const url = `https://shelvey.pro/blog/${post.slug}`;
    const text = post.title;

    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
    } else if (platform === 'linkedin') {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
    } else if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{post.title} - ShelVey Blog</title>
        <meta name="description" content={post.excerpt} />
        <meta name="keywords" content={post.tags.join(', ')} />
        <link rel="canonical" href={`https://shelvey.pro/blog/${post.slug}`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://shelvey.pro/blog/${post.slug}`} />
        <meta property="article:published_time" content={post.publishedAt} />
        <meta property="article:author" content={post.author} />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.excerpt} />
        
        {/* JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.title,
            "description": post.excerpt,
            "datePublished": post.publishedAt,
            "author": {
              "@type": "Organization",
              "name": post.author
            },
            "publisher": {
              "@type": "Organization",
              "name": "ShelVey, LLC",
              "url": "https://shelvey.pro"
            },
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": `https://shelvey.pro/blog/${post.slug}`
            }
          })}
        </script>
      </Helmet>

      <Navbar />

      <main className="pt-24 pb-20">
        <article className="container mx-auto px-4 max-w-4xl">
          {/* Back Button */}
          <Link to="/blog">
            <Button variant="ghost" className="gap-2 mb-8">
              <ArrowLeft className="w-4 h-4" />
              Back to Blog
            </Button>
          </Link>

          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <Badge className="mb-4">{post.category}</Badge>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              {post.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-6 text-muted-foreground mb-6">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {post.author}
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {post.publishedAt}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {post.readTime}
              </span>
            </div>

            {/* Share Buttons */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground mr-2">Share:</span>
              <Button variant="outline" size="icon" onClick={() => handleShare('twitter')}>
                <Twitter className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => handleShare('linkedin')}>
                <Linkedin className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => handleShare('copy')}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </motion.header>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="prose prose-lg dark:prose-invert max-w-none"
          >
            {post.content.split('\n').map((paragraph, index) => {
              if (paragraph.startsWith('## ')) {
                return <h2 key={index} className="text-2xl font-bold mt-8 mb-4">{paragraph.replace('## ', '')}</h2>;
              }
              if (paragraph.startsWith('### ')) {
                return <h3 key={index} className="text-xl font-semibold mt-6 mb-3">{paragraph.replace('### ', '')}</h3>;
              }
              if (paragraph.startsWith('- ')) {
                return <li key={index} className="ml-6">{paragraph.replace('- ', '')}</li>;
              }
              if (paragraph.trim() === '') {
                return null;
              }
              return <p key={index} className="mb-4 text-muted-foreground leading-relaxed">{paragraph}</p>;
            })}
          </motion.div>

          {/* Tags */}
          <div className="mt-12 pt-8 border-t border-border">
            <h3 className="text-sm font-medium mb-4">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {post.tags.map(tag => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          </div>

          {/* CTA */}
          <Card className="mt-12 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <CardContent className="py-8 text-center">
              <h3 className="text-xl font-bold mb-2">Ready to Transform Your Business?</h3>
              <p className="text-muted-foreground mb-4">
                Experience the power of 25 autonomous AI agents working for you.
              </p>
              <Link to="/pricing">
                <Button>Get Started with ShelVey</Button>
              </Link>
            </CardContent>
          </Card>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default BlogPostPage;
