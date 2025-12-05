import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// shadcn/ui component registry
const SHADCN_COMPONENTS = [
  'accordion', 'alert', 'alert-dialog', 'aspect-ratio', 'avatar', 'badge', 
  'breadcrumb', 'button', 'calendar', 'card', 'carousel', 'chart', 
  'checkbox', 'collapsible', 'command', 'context-menu', 'dialog', 
  'drawer', 'dropdown-menu', 'form', 'hover-card', 'input', 'input-otp',
  'label', 'menubar', 'navigation-menu', 'pagination', 'popover', 
  'progress', 'radio-group', 'resizable', 'scroll-area', 'select', 
  'separator', 'sheet', 'sidebar', 'skeleton', 'slider', 'sonner',
  'switch', 'table', 'tabs', 'textarea', 'toast', 'toggle', 
  'toggle-group', 'tooltip'
];

// shadcn/ui blocks (complete UI sections)
const SHADCN_BLOCKS = {
  'dashboard-01': 'Main dashboard with sidebar, charts, and activity feed',
  'dashboard-02': 'Analytics dashboard with metrics cards and data tables',
  'dashboard-03': 'Project management dashboard with kanban board',
  'authentication-01': 'Login form with social login options',
  'authentication-02': 'Registration form with email verification',
  'authentication-03': 'Two-factor authentication setup',
  'sidebar-01': 'Collapsible sidebar with nested navigation',
  'sidebar-02': 'Floating sidebar with icons and tooltips',
  'sidebar-03': 'Full-width sidebar with user profile',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool, arguments: args, userId, agentId } = await req.json();

    console.log(`[mcp-shadcn] Tool: ${tool}, Agent: ${agentId}`);

    let result;

    switch (tool) {
      case 'get_component': {
        const componentName = args.name?.toLowerCase();
        
        if (!componentName || !SHADCN_COMPONENTS.includes(componentName)) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Component "${componentName}" not found. Available: ${SHADCN_COMPONENTS.join(', ')}` 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Fetch component from GitHub
        const code = await fetchShadcnComponent(componentName);
        
        result = {
          success: true,
          component: componentName,
          code,
          imports: getComponentImports(componentName),
          dependencies: getComponentDependencies(componentName),
          usage: getComponentUsage(componentName),
        };
        break;
      }

      case 'list_components': {
        const category = args.category?.toLowerCase();
        let components = SHADCN_COMPONENTS;
        
        if (category) {
          components = filterComponentsByCategory(category);
        }
        
        result = {
          success: true,
          components: components.map(name => ({
            name,
            category: getComponentCategory(name),
            description: getComponentDescription(name),
          })),
          count: components.length,
        };
        break;
      }

      case 'get_demo': {
        const componentName = args.name?.toLowerCase();
        
        if (!componentName || !SHADCN_COMPONENTS.includes(componentName)) {
          return new Response(
            JSON.stringify({ success: false, error: `Component "${componentName}" not found` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        result = {
          success: true,
          component: componentName,
          demo: getComponentDemo(componentName),
          variants: getComponentVariants(componentName),
        };
        break;
      }

      case 'get_block': {
        const blockName = args.name?.toLowerCase();
        const blockInfo = SHADCN_BLOCKS[blockName as keyof typeof SHADCN_BLOCKS];
        
        if (!blockInfo) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Block "${blockName}" not found. Available: ${Object.keys(SHADCN_BLOCKS).join(', ')}` 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        result = {
          success: true,
          block: blockName,
          description: blockInfo,
          code: await generateBlockCode(blockName),
          components: getBlockComponents(blockName),
        };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown tool: ${tool}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log(`[mcp-shadcn] Completed ${tool}`);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[mcp-shadcn] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchShadcnComponent(name: string): Promise<string> {
  // Return pre-defined component code for common components
  const componentCode = getPreDefinedComponent(name);
  if (componentCode) return componentCode;

  // Fallback: Try fetching from GitHub
  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/www/registry/default/ui/${name}.tsx`
    );
    if (response.ok) {
      return await response.text();
    }
  } catch (e) {
    console.log(`[mcp-shadcn] Could not fetch from GitHub, using fallback`);
  }

  return getPreDefinedComponent(name) || `// Component ${name} - see https://ui.shadcn.com/docs/components/${name}`;
}

function getPreDefinedComponent(name: string): string | null {
  const components: Record<string, string> = {
    button: `
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }`,

    card: `
import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
  )
)
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
)
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
)
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  )
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }`,

    input: `
import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }`,
  };

  return components[name] || null;
}

function getComponentImports(name: string): string[] {
  const imports: Record<string, string[]> = {
    button: ['@radix-ui/react-slot', 'class-variance-authority'],
    dialog: ['@radix-ui/react-dialog'],
    dropdown: ['@radix-ui/react-dropdown-menu'],
    tabs: ['@radix-ui/react-tabs'],
    card: [],
    input: [],
  };
  return imports[name] || [];
}

function getComponentDependencies(name: string): string[] {
  const deps: Record<string, string[]> = {
    button: ['@radix-ui/react-slot'],
    dialog: ['@radix-ui/react-dialog'],
    dropdown: ['@radix-ui/react-dropdown-menu'],
    tabs: ['@radix-ui/react-tabs'],
    calendar: ['react-day-picker', 'date-fns'],
    carousel: ['embla-carousel-react'],
    chart: ['recharts'],
    form: ['@hookform/resolvers', 'react-hook-form', 'zod'],
    sonner: ['sonner'],
    toast: ['@radix-ui/react-toast'],
  };
  return deps[name] || [];
}

function getComponentUsage(name: string): string {
  const usage: Record<string, string> = {
    button: `<Button variant="default" size="lg">Click me</Button>`,
    card: `<Card><CardHeader><CardTitle>Title</CardTitle></CardHeader><CardContent>Content</CardContent></Card>`,
    input: `<Input type="email" placeholder="Enter email" />`,
    dialog: `<Dialog><DialogTrigger>Open</DialogTrigger><DialogContent>Content</DialogContent></Dialog>`,
  };
  return usage[name] || `<${name.charAt(0).toUpperCase() + name.slice(1)} />`;
}

function getComponentCategory(name: string): string {
  const categories: Record<string, string> = {
    button: 'form', input: 'form', checkbox: 'form', radio: 'form', select: 'form',
    card: 'layout', separator: 'layout', scroll: 'layout', resizable: 'layout',
    dialog: 'overlay', sheet: 'overlay', drawer: 'overlay', popover: 'overlay',
    tabs: 'navigation', menubar: 'navigation', breadcrumb: 'navigation',
    alert: 'feedback', toast: 'feedback', sonner: 'feedback', progress: 'feedback',
  };
  return categories[name] || 'misc';
}

function getComponentDescription(name: string): string {
  const descriptions: Record<string, string> = {
    button: 'Displays a button or a component that looks like a button',
    card: 'Displays a card with header, content, and footer',
    dialog: 'A modal dialog interrupting user workflow',
    input: 'A text input field for forms',
    tabs: 'A set of layered sections of content',
    toast: 'A succinct message displayed temporarily',
  };
  return descriptions[name] || `shadcn/ui ${name} component`;
}

function filterComponentsByCategory(category: string): string[] {
  return SHADCN_COMPONENTS.filter(name => getComponentCategory(name) === category);
}

function getComponentDemo(name: string): string {
  return `
import { ${name.charAt(0).toUpperCase() + name.slice(1)} } from "@/components/ui/${name}"

export function ${name.charAt(0).toUpperCase() + name.slice(1)}Demo() {
  return (
    <${name.charAt(0).toUpperCase() + name.slice(1)}>
      Demo content
    </${name.charAt(0).toUpperCase() + name.slice(1)}>
  )
}`;
}

function getComponentVariants(name: string): string[] {
  const variants: Record<string, string[]> = {
    button: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    badge: ['default', 'secondary', 'destructive', 'outline'],
    alert: ['default', 'destructive'],
  };
  return variants[name] || [];
}

async function generateBlockCode(blockName: string): Promise<string> {
  const blocks: Record<string, string> = {
    'dashboard-01': `
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Overview } from "./components/overview"
import { RecentSales } from "./components/recent-sales"

export function Dashboard() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$45,231.89</div>
                <p className="text-xs text-muted-foreground">+20.1% from last month</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}`,
    'authentication-01': `
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm() {
  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Login</CardTitle>
        <CardDescription>Enter your email below to login to your account</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="m@example.com" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required />
          </div>
          <Button type="submit" className="w-full">Login</Button>
        </div>
      </CardContent>
    </Card>
  )
}`,
  };

  return blocks[blockName] || `// Block ${blockName} - see https://ui.shadcn.com/blocks`;
}

function getBlockComponents(blockName: string): string[] {
  const blockComponents: Record<string, string[]> = {
    'dashboard-01': ['card', 'tabs', 'button', 'avatar', 'dropdown-menu'],
    'dashboard-02': ['card', 'table', 'badge', 'button'],
    'authentication-01': ['card', 'input', 'button', 'label', 'checkbox'],
    'sidebar-01': ['button', 'separator', 'tooltip', 'scroll-area'],
  };
  return blockComponents[blockName] || [];
}
