import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import AgentsPage from "./pages/AgentsPage";
import PipelinePage from "./pages/PipelinePage";
import NeuralPage from "./pages/NeuralPage";
import MeetingsPage from "./pages/MeetingsPage";
import VoicePage from "./pages/VoicePage";
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

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/agents" element={<AgentsPage />} />
              <Route path="/pipeline" element={<PipelinePage />} />
              <Route path="/neural" element={<NeuralPage />} />
              <Route path="/meetings" element={<MeetingsPage />} />
              <Route path="/voice" element={<VoicePage />} />
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
