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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      app_role: "admin" | "subscriber" | "user"
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
      app_role: ["admin", "subscriber", "user"],
      subscription_status: ["trial", "active", "canceled", "expired"],
    },
  },
} as const
