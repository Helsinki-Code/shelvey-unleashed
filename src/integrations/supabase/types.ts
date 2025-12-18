export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ad_creatives: {
        Row: {
          ab_variant: string | null
          campaign_id: string | null
          created_at: string | null
          creative_type: string
          cta: string | null
          description: string | null
          headline: string | null
          id: string
          image_urls: string[] | null
          metadata: Json | null
          performance_score: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ab_variant?: string | null
          campaign_id?: string | null
          created_at?: string | null
          creative_type: string
          cta?: string | null
          description?: string | null
          headline?: string | null
          id?: string
          image_urls?: string[] | null
          metadata?: Json | null
          performance_score?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ab_variant?: string | null
          campaign_id?: string | null
          created_at?: string | null
          creative_type?: string
          cta?: string | null
          description?: string | null
          headline?: string | null
          id?: string
          image_urls?: string[] | null
          metadata?: Json | null
          performance_score?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_creatives_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_api_keys: {
        Row: {
          category: string | null
          created_at: string | null
          display_name: string
          encrypted_value: string | null
          id: string
          is_configured: boolean | null
          key_name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          display_name: string
          encrypted_value?: string | null
          id?: string
          is_configured?: boolean | null
          key_name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          display_name?: string
          encrypted_value?: string | null
          id?: string
          is_configured?: boolean | null
          key_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      agent_activity_logs: {
        Row: {
          action: string
          agent_id: string
          agent_name: string
          created_at: string
          id: string
          metadata: Json | null
          status: string
        }
        Insert: {
          action: string
          agent_id: string
          agent_name: string
          created_at?: string
          id?: string
          metadata?: Json | null
          status?: string
        }
        Update: {
          action?: string
          agent_id?: string
          agent_name?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          status?: string
        }
        Relationships: []
      }
      agent_conversations: {
        Row: {
          agent_type: string | null
          created_at: string | null
          id: string
          messages: Json | null
          project_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_type?: string | null
          created_at?: string | null
          id?: string
          messages?: Json | null
          project_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_type?: string | null
          created_at?: string | null
          id?: string
          messages?: Json | null
          project_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "business_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_mcp_usage: {
        Row: {
          action: string
          agent_id: string
          created_at: string
          id: string
          latency_ms: number | null
          mcp_server_id: string
          request_payload: Json | null
          response_payload: Json | null
          success: boolean | null
          task_id: string | null
        }
        Insert: {
          action: string
          agent_id: string
          created_at?: string
          id?: string
          latency_ms?: number | null
          mcp_server_id: string
          request_payload?: Json | null
          response_payload?: Json | null
          success?: boolean | null
          task_id?: string | null
        }
        Update: {
          action?: string
          agent_id?: string
          created_at?: string
          id?: string
          latency_ms?: number | null
          mcp_server_id?: string
          request_payload?: Json | null
          response_payload?: Json | null
          success?: boolean | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_mcp_usage_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_messages: {
        Row: {
          attachments: Json | null
          content: string
          context: Json | null
          created_at: string | null
          from_agent_id: string
          from_agent_name: string
          id: string
          message_type: string
          parent_message_id: string | null
          priority: string | null
          project_id: string | null
          read_at: string | null
          replied_at: string | null
          subject: string | null
          team_id: string | null
          to_agent_id: string | null
          to_agent_name: string | null
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          context?: Json | null
          created_at?: string | null
          from_agent_id: string
          from_agent_name: string
          id?: string
          message_type: string
          parent_message_id?: string | null
          priority?: string | null
          project_id?: string | null
          read_at?: string | null
          replied_at?: string | null
          subject?: string | null
          team_id?: string | null
          to_agent_id?: string | null
          to_agent_name?: string | null
          user_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          context?: Json | null
          created_at?: string | null
          from_agent_id?: string
          from_agent_name?: string
          id?: string
          message_type?: string
          parent_message_id?: string | null
          priority?: string | null
          project_id?: string | null
          read_at?: string | null
          replied_at?: string | null
          subject?: string | null
          team_id?: string | null
          to_agent_id?: string | null
          to_agent_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "agent_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "business_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tasks: {
        Row: {
          assigned_agent_id: string
          completed_at: string | null
          created_at: string
          delegated_by: string
          id: string
          input_data: Json | null
          mcp_servers_used: string[] | null
          output_data: Json | null
          priority: string
          project_id: string | null
          started_at: string | null
          status: string
          task_description: string
          task_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_agent_id: string
          completed_at?: string | null
          created_at?: string
          delegated_by?: string
          id?: string
          input_data?: Json | null
          mcp_servers_used?: string[] | null
          output_data?: Json | null
          priority?: string
          project_id?: string | null
          started_at?: string | null
          status?: string
          task_description: string
          task_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_agent_id?: string
          completed_at?: string | null
          created_at?: string
          delegated_by?: string
          id?: string
          input_data?: Json | null
          mcp_servers_used?: string[] | null
          output_data?: Json | null
          priority?: string
          project_id?: string | null
          started_at?: string | null
          status?: string
          task_description?: string
          task_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "business_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_configured: boolean | null
          is_required: boolean | null
          key_name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_configured?: boolean | null
          is_required?: boolean | null
          key_name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_configured?: boolean | null
          is_required?: boolean | null
          key_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_metrics: {
        Row: {
          id: string
          metadata: Json | null
          metric_type: string
          period: string
          recorded_at: string
          value: number
        }
        Insert: {
          id?: string
          metadata?: Json | null
          metric_type: string
          period: string
          recorded_at?: string
          value: number
        }
        Update: {
          id?: string
          metadata?: Json | null
          metric_type?: string
          period?: string
          recorded_at?: string
          value?: number
        }
        Relationships: []
      }
      business_phases: {
        Row: {
          completed_at: string | null
          created_at: string | null
          entry_criteria: Json | null
          exit_criteria: Json | null
          id: string
          phase_name: string
          phase_number: number
          project_id: string
          started_at: string | null
          status: string | null
          team_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          entry_criteria?: Json | null
          exit_criteria?: Json | null
          id?: string
          phase_name: string
          phase_number: number
          project_id: string
          started_at?: string | null
          status?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          entry_criteria?: Json | null
          exit_criteria?: Json | null
          id?: string
          phase_name?: string
          phase_number?: number
          project_id?: string
          started_at?: string | null
          status?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "business_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_phases_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      business_projects: {
        Row: {
          business_model: Json | null
          ceo_approved: boolean | null
          ceo_review_feedback: string | null
          ceo_reviewed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          industry: string | null
          name: string
          revenue: number | null
          stage: string | null
          status: string | null
          target_market: string | null
          updated_at: string | null
          user_approved: boolean | null
          user_id: string
        }
        Insert: {
          business_model?: Json | null
          ceo_approved?: boolean | null
          ceo_review_feedback?: string | null
          ceo_reviewed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          name: string
          revenue?: number | null
          stage?: string | null
          status?: string | null
          target_market?: string | null
          updated_at?: string | null
          user_approved?: boolean | null
          user_id: string
        }
        Update: {
          business_model?: Json | null
          ceo_approved?: boolean | null
          ceo_review_feedback?: string | null
          ceo_reviewed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          name?: string
          revenue?: number | null
          stage?: string | null
          status?: string | null
          target_market?: string | null
          updated_at?: string | null
          user_approved?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      code_patches: {
        Row: {
          applied_at: string | null
          created_at: string | null
          file_path: string
          id: string
          metadata: Json | null
          new_content: string | null
          original_content: string | null
          patch_content: string
          patch_type: string | null
          project_id: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          created_at?: string | null
          file_path: string
          id?: string
          metadata?: Json | null
          new_content?: string | null
          original_content?: string | null
          patch_content: string
          patch_type?: string | null
          project_id?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          applied_at?: string | null
          created_at?: string | null
          file_path?: string
          id?: string
          metadata?: Json | null
          new_content?: string | null
          original_content?: string | null
          patch_content?: string
          patch_type?: string | null
          project_id?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "code_patches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "business_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          content: string | null
          content_type: string
          created_at: string | null
          id: string
          keywords: Json | null
          metadata: Json | null
          project_id: string | null
          published_at: string | null
          seo_score: number | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          content_type: string
          created_at?: string | null
          id?: string
          keywords?: Json | null
          metadata?: Json | null
          project_id?: string | null
          published_at?: string | null
          seo_score?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          content_type?: string
          created_at?: string | null
          id?: string
          keywords?: Json | null
          metadata?: Json | null
          project_id?: string | null
          published_at?: string | null
          seo_score?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "business_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      escalations: {
        Row: {
          attempted_solutions: Json | null
          context: Json | null
          created_at: string | null
          created_by_agent_id: string
          created_by_agent_name: string
          current_handler_id: string | null
          current_handler_type: string
          deliverable_id: string | null
          escalated_to_ceo_at: string | null
          escalated_to_human_at: string | null
          escalated_to_manager_at: string | null
          escalation_level: number | null
          id: string
          issue_description: string
          issue_type: string
          project_id: string | null
          resolution: string | null
          resolution_type: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          task_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attempted_solutions?: Json | null
          context?: Json | null
          created_at?: string | null
          created_by_agent_id: string
          created_by_agent_name: string
          current_handler_id?: string | null
          current_handler_type: string
          deliverable_id?: string | null
          escalated_to_ceo_at?: string | null
          escalated_to_human_at?: string | null
          escalated_to_manager_at?: string | null
          escalation_level?: number | null
          id?: string
          issue_description: string
          issue_type: string
          project_id?: string | null
          resolution?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          task_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attempted_solutions?: Json | null
          context?: Json | null
          created_at?: string | null
          created_by_agent_id?: string
          created_by_agent_name?: string
          current_handler_id?: string | null
          current_handler_type?: string
          deliverable_id?: string | null
          escalated_to_ceo_at?: string | null
          escalated_to_human_at?: string | null
          escalated_to_manager_at?: string | null
          escalation_level?: number | null
          id?: string
          issue_description?: string
          issue_type?: string
          project_id?: string | null
          resolution?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          task_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalations_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "phase_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "business_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_websites: {
        Row: {
          branding_deliverable_id: string | null
          ceo_approved: boolean | null
          created_at: string
          css_content: string | null
          custom_domain: string | null
          deployed_url: string | null
          dns_records: Json | null
          domain_name: string | null
          feedback_history: Json | null
          hosting_type: string | null
          html_content: string
          id: string
          js_content: string | null
          metadata: Json | null
          name: string
          project_id: string | null
          ssl_status: string | null
          status: string
          updated_at: string
          user_approved: boolean | null
          user_id: string
          version: number | null
        }
        Insert: {
          branding_deliverable_id?: string | null
          ceo_approved?: boolean | null
          created_at?: string
          css_content?: string | null
          custom_domain?: string | null
          deployed_url?: string | null
          dns_records?: Json | null
          domain_name?: string | null
          feedback_history?: Json | null
          hosting_type?: string | null
          html_content: string
          id?: string
          js_content?: string | null
          metadata?: Json | null
          name: string
          project_id?: string | null
          ssl_status?: string | null
          status?: string
          updated_at?: string
          user_approved?: boolean | null
          user_id: string
          version?: number | null
        }
        Update: {
          branding_deliverable_id?: string | null
          ceo_approved?: boolean | null
          created_at?: string
          css_content?: string | null
          custom_domain?: string | null
          deployed_url?: string | null
          dns_records?: Json | null
          domain_name?: string | null
          feedback_history?: Json | null
          hosting_type?: string | null
          html_content?: string
          id?: string
          js_content?: string | null
          metadata?: Json | null
          name?: string
          project_id?: string | null
          ssl_status?: string | null
          status?: string
          updated_at?: string
          user_approved?: boolean | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_websites_branding_deliverable_id_fkey"
            columns: ["branding_deliverable_id"]
            isOneToOne: false
            referencedRelation: "phase_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_websites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "business_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_contacts: {
        Row: {
          contact_email: string | null
          contract_value: number | null
          created_at: string | null
          engagement_rate: number | null
          follower_count: number | null
          handle: string | null
          id: string
          influencer_name: string
          last_contacted_at: string | null
          metadata: Json | null
          niche: string | null
          notes: string | null
          platform: string
          project_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contact_email?: string | null
          contract_value?: number | null
          created_at?: string | null
          engagement_rate?: number | null
          follower_count?: number | null
          handle?: string | null
          id?: string
          influencer_name: string
          last_contacted_at?: string | null
          metadata?: Json | null
          niche?: string | null
          notes?: string | null
          platform: string
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contact_email?: string | null
          contract_value?: number | null
          created_at?: string | null
          engagement_rate?: number | null
          follower_count?: number | null
          handle?: string | null
          id?: string
          influencer_name?: string
          last_contacted_at?: string | null
          metadata?: Json | null
          niche?: string | null
          notes?: string | null
          platform?: string
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencer_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "business_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          budget: number | null
          campaign_type: string
          created_at: string | null
          end_date: string | null
          id: string
          metrics: Json | null
          name: string
          project_id: string | null
          settings: Json | null
          spent: number | null
          start_date: string | null
          status: string | null
          target_platforms: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          budget?: number | null
          campaign_type: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          metrics?: Json | null
          name: string
          project_id?: string | null
          settings?: Json | null
          spent?: number | null
          start_date?: string | null
          status?: string | null
          target_platforms?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          budget?: number | null
          campaign_type?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          metrics?: Json | null
          name?: string
          project_id?: string | null
          settings?: Json | null
          spent?: number | null
          start_date?: string | null
          status?: string | null
          target_platforms?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "business_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_server_registry: {
        Row: {
          auth_type: string | null
          category: string
          created_at: string | null
          description: string | null
          enabled: boolean | null
          id: string
          is_public: boolean | null
          requires_auth: boolean | null
          server_id: string
          server_name: string
          server_url: string
          tools: Json | null
          updated_at: string | null
        }
        Insert: {
          auth_type?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          is_public?: boolean | null
          requires_auth?: boolean | null
          server_id: string
          server_name: string
          server_url: string
          tools?: Json | null
          updated_at?: string | null
        }
        Update: {
          auth_type?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          is_public?: boolean | null
          requires_auth?: boolean | null
          server_id?: string
          server_name?: string
          server_url?: string
          tools?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      mcp_server_status: {
        Row: {
          id: string
          last_ping: string | null
          latency_ms: number | null
          metadata: Json | null
          requests_today: number | null
          server_id: string
          server_name: string
          status: string
          updated_at: string
        }
        Insert: {
          id?: string
          last_ping?: string | null
          latency_ms?: number | null
          metadata?: Json | null
          requests_today?: number | null
          server_id: string
          server_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          id?: string
          last_ping?: string | null
          latency_ms?: number | null
          metadata?: Json | null
          requests_today?: number | null
          server_id?: string
          server_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      phase_deliverables: {
        Row: {
          agent_work_steps: Json | null
          approved_at: string | null
          approved_by: string | null
          assigned_agent_id: string | null
          assigned_team_id: string | null
          ceo_approved: boolean | null
          citations: Json | null
          content: Json | null
          created_at: string | null
          deliverable_type: string
          description: string | null
          export_formats: Json | null
          feedback: string | null
          feedback_history: Json | null
          generated_content: Json | null
          id: string
          name: string
          phase_id: string
          reviewed_by: string | null
          screen_recording_url: string | null
          screenshots: Json | null
          status: string | null
          updated_at: string | null
          user_approved: boolean | null
          user_id: string
          version: number | null
        }
        Insert: {
          agent_work_steps?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_agent_id?: string | null
          assigned_team_id?: string | null
          ceo_approved?: boolean | null
          citations?: Json | null
          content?: Json | null
          created_at?: string | null
          deliverable_type: string
          description?: string | null
          export_formats?: Json | null
          feedback?: string | null
          feedback_history?: Json | null
          generated_content?: Json | null
          id?: string
          name: string
          phase_id: string
          reviewed_by?: string | null
          screen_recording_url?: string | null
          screenshots?: Json | null
          status?: string | null
          updated_at?: string | null
          user_approved?: boolean | null
          user_id: string
          version?: number | null
        }
        Update: {
          agent_work_steps?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_agent_id?: string | null
          assigned_team_id?: string | null
          ceo_approved?: boolean | null
          citations?: Json | null
          content?: Json | null
          created_at?: string | null
          deliverable_type?: string
          description?: string | null
          export_formats?: Json | null
          feedback?: string | null
          feedback_history?: Json | null
          generated_content?: Json | null
          id?: string
          name?: string
          phase_id?: string
          reviewed_by?: string | null
          screen_recording_url?: string | null
          screenshots?: Json | null
          status?: string | null
          updated_at?: string | null
          user_approved?: boolean | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "phase_deliverables_assigned_team_id_fkey"
            columns: ["assigned_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phase_deliverables_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "business_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      pod_products: {
        Row: {
          cost: number | null
          created_at: string | null
          design_url: string | null
          id: string
          name: string
          printful_product_id: string | null
          printify_product_id: string | null
          revenue: number | null
          sales_count: number | null
          status: string | null
          synced_stores: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          design_url?: string | null
          id?: string
          name: string
          printful_product_id?: string | null
          printify_product_id?: string | null
          revenue?: number | null
          sales_count?: number | null
          status?: string | null
          synced_stores?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          design_url?: string | null
          id?: string
          name?: string
          printful_product_id?: string | null
          printify_product_id?: string | null
          revenue?: number | null
          sales_count?: number | null
          status?: string | null
          synced_stores?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          experience_mode: string | null
          full_name: string | null
          id: string
          onboarding_completed: boolean | null
          onboarding_goal: string | null
          stripe_connect_account_id: string | null
          stripe_connect_status: string | null
          subscription_expires_at: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          experience_mode?: string | null
          full_name?: string | null
          id: string
          onboarding_completed?: boolean | null
          onboarding_goal?: string | null
          stripe_connect_account_id?: string | null
          stripe_connect_status?: string | null
          subscription_expires_at?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          experience_mode?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          onboarding_goal?: string | null
          stripe_connect_account_id?: string | null
          stripe_connect_status?: string | null
          subscription_expires_at?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      progress_reports: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          agent_id: string
          agent_name: string
          blockers: Json | null
          content: string
          created_at: string | null
          deliverables_completed: Json | null
          feedback: string | null
          id: string
          metrics: Json | null
          next_steps: Json | null
          project_id: string | null
          report_to_agent_id: string
          report_to_agent_name: string
          report_type: string
          tasks_in_progress: Json | null
          team_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          agent_id: string
          agent_name: string
          blockers?: Json | null
          content: string
          created_at?: string | null
          deliverables_completed?: Json | null
          feedback?: string | null
          id?: string
          metrics?: Json | null
          next_steps?: Json | null
          project_id?: string | null
          report_to_agent_id: string
          report_to_agent_name: string
          report_type: string
          tasks_in_progress?: Json | null
          team_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          agent_id?: string
          agent_name?: string
          blockers?: Json | null
          content?: string
          created_at?: string | null
          deliverables_completed?: Json | null
          feedback?: string | null
          id?: string
          metrics?: Json | null
          next_steps?: Json | null
          project_id?: string | null
          report_to_agent_id?: string
          report_to_agent_name?: string
          report_type?: string
          tasks_in_progress?: Json | null
          team_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "business_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_reports_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_rankings: {
        Row: {
          id: string
          keyword: string
          position: number | null
          project_id: string | null
          search_engine: string | null
          tracked_at: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          id?: string
          keyword: string
          position?: number | null
          project_id?: string | null
          search_engine?: string | null
          tracked_at?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          id?: string
          keyword?: string
          position?: number | null
          project_id?: string | null
          search_engine?: string | null
          tracked_at?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_rankings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "business_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      shell_command_approvals: {
        Row: {
          approved_at: string | null
          command: string
          created_at: string | null
          error: string | null
          executed_at: string | null
          id: string
          metadata: Json | null
          output: string | null
          risk_level: string | null
          status: string | null
          user_id: string
          working_directory: string | null
        }
        Insert: {
          approved_at?: string | null
          command: string
          created_at?: string | null
          error?: string | null
          executed_at?: string | null
          id?: string
          metadata?: Json | null
          output?: string | null
          risk_level?: string | null
          status?: string | null
          user_id: string
          working_directory?: string | null
        }
        Update: {
          approved_at?: string | null
          command?: string
          created_at?: string | null
          error?: string | null
          executed_at?: string | null
          id?: string
          metadata?: Json | null
          output?: string | null
          risk_level?: string | null
          status?: string | null
          user_id?: string
          working_directory?: string | null
        }
        Relationships: []
      }
      social_content_library: {
        Row: {
          caption: string | null
          content_type: string
          created_at: string | null
          engagement_metrics: Json | null
          hashtags: string[] | null
          id: string
          image_urls: string[] | null
          metadata: Json | null
          platform: string
          posted_at: string | null
          project_id: string | null
          scheduled_for: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          content_type: string
          created_at?: string | null
          engagement_metrics?: Json | null
          hashtags?: string[] | null
          id?: string
          image_urls?: string[] | null
          metadata?: Json | null
          platform: string
          posted_at?: string | null
          project_id?: string | null
          scheduled_for?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
          content_type?: string
          created_at?: string | null
          engagement_metrics?: Json | null
          hashtags?: string[] | null
          id?: string
          image_urls?: string[] | null
          metadata?: Json | null
          platform?: string
          posted_at?: string | null
          project_id?: string | null
          scheduled_for?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_content_library_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "business_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          campaign_id: string | null
          content: Json | null
          created_at: string | null
          id: string
          media_urls: string[] | null
          platforms: string[] | null
          post_results: Json | null
          posted_at: string | null
          scheduled_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          content?: Json | null
          created_at?: string | null
          id?: string
          media_urls?: string[] | null
          platforms?: string[] | null
          post_results?: Json | null
          posted_at?: string | null
          scheduled_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          content?: Json | null
          created_at?: string | null
          id?: string
          media_urls?: string[] | null
          platforms?: string[] | null
          post_results?: Json | null
          posted_at?: string | null
          scheduled_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      store_automation_jobs: {
        Row: {
          created_at: string | null
          executed_at: string | null
          id: string
          job_type: string
          result: Json | null
          scheduled_at: string | null
          status: string | null
          store_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          executed_at?: string | null
          id?: string
          job_type: string
          result?: Json | null
          scheduled_at?: string | null
          status?: string | null
          store_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          executed_at?: string | null
          id?: string
          job_type?: string
          result?: Json | null
          scheduled_at?: string | null
          status?: string | null
          store_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      store_automation_settings: {
        Row: {
          auto_fulfill_orders: boolean | null
          auto_marketing: boolean | null
          auto_optimize_prices: boolean | null
          auto_restock_alerts: boolean | null
          created_at: string | null
          id: string
          low_stock_threshold: number | null
          price_optimization_margin: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_fulfill_orders?: boolean | null
          auto_marketing?: boolean | null
          auto_optimize_prices?: boolean | null
          auto_restock_alerts?: boolean | null
          created_at?: string | null
          id?: string
          low_stock_threshold?: number | null
          price_optimization_margin?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_fulfill_orders?: boolean | null
          auto_marketing?: boolean | null
          auto_optimize_prices?: boolean | null
          auto_restock_alerts?: boolean | null
          created_at?: string | null
          id?: string
          low_stock_threshold?: number | null
          price_optimization_margin?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      team_meetings: {
        Row: {
          action_items: Json | null
          agenda: Json | null
          attendees: Json | null
          completed_at: string | null
          created_at: string | null
          decisions: Json | null
          id: string
          meeting_type: string
          minutes: string | null
          project_id: string | null
          scheduled_at: string
          started_at: string | null
          status: string | null
          team_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_items?: Json | null
          agenda?: Json | null
          attendees?: Json | null
          completed_at?: string | null
          created_at?: string | null
          decisions?: Json | null
          id?: string
          meeting_type: string
          minutes?: string | null
          project_id?: string | null
          scheduled_at: string
          started_at?: string | null
          status?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_items?: Json | null
          agenda?: Json | null
          attendees?: Json | null
          completed_at?: string | null
          created_at?: string | null
          decisions?: Json | null
          id?: string
          meeting_type?: string
          minutes?: string | null
          project_id?: string | null
          scheduled_at?: string
          started_at?: string | null
          status?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "business_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_meetings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          agent_id: string
          agent_name: string
          created_at: string | null
          current_task: string | null
          id: string
          reports_to: string | null
          role: string
          status: string | null
          team_id: string
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          agent_name: string
          created_at?: string | null
          current_task?: string | null
          id?: string
          reports_to?: string | null
          role: string
          status?: string | null
          team_id: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          agent_name?: string
          created_at?: string | null
          current_task?: string | null
          id?: string
          reports_to?: string | null
          role?: string
          status?: string | null
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          activation_phase: number | null
          created_at: string | null
          description: string | null
          division: string
          id: string
          manager_agent_id: string
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          activation_phase?: number | null
          created_at?: string | null
          description?: string | null
          division: string
          id?: string
          manager_agent_id: string
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          activation_phase?: number | null
          created_at?: string | null
          description?: string | null
          division?: string
          id?: string
          manager_agent_id?: string
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      trading_activity_logs: {
        Row: {
          action: string
          agent_id: string
          agent_name: string
          created_at: string | null
          details: Json | null
          id: string
          phase_id: string | null
          project_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          action: string
          agent_id: string
          agent_name: string
          created_at?: string | null
          details?: Json | null
          id?: string
          phase_id?: string | null
          project_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          action?: string
          agent_id?: string
          agent_name?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          phase_id?: string | null
          project_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trading_activity_logs_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "trading_project_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trading_activity_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "trading_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_executions: {
        Row: {
          action: string
          executed_at: string | null
          fees: number | null
          id: string
          price: number
          profit_loss: number | null
          quantity: number
          strategy_id: string | null
          symbol: string
          user_id: string
        }
        Insert: {
          action: string
          executed_at?: string | null
          fees?: number | null
          id?: string
          price: number
          profit_loss?: number | null
          quantity: number
          strategy_id?: string | null
          symbol: string
          user_id: string
        }
        Update: {
          action?: string
          executed_at?: string | null
          fees?: number | null
          id?: string
          price?: number
          profit_loss?: number | null
          quantity?: number
          strategy_id?: string | null
          symbol?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trading_executions_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "trading_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_orders: {
        Row: {
          approved_by_ceo: boolean | null
          approved_by_user: boolean | null
          created_at: string | null
          executed_at: string | null
          execution_price: number | null
          id: string
          order_type: string
          phase_id: string | null
          price: number | null
          project_id: string
          quantity: number
          rejection_reason: string | null
          side: string
          status: string
          stop_loss_price: number | null
          symbol: string
          take_profit_price: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_by_ceo?: boolean | null
          approved_by_user?: boolean | null
          created_at?: string | null
          executed_at?: string | null
          execution_price?: number | null
          id?: string
          order_type?: string
          phase_id?: string | null
          price?: number | null
          project_id: string
          quantity: number
          rejection_reason?: string | null
          side: string
          status?: string
          stop_loss_price?: number | null
          symbol: string
          take_profit_price?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_by_ceo?: boolean | null
          approved_by_user?: boolean | null
          created_at?: string | null
          executed_at?: string | null
          execution_price?: number | null
          id?: string
          order_type?: string
          phase_id?: string | null
          price?: number | null
          project_id?: string
          quantity?: number
          rejection_reason?: string | null
          side?: string
          status?: string
          stop_loss_price?: number | null
          symbol?: string
          take_profit_price?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trading_orders_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "trading_project_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trading_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "trading_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_project_phases: {
        Row: {
          agent_id: string
          agent_work_steps: Json | null
          ceo_approved: boolean | null
          ceo_feedback: string | null
          completed_at: string | null
          created_at: string | null
          deliverables: Json | null
          id: string
          phase_name: string
          phase_number: number
          project_id: string
          started_at: string | null
          status: string
          updated_at: string | null
          user_approved: boolean | null
          user_id: string
        }
        Insert: {
          agent_id: string
          agent_work_steps?: Json | null
          ceo_approved?: boolean | null
          ceo_feedback?: string | null
          completed_at?: string | null
          created_at?: string | null
          deliverables?: Json | null
          id?: string
          phase_name: string
          phase_number: number
          project_id: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_approved?: boolean | null
          user_id: string
        }
        Update: {
          agent_id?: string
          agent_work_steps?: Json | null
          ceo_approved?: boolean | null
          ceo_feedback?: string | null
          completed_at?: string | null
          created_at?: string | null
          deliverables?: Json | null
          id?: string
          phase_name?: string
          phase_number?: number
          project_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_approved?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trading_project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "trading_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_projects: {
        Row: {
          capital: number
          created_at: string | null
          current_phase: number | null
          exchange: string
          id: string
          mode: string
          name: string
          risk_level: string
          status: string
          total_pnl: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          capital?: number
          created_at?: string | null
          current_phase?: number | null
          exchange: string
          id?: string
          mode?: string
          name: string
          risk_level?: string
          status?: string
          total_pnl?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          capital?: number
          created_at?: string | null
          current_phase?: number | null
          exchange?: string
          id?: string
          mode?: string
          name?: string
          risk_level?: string
          status?: string
          total_pnl?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      trading_risk_controls: {
        Row: {
          created_at: string | null
          daily_loss_limit: number
          id: string
          kill_switch_activated_at: string | null
          kill_switch_active: boolean | null
          last_checked_at: string | null
          max_position_pct: number
          project_id: string
          stop_loss_pct: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          daily_loss_limit?: number
          id?: string
          kill_switch_activated_at?: string | null
          kill_switch_active?: boolean | null
          last_checked_at?: string | null
          max_position_pct?: number
          project_id: string
          stop_loss_pct?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          daily_loss_limit?: number
          id?: string
          kill_switch_activated_at?: string | null
          kill_switch_active?: boolean | null
          last_checked_at?: string | null
          max_position_pct?: number
          project_id?: string
          stop_loss_pct?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trading_risk_controls_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "trading_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_strategies: {
        Row: {
          created_at: string | null
          exchange: string
          id: string
          is_active: boolean | null
          name: string
          paper_mode: boolean | null
          parameters: Json | null
          strategy_type: string
          total_profit: number | null
          total_trades: number | null
          updated_at: string | null
          user_id: string
          win_rate: number | null
        }
        Insert: {
          created_at?: string | null
          exchange: string
          id?: string
          is_active?: boolean | null
          name: string
          paper_mode?: boolean | null
          parameters?: Json | null
          strategy_type: string
          total_profit?: number | null
          total_trades?: number | null
          updated_at?: string | null
          user_id: string
          win_rate?: number | null
        }
        Update: {
          created_at?: string | null
          exchange?: string
          id?: string
          is_active?: boolean | null
          name?: string
          paper_mode?: boolean | null
          parameters?: Json | null
          strategy_type?: string
          total_profit?: number | null
          total_trades?: number | null
          updated_at?: string | null
          user_id?: string
          win_rate?: number | null
        }
        Relationships: []
      }
      user_agent_activity: {
        Row: {
          action: string
          agent_id: string
          agent_name: string
          created_at: string | null
          id: string
          metadata: Json | null
          project_id: string | null
          result: Json | null
          status: string | null
          user_id: string
        }
        Insert: {
          action: string
          agent_id: string
          agent_name: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          result?: Json | null
          status?: string | null
          user_id: string
        }
        Update: {
          action?: string
          agent_id?: string
          agent_name?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          result?: Json | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_agent_activity_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "business_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_api_keys: {
        Row: {
          category: string | null
          created_at: string | null
          display_name: string
          encrypted_value: string | null
          id: string
          is_configured: boolean | null
          key_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          display_name: string
          encrypted_value?: string | null
          id?: string
          is_configured?: boolean | null
          key_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          display_name?: string
          encrypted_value?: string | null
          id?: string
          is_configured?: boolean | null
          key_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_ceos: {
        Row: {
          ceo_image_url: string | null
          ceo_name: string
          communication_style: string
          created_at: string | null
          gender: string
          id: string
          language: string
          persona: string
          personality_traits: Json | null
          updated_at: string | null
          user_id: string
          voice_id: string
          welcome_audio_url: string | null
          welcome_email_sent: boolean | null
        }
        Insert: {
          ceo_image_url?: string | null
          ceo_name: string
          communication_style?: string
          created_at?: string | null
          gender?: string
          id?: string
          language?: string
          persona?: string
          personality_traits?: Json | null
          updated_at?: string | null
          user_id: string
          voice_id?: string
          welcome_audio_url?: string | null
          welcome_email_sent?: boolean | null
        }
        Update: {
          ceo_image_url?: string | null
          ceo_name?: string
          communication_style?: string
          created_at?: string | null
          gender?: string
          id?: string
          language?: string
          persona?: string
          personality_traits?: Json | null
          updated_at?: string | null
          user_id?: string
          voice_id?: string
          welcome_audio_url?: string | null
          welcome_email_sent?: boolean | null
        }
        Relationships: []
      }
      user_domains: {
        Row: {
          auto_renew: boolean | null
          connected_website_id: string | null
          contact_info: Json | null
          created_at: string | null
          dns_configured: boolean | null
          domain_name: string
          expires_at: string | null
          id: string
          is_premium: boolean | null
          our_price: number
          privacy_enabled: boolean | null
          purchase_price: number
          purchased_at: string | null
          registrar: string
          registrar_domain_id: string | null
          reminder_sent_at: string | null
          renewal_payment_intent_id: string | null
          renewal_price: number | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_renew?: boolean | null
          connected_website_id?: string | null
          contact_info?: Json | null
          created_at?: string | null
          dns_configured?: boolean | null
          domain_name: string
          expires_at?: string | null
          id?: string
          is_premium?: boolean | null
          our_price: number
          privacy_enabled?: boolean | null
          purchase_price: number
          purchased_at?: string | null
          registrar?: string
          registrar_domain_id?: string | null
          reminder_sent_at?: string | null
          renewal_payment_intent_id?: string | null
          renewal_price?: number | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_renew?: boolean | null
          connected_website_id?: string | null
          contact_info?: Json | null
          created_at?: string | null
          dns_configured?: boolean | null
          domain_name?: string
          expires_at?: string | null
          id?: string
          is_premium?: boolean | null
          our_price?: number
          privacy_enabled?: boolean | null
          purchase_price?: number
          purchased_at?: string | null
          registrar?: string
          registrar_domain_id?: string | null
          reminder_sent_at?: string | null
          renewal_payment_intent_id?: string | null
          renewal_price?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_domains_connected_website_id_fkey"
            columns: ["connected_website_id"]
            isOneToOne: false
            referencedRelation: "generated_websites"
            referencedColumns: ["id"]
          },
        ]
      }
      user_mcp_servers: {
        Row: {
          created_at: string | null
          id: string
          last_ping: string | null
          latency_ms: number | null
          metadata: Json | null
          requests_today: number | null
          server_id: string
          server_name: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_ping?: string | null
          latency_ms?: number | null
          metadata?: Json | null
          requests_today?: number | null
          server_id: string
          server_name: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_ping?: string | null
          latency_ms?: number | null
          metadata?: Json | null
          requests_today?: number | null
          server_id?: string
          server_name?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_oauth_tokens: {
        Row: {
          access_token: string
          connector_type: string
          created_at: string | null
          id: string
          metadata: Json | null
          provider: string
          refresh_token: string | null
          scopes: string[] | null
          token_expiry: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          connector_type: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          provider: string
          refresh_token?: string | null
          scopes?: string[] | null
          token_expiry?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          connector_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          provider?: string
          refresh_token?: string | null
          scopes?: string[] | null
          token_expiry?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voice_conversations: {
        Row: {
          agent_id: string
          audio_url: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          status: string
          transcript: string | null
        }
        Insert: {
          agent_id: string
          audio_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          status?: string
          transcript?: string | null
        }
        Update: {
          agent_id?: string
          audio_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          status?: string
          transcript?: string | null
        }
        Relationships: []
      }
      website_hosting: {
        Row: {
          a_record: string | null
          cname_record: string | null
          created_at: string
          dns_verified: boolean | null
          domain: string
          hosting_type: string
          id: string
          ssl_provisioned: boolean | null
          subdomain: string | null
          txt_verification: string | null
          updated_at: string
          user_id: string
          verification_code: string | null
          website_id: string
        }
        Insert: {
          a_record?: string | null
          cname_record?: string | null
          created_at?: string
          dns_verified?: boolean | null
          domain: string
          hosting_type?: string
          id?: string
          ssl_provisioned?: boolean | null
          subdomain?: string | null
          txt_verification?: string | null
          updated_at?: string
          user_id: string
          verification_code?: string | null
          website_id: string
        }
        Update: {
          a_record?: string | null
          cname_record?: string | null
          created_at?: string
          dns_verified?: boolean | null
          domain?: string
          hosting_type?: string
          id?: string
          ssl_provisioned?: boolean | null
          subdomain?: string | null
          txt_verification?: string | null
          updated_at?: string
          user_id?: string
          verification_code?: string | null
          website_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_hosting_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: true
            referencedRelation: "generated_websites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_admin_api_key_for_dfy: {
        Args: { _key_name: string; _user_id: string }
        Returns: string
      }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initialize_user_mcp_servers: {
        Args: { _user_id: string }
        Returns: undefined
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      update_mcp_metrics: {
        Args: {
          p_latency_ms: number
          p_requests_increment?: number
          p_server_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "subscriber" | "user" | "super_admin"
      subscription_status: "trial" | "active" | "canceled" | "expired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "subscriber", "user", "super_admin"],
      subscription_status: ["trial", "active", "canceled", "expired"],
    },
  },
} as const
