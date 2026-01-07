import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeployRequest {
  websiteId: string;
  projectId?: string;
  customDomain?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vercelToken = Deno.env.get('VERCEL_API_TOKEN');

    if (!vercelToken) {
      return new Response(JSON.stringify({ 
        error: 'VERCEL_API_TOKEN not configured',
        message: 'Please add your Vercel API token in settings'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const userSupabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { websiteId, projectId, customDomain }: DeployRequest = await req.json();

    // Get website data
    const { data: website, error: websiteError } = await supabase
      .from('generated_websites')
      .select('*, business_projects(*)')
      .eq('id', websiteId)
      .eq('user_id', user.id)
      .single();

    if (websiteError || !website) {
      return new Response(JSON.stringify({ error: 'Website not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all approved pages from website_pages table
    const lookupProjectId = projectId || website.project_id;
    const { data: websitePages, error: pagesError } = await supabase
      .from('website_pages')
      .select('*')
      .eq('project_id', lookupProjectId)
      .eq('user_approved', true)
      .order('page_route');

    if (pagesError) {
      console.error('Error fetching pages:', pagesError);
    }

    const projectName = website.business_projects?.name || website.name;
    const sanitizedName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 50);
    const vercelProjectName = `shelvey-${sanitizedName}-${websiteId.slice(0, 8)}`;

    console.log(`Deploying ${vercelProjectName} to Vercel with ${websitePages?.length || 0} pages...`);

    // Build deployment files from website_pages
    const deploymentFiles: { file: string; data: string; encoding: string }[] = [];

    // Helper function to create HTML wrapper for React code
    const createHtmlWrapper = (pageCode: string, pageName: string) => {
      // Clean up the code - remove imports, exports, and TypeScript annotations
      let cleanCode = pageCode
        // Remove import statements
        .replace(/^import\s+.*?['"];?\s*$/gm, '')
        // Remove export statements but keep the component content
        .replace(/^export\s+(default\s+)?/gm, '')
        // Remove TypeScript type annotations
        .replace(/:\s*(string|number|boolean|any|void|React\.\w+|\w+\[\])\s*([,\)\}=])/g, '$2')
        .replace(/<(\w+)([^>]*)\s+as\s+\w+([^>]*)>/g, '<$1$2$3>')
        // Remove interface/type declarations
        .replace(/^(interface|type)\s+\w+\s*(\{[\s\S]*?\}|=[\s\S]*?;)\s*$/gm, '')
        .trim();

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageName} - ${projectName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; }
    .animate-fade-in { animation: fadeIn 0.5s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    // Mock framer-motion
    const motion = new Proxy({}, {
      get: (target, prop) => {
        return React.forwardRef((props, ref) => {
          const { initial, animate, whileInView, whileHover, whileTap, transition, viewport, variants, ...rest } = props;
          return React.createElement(prop, { ...rest, ref, className: \`\${rest.className || ''} animate-fade-in\` });
        });
      }
    });
    const AnimatePresence = ({ children }) => children;
    const useInView = () => [null, true];
    const useScroll = () => ({ scrollYProgress: { get: () => 0 } });
    const useTransform = (val, input, output) => output?.[0] || 0;
    const useMotionValue = (val) => ({ get: () => val, set: () => {} });
    const useSpring = (val) => val;

    // Mock lucide-react icons
    const createIcon = (name) => (props) => React.createElement('span', { 
      className: \`inline-block w-6 h-6 \${props.className || ''}\`, 
      style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }
    }, '●');
    
    const Icons = new Proxy({}, { get: (_, name) => createIcon(name) });
    const { CheckCircle, Star, ArrowRight, Menu, X, ChevronRight, ChevronDown, Play, Users, Award, BookOpen, Clock, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram, Youtube, Github, Globe, Heart, Shield, Zap, Target, Rocket, Code, Database, Cloud, Lock, Unlock, Settings, User, Search, Home, Info, HelpCircle, AlertCircle, XCircle, Check, Plus, Minus, Edit, Trash, Download, Upload, Share, Copy, Link, ExternalLink, Eye, EyeOff, Bell, Calendar, Image, Video, FileText, Folder, File, Send, MessageCircle, MessageSquare, ThumbsUp, ThumbsDown, Bookmark, Tag, Filter, Grid, List, MoreHorizontal, MoreVertical, RefreshCw, RotateCw, Loader, Loader2, Save, LogIn, LogOut, UserPlus, UserMinus, Briefcase, Building, CreditCard, DollarSign, TrendingUp, TrendingDown, BarChart, PieChart, Activity, Cpu, Server, Wifi, WifiOff, Battery, BatteryCharging, Sun, Moon, CloudRain, Wind, Thermometer, Droplet, Umbrella, Sunrise, Sunset, Camera, Mic, MicOff, Volume, Volume1, Volume2, VolumeX, Headphones, Radio, Tv, Monitor, Smartphone, Tablet, Laptop, Watch, Printer, Terminal, Command, GitBranch, GitCommit, GitMerge, GitPullRequest, Package, Box, Archive, Layers, Layout, Sidebar, PanelLeft, PanelRight, Maximize, Minimize, Expand, Shrink, Move, Crosshair, Navigation, Map, Compass, Flag, Anchor, Truck, Car, Plane, Train, Bus, Bike, Ship, ShoppingCart, ShoppingBag, Gift, Percent, Receipt, Wallet, PiggyBank, Banknote, Coins, Calculator, Scale, Ruler, Scissors, Crop, Palette, Brush, Pencil, Pen, Highlighter, Eraser, Type, Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify, Indent, Outdent, Quote, ListOrdered, ListTree, Table, Columns, Rows, Hash, AtSign, Paperclip, Pin, Bookmark as BookmarkIcon, Flag as FlagIcon, AlertTriangle, AlertOctagon, Info as InfoIcon, HelpCircle as HelpCircleIcon, XOctagon, MinusCircle, PlusCircle, CheckCircle2, XCircle as XCircleIcon, Circle, Square, Triangle, Hexagon, Octagon, Pentagon, Diamond, Gem, Crown, Medal, Trophy, Flame, Sparkles, PartyPopper, Confetti, Cake, Wine, Coffee, Beer, Pizza, Apple, Leaf, TreeDeciduous, Flower, Flower2, Bug, Feather, Footprints, Paw, Fish, Bird, Rabbit, Cat, Dog, Turtle, Snail, Worm, Bee, Butterfly, Clover, Mushroom, Bone, Skull, Ghost, Alien, Bot, Robot } = Icons;

    // Component code
    ${cleanCode}

    // Find the main component function
    const componentMatch = \`${cleanCode}\`.match(/function\\s+(\\w+Page|\\w+Component|\\w+)\\s*\\(/);
    const ComponentName = componentMatch ? componentMatch[1] : 'App';
    
    // Render
    try {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      const Component = eval(ComponentName);
      root.render(React.createElement(Component));
    } catch (e) {
      console.error('Render error:', e);
      document.getElementById('root').innerHTML = '<div style="padding: 20px; color: red;">Error loading page: ' + e.message + '</div>';
    }
  </script>
</body>
</html>`;
    };

    // Add pages from website_pages table
    if (websitePages && websitePages.length > 0) {
      for (const page of websitePages) {
        const route = page.page_route === '/' ? 'index.html' : 
                      page.page_route.replace(/^\//, '').replace(/\/$/, '') + '.html';
        
        const htmlContent = createHtmlWrapper(page.page_code, page.page_name);
        
        deploymentFiles.push({
          file: route,
          data: btoa(unescape(encodeURIComponent(htmlContent))),
          encoding: 'base64',
        });
      }
    } else {
      // Fallback to legacy html_content if no pages exist
      const htmlContent = website.html_content || '<html><body><h1>No content</h1></body></html>';
      const cssContent = website.css_content || '';
      const jsContent = website.js_content || '';

      const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>${cssContent}</style>
</head>
<body>
${htmlContent}
<script>${jsContent}</script>
</body>
</html>`;

      deploymentFiles.push({
        file: 'index.html',
        data: btoa(unescape(encodeURIComponent(fullHtml))),
        encoding: 'base64',
      });
    }

    console.log(`Prepared ${deploymentFiles.length} files for deployment`);

    // Step 1: Create or get existing project
    let vercelProjectId: string;
    
    const projectCheckResponse = await fetch(
      `https://api.vercel.com/v9/projects/${vercelProjectName}`,
      {
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
        },
      }
    );

    if (projectCheckResponse.ok) {
      const existingProject = await projectCheckResponse.json();
      vercelProjectId = existingProject.id;
      console.log(`Using existing Vercel project: ${vercelProjectId}`);
    } else {
      const createProjectResponse = await fetch(
        'https://api.vercel.com/v9/projects',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: vercelProjectName,
            framework: null,
          }),
        }
      );

      if (!createProjectResponse.ok) {
        const error = await createProjectResponse.text();
        console.error('Failed to create Vercel project:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to create Vercel project',
          details: error 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const newProject = await createProjectResponse.json();
      vercelProjectId = newProject.id;
      console.log(`Created new Vercel project: ${vercelProjectId}`);
    }

    // Step 2: Create deployment
    const deploymentResponse = await fetch(
      'https://api.vercel.com/v13/deployments',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: vercelProjectName,
          files: deploymentFiles,
          projectSettings: {
            framework: null,
          },
          target: 'production',
        }),
      }
    );

    if (!deploymentResponse.ok) {
      const error = await deploymentResponse.text();
      console.error('Failed to deploy to Vercel:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to deploy to Vercel',
        details: error 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const deployment = await deploymentResponse.json();
    const deployedUrl = `https://${deployment.url}`;
    const productionUrl = `https://${vercelProjectName}.vercel.app`;

    console.log(`Deployed to Vercel: ${deployedUrl}`);

    // Step 3: Add custom domain if provided
    let customDomainResult = null;
    if (customDomain) {
      const addDomainResponse = await fetch(
        `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: customDomain,
          }),
        }
      );

      if (addDomainResponse.ok) {
        customDomainResult = await addDomainResponse.json();
        console.log(`Added custom domain: ${customDomain}`);
      } else {
        const domainError = await addDomainResponse.text();
        console.log(`Custom domain note: ${domainError}`);
        customDomainResult = { 
          warning: 'Domain may already be added or requires DNS configuration',
          details: domainError 
        };
      }
    }

    // Get DNS configuration for custom domain
    let dnsConfig = null;
    if (customDomain) {
      dnsConfig = {
        aRecord: { type: 'A', name: '@', value: '76.76.21.21' },
        cnameRecord: { type: 'CNAME', name: 'www', value: 'cname.vercel-dns.com' },
      };
    }

    // Update database
    await supabase
      .from('generated_websites')
      .update({
        deployed_url: customDomain ? `https://${customDomain}` : productionUrl,
        hosting_type: 'vercel',
        status: 'deployed',
        custom_domain: customDomain || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', websiteId);

    // Create/update hosting record
    const hostingData = {
      user_id: user.id,
      website_id: websiteId,
      hosting_type: 'vercel',
      domain: customDomain || `${vercelProjectName}.vercel.app`,
      subdomain: vercelProjectName,
      dns_verified: !customDomain,
      ssl_provisioned: true,
      a_record: dnsConfig?.aRecord?.value || null,
      cname_record: dnsConfig?.cnameRecord?.value || null,
    };

    await supabase
      .from('website_hosting')
      .upsert(hostingData, { onConflict: 'website_id' });

    // Log activity
    await supabase.from('agent_activity_logs').insert({
      agent_id: 'vercel-deployer',
      agent_name: 'Vercel Deployer',
      action: `Deployed website to Vercel: ${productionUrl}`,
      status: 'completed',
      metadata: { 
        websiteId, 
        deploymentId: deployment.id,
        url: productionUrl,
        customDomain,
        pagesDeployed: deploymentFiles.length,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      deploymentId: deployment.id,
      deploymentUrl: deployedUrl,
      productionUrl,
      projectId: vercelProjectId,
      projectName: vercelProjectName,
      customDomain: customDomain || null,
      customDomainResult,
      dnsConfig,
      pagesDeployed: deploymentFiles.length,
      message: customDomain 
        ? `Deployed! Configure DNS for ${customDomain} to complete setup.`
        : `Website deployed to ${productionUrl}`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in deploy-to-vercel:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
