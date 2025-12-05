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
          user_id: string
        }
        Insert: {
          business_model?: Json | null
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
          user_id: string
        }
        Update: {
          business_model?: Json | null
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
          approved_at: string | null
          approved_by: string | null
          assigned_agent_id: string | null
          assigned_team_id: string | null
          ceo_approved: boolean | null
          content: Json | null
          created_at: string | null
          deliverable_type: string
          description: string | null
          feedback: string | null
          feedback_history: Json | null
          generated_content: Json | null
          id: string
          name: string
          phase_id: string
          reviewed_by: string | null
          status: string | null
          updated_at: string | null
          user_approved: boolean | null
          user_id: string
          version: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_agent_id?: string | null
          assigned_team_id?: string | null
          ceo_approved?: boolean | null
          content?: Json | null
          created_at?: string | null
          deliverable_type: string
          description?: string | null
          feedback?: string | null
          feedback_history?: Json | null
          generated_content?: Json | null
          id?: string
          name: string
          phase_id: string
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_approved?: boolean | null
          user_id: string
          version?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_agent_id?: string | null
          assigned_team_id?: string | null
          ceo_approved?: boolean | null
          content?: Json | null
          created_at?: string | null
          deliverable_type?: string
          description?: string | null
          feedback?: string | null
          feedback_history?: Json | null
          generated_content?: Json | null
          id?: string
          name?: string
          phase_id?: string
          reviewed_by?: string | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
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
          full_name?: string | null
          id: string
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
          full_name?: string | null
          id?: string
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
