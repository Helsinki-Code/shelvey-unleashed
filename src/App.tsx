import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import { CEOProvider } from "@/contexts/CEOContext";
import Index from "./pages/Index";
import AgentsPage from "./pages/AgentsPage";
import PipelinePage from "./pages/PipelinePage";
import NeuralPage from "./pages/NeuralPage";
import MeetingsPage from "./pages/MeetingsPage";
import VoicePage from "./pages/VoicePage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectOverviewPage from "./pages/ProjectOverviewPage";
import Phase1Page from "./pages/Phase1Page";
import Phase2Page from "./pages/Phase2Page";
import Phase3Page from "./pages/Phase3Page";
import Phase4Page from "./pages/Phase4Page";
import Phase5Page from "./pages/Phase5Page";
import Phase6Page from "./pages/Phase6Page";
import AdminDashboard from "./pages/AdminDashboard";
import MCPServersPage from "./pages/MCPServersPage";
import AuthPage from "./pages/AuthPage";
import UserDashboard from "./pages/UserDashboard";
import NotFound from "./pages/NotFound";
import WebsitesPage from "./pages/WebsitesPage";
import OrganizationPage from "./pages/OrganizationPage";
import BrandingPage from "./pages/BrandingPage";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import SecurityPage from "./pages/SecurityPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import PricingPage from "./pages/PricingPage";
import LiveDemoPage from "./pages/LiveDemoPage";
import NotificationsPage from "./pages/NotificationsPage";
import TeamCollaborationPage from "./pages/TeamCollaborationPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import ComputerUsePage from "./pages/ComputerUsePage";
import DeveloperToolsPage from "./pages/DeveloperToolsPage";
import WorkspacePage from "./pages/WorkspacePage";
import CreateCEOPage from "./pages/CreateCEOPage";
import SettingsPage from "./pages/SettingsPage";
import DomainsPage from "./pages/DomainsPage";
import OnlineStoresPage from "./pages/OnlineStoresPage";
import TradingDashboardPage from "./pages/TradingDashboardPage";
import TradingProjectsPage from "./pages/TradingProjectsPage";
import TradingProjectWizard from "./pages/TradingProjectWizard";
import TradingCommandCenter from "./pages/TradingCommandCenter";
import CommandCenterPage from "./pages/CommandCenterPage";
import TradingResearchPhase from "./pages/trading/TradingResearchPhase";
import TradingStrategyPhase from "./pages/trading/TradingStrategyPhase";
import TradingSetupPhase from "./pages/trading/TradingSetupPhase";
import TradingExecutionPhase from "./pages/trading/TradingExecutionPhase";
import TradingMonitorPhase from "./pages/trading/TradingMonitorPhase";
import TradingOptimizePhase from "./pages/trading/TradingOptimizePhase";
import BlogPage from "./pages/BlogPage";
import BlogPostPage from "./pages/BlogPostPage";
import BlogEmpirePage from "./pages/BlogEmpirePage";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CEOProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/create-ceo" element={<CreateCEOPage />} />
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/agents" element={<AgentsPage />} />
              <Route path="/pipeline" element={<PipelinePage />} />
              <Route path="/neural" element={<NeuralPage />} />
              <Route path="/meetings" element={<MeetingsPage />} />
              <Route path="/voice" element={<VoicePage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
              <Route path="/projects/:projectId/overview" element={<ProjectOverviewPage />} />
              <Route path="/projects/:projectId/phase/1" element={<Phase1Page />} />
              <Route path="/projects/:projectId/phase/2" element={<Phase2Page />} />
              <Route path="/projects/:projectId/phase/3" element={<Phase3Page />} />
              <Route path="/projects/:projectId/phase/4" element={<Phase4Page />} />
              <Route path="/projects/:projectId/phase/5" element={<Phase5Page />} />
              <Route path="/projects/:projectId/phase/6" element={<Phase6Page />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/mcp" element={<MCPServersPage />} />
              <Route path="/websites" element={<WebsitesPage />} />
              <Route path="/organization" element={<OrganizationPage />} />
              <Route path="/branding" element={<BrandingPage />} />
              <Route path="/super-admin" element={<SuperAdminDashboard />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/security" element={<SecurityPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/live-demo" element={<LiveDemoPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/team-collaboration" element={<TeamCollaborationPage />} />
              <Route path="/integrations" element={<IntegrationsPage />} />
              <Route path="/computer-use" element={<ComputerUsePage />} />
              <Route path="/developer-tools" element={<DeveloperToolsPage />} />
              <Route path="/workspace" element={<WorkspacePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/domains" element={<DomainsPage />} />
              <Route path="/stores" element={<OnlineStoresPage />} />
              <Route path="/command-center" element={<CommandCenterPage />} />
              <Route path="/trading-old" element={<TradingDashboardPage />} />
              <Route path="/trading" element={<TradingProjectsPage />} />
              <Route path="/trading/new" element={<TradingProjectWizard />} />
              <Route path="/trading/:projectId" element={<TradingCommandCenter />} />
              <Route path="/trading/:projectId/research" element={<TradingResearchPhase />} />
              <Route path="/trading/:projectId/strategy" element={<TradingStrategyPhase />} />
              <Route path="/trading/:projectId/setup" element={<TradingSetupPhase />} />
              <Route path="/trading/:projectId/execution" element={<TradingExecutionPhase />} />
              <Route path="/trading/:projectId/monitor" element={<TradingMonitorPhase />} />
              <Route path="/trading/:projectId/optimize" element={<TradingOptimizePhase />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              <Route path="/blog-empire" element={<BlogEmpirePage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </CEOProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
