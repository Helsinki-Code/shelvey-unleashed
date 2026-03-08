import { SimpleDashboardSidebar } from "@/components/SimpleDashboardSidebar";
import { PageHeader } from "@/components/PageHeader";
import { WarRoomEntry } from "@/components/seo/WarRoomEntry";
import { AgentWarRoom } from "@/components/seo/AgentWarRoom";
import { useWarRoom } from "@/hooks/useWarRoom";

const BlogEmpirePage = () => {
  const { state, sessionId, startMission, approveRequest, intervene, exportData } = useWarRoom();

  return (
    <div className="min-h-screen bg-background flex">
      <SimpleDashboardSidebar />
      <main className="flex-1 ml-[260px] flex flex-col h-screen overflow-hidden">
        {!sessionId ? (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <div />
              <PageHeader />
            </div>
            <div className="flex-1">
              <WarRoomEntry onStart={(url, goals) => startMission(url, goals)} />
            </div>
          </div>
        ) : (
          <AgentWarRoom
            state={state}
            onApprove={approveRequest}
            onIntervene={intervene}
            onExport={async (format) => exportData(format)}
          />
        )}
      </main>
    </div>
  );
};

export default BlogEmpirePage;
