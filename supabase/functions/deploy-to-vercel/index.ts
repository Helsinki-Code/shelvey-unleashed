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

    // Mock lucide-react icons - use Proxy to handle any icon name dynamically
    const createIcon = (name) => (props) => React.createElement('span', { 
      className: \`inline-block w-6 h-6 \${props.className || ''}\`, 
      style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }
    }, '●');
    
    // Create a Proxy that returns an icon component for any property access
    const LucideIcons = new Proxy({}, { 
      get: (_, name) => createIcon(name) 
    });
    
    // Destructure commonly used icons
    const CheckCircle = LucideIcons.CheckCircle;
    const Star = LucideIcons.Star;
    const ArrowRight = LucideIcons.ArrowRight;
    const Menu = LucideIcons.Menu;
    const X = LucideIcons.X;
    const ChevronRight = LucideIcons.ChevronRight;
    const ChevronDown = LucideIcons.ChevronDown;
    const ChevronUp = LucideIcons.ChevronUp;
    const ChevronLeft = LucideIcons.ChevronLeft;
    const Play = LucideIcons.Play;
    const Pause = LucideIcons.Pause;
    const Users = LucideIcons.Users;
    const Award = LucideIcons.Award;
    const BookOpen = LucideIcons.BookOpen;
    const Clock = LucideIcons.Clock;
    const Mail = LucideIcons.Mail;
    const Phone = LucideIcons.Phone;
    const MapPin = LucideIcons.MapPin;
    const Facebook = LucideIcons.Facebook;
    const Twitter = LucideIcons.Twitter;
    const Linkedin = LucideIcons.Linkedin;
    const Instagram = LucideIcons.Instagram;
    const Youtube = LucideIcons.Youtube;
    const Github = LucideIcons.Github;
    const Globe = LucideIcons.Globe;
    const Heart = LucideIcons.Heart;
    const Shield = LucideIcons.Shield;
    const Zap = LucideIcons.Zap;
    const Target = LucideIcons.Target;
    const Rocket = LucideIcons.Rocket;
    const Code = LucideIcons.Code;
    const Database = LucideIcons.Database;
    const Cloud = LucideIcons.Cloud;
    const Lock = LucideIcons.Lock;
    const Unlock = LucideIcons.Unlock;
    const Settings = LucideIcons.Settings;
    const User = LucideIcons.User;
    const Search = LucideIcons.Search;
    const Home = LucideIcons.Home;
    const Info = LucideIcons.Info;
    const HelpCircle = LucideIcons.HelpCircle;
    const AlertCircle = LucideIcons.AlertCircle;
    const XCircle = LucideIcons.XCircle;
    const Check = LucideIcons.Check;
    const Plus = LucideIcons.Plus;
    const Minus = LucideIcons.Minus;
    const Edit = LucideIcons.Edit;
    const Trash = LucideIcons.Trash;
    const Download = LucideIcons.Download;
    const Upload = LucideIcons.Upload;
    const Share = LucideIcons.Share;
    const Copy = LucideIcons.Copy;
    const Link = LucideIcons.Link;
    const ExternalLink = LucideIcons.ExternalLink;
    const Eye = LucideIcons.Eye;
    const EyeOff = LucideIcons.EyeOff;
    const Bell = LucideIcons.Bell;
    const Calendar = LucideIcons.Calendar;
    const Image = LucideIcons.Image;
    const Video = LucideIcons.Video;
    const FileText = LucideIcons.FileText;
    const Folder = LucideIcons.Folder;
    const File = LucideIcons.File;
    const Send = LucideIcons.Send;
    const MessageCircle = LucideIcons.MessageCircle;
    const MessageSquare = LucideIcons.MessageSquare;
    const ThumbsUp = LucideIcons.ThumbsUp;
    const ThumbsDown = LucideIcons.ThumbsDown;
    const Bookmark = LucideIcons.Bookmark;
    const BookmarkIcon = LucideIcons.Bookmark;
    const Tag = LucideIcons.Tag;
    const Filter = LucideIcons.Filter;
    const Grid = LucideIcons.Grid;
    const List = LucideIcons.List;
    const MoreHorizontal = LucideIcons.MoreHorizontal;
    const MoreVertical = LucideIcons.MoreVertical;
    const RefreshCw = LucideIcons.RefreshCw;
    const RotateCw = LucideIcons.RotateCw;
    const Loader = LucideIcons.Loader;
    const Loader2 = LucideIcons.Loader2;
    const Save = LucideIcons.Save;
    const LogIn = LucideIcons.LogIn;
    const LogOut = LucideIcons.LogOut;
    const UserPlus = LucideIcons.UserPlus;
    const UserMinus = LucideIcons.UserMinus;
    const Briefcase = LucideIcons.Briefcase;
    const Building = LucideIcons.Building;
    const CreditCard = LucideIcons.CreditCard;
    const DollarSign = LucideIcons.DollarSign;
    const TrendingUp = LucideIcons.TrendingUp;
    const TrendingDown = LucideIcons.TrendingDown;
    const BarChart = LucideIcons.BarChart;
    const PieChart = LucideIcons.PieChart;
    const Activity = LucideIcons.Activity;
    const Cpu = LucideIcons.Cpu;
    const Server = LucideIcons.Server;
    const Wifi = LucideIcons.Wifi;
    const WifiOff = LucideIcons.WifiOff;
    const Battery = LucideIcons.Battery;
    const BatteryCharging = LucideIcons.BatteryCharging;
    const Sun = LucideIcons.Sun;
    const Moon = LucideIcons.Moon;
    const CloudRain = LucideIcons.CloudRain;
    const Wind = LucideIcons.Wind;
    const Thermometer = LucideIcons.Thermometer;
    const Droplet = LucideIcons.Droplet;
    const Umbrella = LucideIcons.Umbrella;
    const Sunrise = LucideIcons.Sunrise;
    const Sunset = LucideIcons.Sunset;
    const Camera = LucideIcons.Camera;
    const Mic = LucideIcons.Mic;
    const MicOff = LucideIcons.MicOff;
    const Volume = LucideIcons.Volume;
    const Volume1 = LucideIcons.Volume1;
    const Volume2 = LucideIcons.Volume2;
    const VolumeX = LucideIcons.VolumeX;
    const Headphones = LucideIcons.Headphones;
    const Radio = LucideIcons.Radio;
    const Tv = LucideIcons.Tv;
    const Monitor = LucideIcons.Monitor;
    const Smartphone = LucideIcons.Smartphone;
    const Tablet = LucideIcons.Tablet;
    const Laptop = LucideIcons.Laptop;
    const Watch = LucideIcons.Watch;
    const Printer = LucideIcons.Printer;
    const Terminal = LucideIcons.Terminal;
    const Command = LucideIcons.Command;
    const GitBranch = LucideIcons.GitBranch;
    const GitCommit = LucideIcons.GitCommit;
    const GitMerge = LucideIcons.GitMerge;
    const GitPullRequest = LucideIcons.GitPullRequest;
    const Package = LucideIcons.Package;
    const Box = LucideIcons.Box;
    const Archive = LucideIcons.Archive;
    const Layers = LucideIcons.Layers;
    const Layout = LucideIcons.Layout;
    const Sidebar = LucideIcons.Sidebar;
    const PanelLeft = LucideIcons.PanelLeft;
    const PanelRight = LucideIcons.PanelRight;
    const Maximize = LucideIcons.Maximize;
    const Minimize = LucideIcons.Minimize;
    const Expand = LucideIcons.Expand;
    const Shrink = LucideIcons.Shrink;
    const Move = LucideIcons.Move;
    const Crosshair = LucideIcons.Crosshair;
    const Navigation = LucideIcons.Navigation;
    const Map = LucideIcons.Map;
    const Compass = LucideIcons.Compass;
    const Flag = LucideIcons.Flag;
    const FlagIcon = LucideIcons.Flag;
    const Anchor = LucideIcons.Anchor;
    const Truck = LucideIcons.Truck;
    const Car = LucideIcons.Car;
    const Plane = LucideIcons.Plane;
    const Train = LucideIcons.Train;
    const Bus = LucideIcons.Bus;
    const Bike = LucideIcons.Bike;
    const Ship = LucideIcons.Ship;
    const ShoppingCart = LucideIcons.ShoppingCart;
    const ShoppingBag = LucideIcons.ShoppingBag;
    const Gift = LucideIcons.Gift;
    const Percent = LucideIcons.Percent;
    const Receipt = LucideIcons.Receipt;
    const Wallet = LucideIcons.Wallet;
    const PiggyBank = LucideIcons.PiggyBank;
    const Banknote = LucideIcons.Banknote;
    const Coins = LucideIcons.Coins;
    const Calculator = LucideIcons.Calculator;
    const Scale = LucideIcons.Scale;
    const Ruler = LucideIcons.Ruler;
    const Scissors = LucideIcons.Scissors;
    const Crop = LucideIcons.Crop;
    const Palette = LucideIcons.Palette;
    const Brush = LucideIcons.Brush;
    const Pencil = LucideIcons.Pencil;
    const Pen = LucideIcons.Pen;
    const Highlighter = LucideIcons.Highlighter;
    const Eraser = LucideIcons.Eraser;
    const Type = LucideIcons.Type;
    const Bold = LucideIcons.Bold;
    const Italic = LucideIcons.Italic;
    const Underline = LucideIcons.Underline;
    const Strikethrough = LucideIcons.Strikethrough;
    const AlignLeft = LucideIcons.AlignLeft;
    const AlignCenter = LucideIcons.AlignCenter;
    const AlignRight = LucideIcons.AlignRight;
    const AlignJustify = LucideIcons.AlignJustify;
    const Indent = LucideIcons.Indent;
    const Outdent = LucideIcons.Outdent;
    const Quote = LucideIcons.Quote;
    const ListOrdered = LucideIcons.ListOrdered;
    const ListTree = LucideIcons.ListTree;
    const Table = LucideIcons.Table;
    const Columns = LucideIcons.Columns;
    const Rows = LucideIcons.Rows;
    const Hash = LucideIcons.Hash;
    const AtSign = LucideIcons.AtSign;
    const Paperclip = LucideIcons.Paperclip;
    const Pin = LucideIcons.Pin;
    const AlertTriangle = LucideIcons.AlertTriangle;
    const AlertOctagon = LucideIcons.AlertOctagon;
    const InfoIcon = LucideIcons.Info;
    const HelpCircleIcon = LucideIcons.HelpCircle;
    const XOctagon = LucideIcons.XOctagon;
    const MinusCircle = LucideIcons.MinusCircle;
    const PlusCircle = LucideIcons.PlusCircle;
    const CheckCircle2 = LucideIcons.CheckCircle2;
    const XCircleIcon = LucideIcons.XCircle;
    const Circle = LucideIcons.Circle;
    const Square = LucideIcons.Square;
    const Triangle = LucideIcons.Triangle;
    const Hexagon = LucideIcons.Hexagon;
    const Octagon = LucideIcons.Octagon;
    const Pentagon = LucideIcons.Pentagon;
    const Diamond = LucideIcons.Diamond;
    const Gem = LucideIcons.Gem;
    const Crown = LucideIcons.Crown;
    const Medal = LucideIcons.Medal;
    const Trophy = LucideIcons.Trophy;
    const Flame = LucideIcons.Flame;
    const Sparkles = LucideIcons.Sparkles;
    const PartyPopper = LucideIcons.PartyPopper;
    const Confetti = LucideIcons.Confetti;
    const Cake = LucideIcons.Cake;
    const Wine = LucideIcons.Wine;
    const Coffee = LucideIcons.Coffee;
    const Beer = LucideIcons.Beer;
    const Pizza = LucideIcons.Pizza;
    const Apple = LucideIcons.Apple;
    const Leaf = LucideIcons.Leaf;
    const TreeDeciduous = LucideIcons.TreeDeciduous;
    const Flower = LucideIcons.Flower;
    const Flower2 = LucideIcons.Flower2;
    const Bug = LucideIcons.Bug;
    const Feather = LucideIcons.Feather;
    const Footprints = LucideIcons.Footprints;
    const Paw = LucideIcons.Paw;
    const Fish = LucideIcons.Fish;
    const Bird = LucideIcons.Bird;
    const Rabbit = LucideIcons.Rabbit;
    const Cat = LucideIcons.Cat;
    const Dog = LucideIcons.Dog;
    const Turtle = LucideIcons.Turtle;
    const Snail = LucideIcons.Snail;
    const Worm = LucideIcons.Worm;
    const Bee = LucideIcons.Bee;
    const Butterfly = LucideIcons.Butterfly;
    const Clover = LucideIcons.Clover;
    const Mushroom = LucideIcons.Mushroom;
    const Bone = LucideIcons.Bone;
    const Skull = LucideIcons.Skull;
    const Ghost = LucideIcons.Ghost;
    const Alien = LucideIcons.Alien;
    const Bot = LucideIcons.Bot;
    const Robot = LucideIcons.Robot;
    const GraduationCap = LucideIcons.GraduationCap;
    const Brain = LucideIcons.Brain;
    const Lightbulb = LucideIcons.Lightbulb;
    const Puzzle = LucideIcons.Puzzle;
    const Wrench = LucideIcons.Wrench;
    const Hammer = LucideIcons.Hammer;
    const Cog = LucideIcons.Cog;
    const BadgeCheck = LucideIcons.BadgeCheck;
    const Verified = LucideIcons.Verified;
    const CircleCheck = LucideIcons.CircleCheck;
    const CircleX = LucideIcons.CircleX;
    const ArrowLeft = LucideIcons.ArrowLeft;
    const ArrowUp = LucideIcons.ArrowUp;
    const ArrowDown = LucideIcons.ArrowDown;
    const ArrowUpRight = LucideIcons.ArrowUpRight;

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
