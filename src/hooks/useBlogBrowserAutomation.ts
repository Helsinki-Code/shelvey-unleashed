import { useState, useCallback } from "react";
import { useBrowserSession } from "./useBrowserSession";

interface BlogAutomationConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  userId: string;
}

interface PublishRequest {
  title: string;
  content: string;
  platform: "wordpress" | "medium" | "linkedin" | "twitter" | "facebook" | "instagram";
  featured_image_url?: string;
  tags?: string[];
  scheduled_time?: string;
  [key: string]: unknown;
}

interface DistributionRequest {
  blog_post_id: string;
  platforms: string[];
  customize_per_platform?: boolean;
  [key: string]: unknown;
}

interface UseBlogBrowserAutomationReturn {
  // Session management
  blogSession: ReturnType<typeof useBrowserSession>;

  // Publishing
  publishToWordPress: (request: PublishRequest) => Promise<unknown>;
  publishToMedium: (request: PublishRequest) => Promise<unknown>;
  publishToMultiplePlatforms: (request: DistributionRequest) => Promise<unknown>;

  // Content management
  updateBlogPost: (postId: string, content: string, seoOptimization?: Record<string, unknown>) => Promise<unknown>;
  deleteBlogPost: (postId: string) => Promise<unknown>;
  refreshOldContent: (daysOld: number) => Promise<unknown>;

  // SEO & Monitoring
  optimizePostSEO: (postId: string, focusKeyword: string) => Promise<unknown>;
  monitorSEOMetrics: (postId?: string) => Promise<unknown>;
  monitorSearchConsole: () => Promise<unknown>;
  monitorBacklinks: () => Promise<unknown>;

  // Analytics
  scrapeGoogleAnalytics: (startDate: string, endDate: string) => Promise<unknown>;
  analyzeCompetitors: (competitors: string[]) => Promise<unknown>;

  // Social & Engagement
  monitorSocialMetrics: (postId?: string) => Promise<unknown>;
  moderateComments: () => Promise<unknown>;
  respondToComments: (commentIds: string[]) => Promise<unknown>;

  // Lead Generation
  createLeadMagnet: (postId: string, magnetType: string) => Promise<unknown>;
  updateEmailList: (postId: string, listId: string) => Promise<unknown>;

  // Content Conversion
  convertPostToVideo: (postId: string) => Promise<unknown>;
  convertPostToPodcast: (postId: string) => Promise<unknown>;

  // Monetization
  optimizeAdNetworks: () => Promise<unknown>;
  manageAffiliateLinks: (postId: string) => Promise<unknown>;

  // State
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for blog-specific browser automation
 */
export function useBlogBrowserAutomation(
  config: BlogAutomationConfig
): UseBlogBrowserAutomationReturn {
  const browserSession = useBrowserSession(config);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publishToWordPress = useCallback(
    async (request: PublishRequest): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session. Create a session first.");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "publish_to_wordpress",
          "blog",
          request,
          {
            description: `Publish: ${request.title}`,
            requires_approval: false,
          }
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "WordPress publishing failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const publishToMedium = useCallback(
    async (request: PublishRequest): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "publish_to_medium",
          "blog",
          request
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Medium publishing failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const publishToMultiplePlatforms = useCallback(
    async (request: DistributionRequest): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "distribute_content_multi_platform",
          "blog",
          request
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Multi-platform distribution failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const updateBlogPost = useCallback(
    async (postId: string, content: string, seoOptimization?: Record<string, unknown>): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "update_blog_post",
          "blog",
          { post_id: postId, content, seo_optimization: seoOptimization }
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Blog post update failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const deleteBlogPost = useCallback(
    async (postId: string): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        // Request approval for deletion
        await browserSession.requestApproval(
          browserSession.currentSession.id,
          postId,
          "delete_content",
          `Delete blog post: ${postId}`
        );

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "delete_blog_post",
          "blog",
          { post_id: postId },
          { requires_approval: true }
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Blog post deletion failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const optimizePostSEO = useCallback(
    async (postId: string, focusKeyword: string): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "optimize_post_seo",
          "seo",
          { post_id: postId, focus_keyword: focusKeyword }
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "SEO optimization failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const monitorSEOMetrics = useCallback(
    async (postId?: string): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "monitor_seo_metrics",
          "seo",
          { post_id: postId }
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "SEO monitoring failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const monitorSearchConsole = useCallback(
    async (): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "monitor_search_console",
          "seo",
          {}
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Search Console monitoring failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const monitorBacklinks = useCallback(
    async (): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "monitor_backlinks",
          "seo",
          {}
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Backlink monitoring failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const refreshOldContent = useCallback(
    async (daysOld: number): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "refresh_old_content",
          "blog",
          { days_old: daysOld }
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Content refresh failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const scrapeGoogleAnalytics = useCallback(
    async (startDate: string, endDate: string): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "scrape_google_analytics",
          "blog",
          { start_date: startDate, end_date: endDate }
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Analytics scraping failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const analyzeCompetitors = useCallback(
    async (competitors: string[]): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "analyze_competitors",
          "blog",
          { competitors }
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Competitor analysis failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const monitorSocialMetrics = useCallback(
    async (postId?: string): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "monitor_social_metrics",
          "social",
          { post_id: postId }
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Social monitoring failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const moderateComments = useCallback(
    async (): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "moderate_comments",
          "blog",
          {}
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Comment moderation failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const respondToComments = useCallback(
    async (commentIds: string[]): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "respond_to_comments",
          "blog",
          { comment_ids: commentIds }
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Comment response failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const createLeadMagnet = useCallback(
    async (postId: string, magnetType: string): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "create_lead_magnet",
          "blog",
          { post_id: postId, magnet_type: magnetType }
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Lead magnet creation failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const updateEmailList = useCallback(
    async (postId: string, listId: string): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "update_email_list",
          "blog",
          { post_id: postId, list_id: listId }
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Email list update failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const convertPostToVideo = useCallback(
    async (postId: string): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "convert_post_to_video",
          "blog",
          { post_id: postId }
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Video conversion failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const convertPostToPodcast = useCallback(
    async (postId: string): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "convert_post_to_podcast",
          "blog",
          { post_id: postId }
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Podcast conversion failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const optimizeAdNetworks = useCallback(
    async (): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "optimize_ad_networks",
          "blog",
          {}
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Ad optimization failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  const manageAffiliateLinks = useCallback(
    async (postId: string): Promise<unknown> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!browserSession.currentSession) {
          throw new Error("No active session");
        }

        const task = await browserSession.addTask(
          browserSession.currentSession.id,
          "manage_affiliate_links",
          "blog",
          { post_id: postId }
        );

        return await browserSession.executeTask(
          (task as any).id,
          browserSession.currentSession.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Affiliate link management failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [browserSession]
  );

  return {
    blogSession: browserSession,
    publishToWordPress,
    publishToMedium,
    publishToMultiplePlatforms,
    updateBlogPost,
    deleteBlogPost,
    refreshOldContent,
    optimizePostSEO,
    monitorSEOMetrics,
    monitorSearchConsole,
    monitorBacklinks,
    scrapeGoogleAnalytics,
    analyzeCompetitors,
    monitorSocialMetrics,
    moderateComments,
    respondToComments,
    createLeadMagnet,
    updateEmailList,
    convertPostToVideo,
    convertPostToPodcast,
    optimizeAdNetworks,
    manageAffiliateLinks,
    isLoading,
    error,
  };
}

export type { UseBlogBrowserAutomationReturn };
