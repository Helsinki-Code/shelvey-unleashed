import { useState } from "react";
import { SimpleDashboardSidebar } from "@/components/SimpleDashboardSidebar";
import { PageHeader } from "@/components/PageHeader";
import { WarRoomEntry } from "@/components/seo/WarRoomEntry";
import { AgentWarRoom } from "@/components/seo/AgentWarRoom";

const BlogEmpirePage = () => {
  const [session, setSession] = useState<{ url: string; goals: string } | null>(null);

  const handleStart = (url: string, goals: string) => {
    setSession({ url, goals });
  };

  const handleStop = () => {
    // Keep session visible for export
  };

  return (
    <div className="min-h-screen bg-background flex">
      <SimpleDashboardSidebar />
      <main className="flex-1 ml-[260px] flex flex-col h-screen overflow-hidden">
        {!session ? (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <div />
              <PageHeader />
            </div>
            <div className="flex-1">
              <WarRoomEntry onStart={handleStart} />
            </div>
          </div>
        ) : (
          <AgentWarRoom url={session.url} goals={session.goals} onStop={handleStop} />
        )}
      </main>
    </div>
  );
};

export default BlogEmpirePage;
