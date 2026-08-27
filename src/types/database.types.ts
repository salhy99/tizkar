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
    PostgrestVersion: "14.17"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_types: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name_ar: string
          name_en: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name_ar: string
          name_en: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name_ar?: string
          name_en?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      invitation_analytics_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          invitation_id: string
          metadata: Json | null
          visitor_hash: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          invitation_id: string
          metadata?: Json | null
          visitor_hash?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          invitation_id?: string
          metadata?: Json | null
          visitor_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitation_analytics_events_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_rsvps: {
        Row: {
          attendance_status: string
          created_at: string
          guest_count: number
          guest_name: string
          id: string
          invitation_id: string
          message: string | null
          updated_at: string
        }
        Insert: {
          attendance_status: string
          created_at?: string
          guest_count?: number
          guest_name: string
          id?: string
          invitation_id: string
          message?: string | null
          updated_at?: string
        }
        Update: {
          attendance_status?: string
          created_at?: string
          guest_count?: number
          guest_name?: string
          id?: string
          invitation_id?: string
          message?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitation_rsvps_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_versions: {
        Row: {
          created_at: string | null
          id: string
          invitation_data: Json | null
          invitation_id: string | null
          is_published: boolean | null
          template_version_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invitation_data?: Json | null
          invitation_id?: string | null
          is_published?: boolean | null
          template_version_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invitation_data?: Json | null
          invitation_id?: string | null
          is_published?: boolean | null
          template_version_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitation_versions_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_versions_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_views: {
        Row: {
          id: string
          invitation_id: string | null
          viewed_at: string | null
        }
        Insert: {
          id?: string
          invitation_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          id?: string
          invitation_id?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitation_views_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string | null
          edit_token_hash: string | null
          event_type_id: string | null
          expires_at: string | null
          id: string
          last_recovered_at: string | null
          published_at: string | null
          recovery_key_hash: string | null
          slug: string
          status: Database["public"]["Enums"]["invitation_status"] | null
          template_id: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          edit_token_hash?: string | null
          event_type_id?: string | null
          expires_at?: string | null
          id?: string
          last_recovered_at?: string | null
          published_at?: string | null
          recovery_key_hash?: string | null
          slug: string
          status?: Database["public"]["Enums"]["invitation_status"] | null
          template_id?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          edit_token_hash?: string | null
          event_type_id?: string | null
          expires_at?: string | null
          id?: string
          last_recovered_at?: string | null
          published_at?: string | null
          recovery_key_hash?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["invitation_status"] | null
          template_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_notes: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          currency: string | null
          id: string
          invitation_id: string | null
          paid_at: string | null
          payment_method: string | null
          plan_id: string | null
          plan_snapshot: Json | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          status: string | null
          tracking_code: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          invitation_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          plan_id?: string | null
          plan_snapshot?: Json | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: string | null
          tracking_code?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          invitation_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          plan_id?: string | null
          plan_snapshot?: Json | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: string | null
          tracking_code?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_requests: {
        Row: {
          attempts: number | null
          consumed_at: string | null
          created_at: string | null
          expires_at: string
          id: string
          otp_hash: string
          phone: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          consumed_at?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          otp_hash: string
          phone: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          consumed_at?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          otp_hash?: string
          phone?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          created_at: string | null
          id: string
          order_id: string | null
          payment_method: string
          status: string | null
          transaction_reference: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          payment_method: string
          status?: string | null
          transaction_reference?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          payment_method?: string
          status?: string | null
          transaction_reference?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_features: {
        Row: {
          created_at: string | null
          feature_key: string
          feature_value: Json | null
          id: string
          plan_id: string | null
        }
        Insert: {
          created_at?: string | null
          feature_key: string
          feature_value?: Json | null
          id?: string
          plan_id?: string | null
        }
        Update: {
          created_at?: string | null
          feature_key?: string
          feature_value?: Json | null
          id?: string
          plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string | null
          currency: string | null
          display_order: number | null
          duration_days: number
          id: string
          name: string
          price: number
          status: Database["public"]["Enums"]["plan_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          display_order?: number | null
          duration_days: number
          id?: string
          name: string
          price: number
          status?: Database["public"]["Enums"]["plan_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          display_order?: number | null
          duration_days?: number
          id?: string
          name?: string
          price?: number
          status?: Database["public"]["Enums"]["plan_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rsvp_responses: {
        Row: {
          companions: number | null
          created_at: string | null
          guest_name: string
          id: string
          invitation_id: string | null
          message: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          companions?: number | null
          created_at?: string | null
          guest_name: string
          id?: string
          invitation_id?: string | null
          message?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          companions?: number | null
          created_at?: string | null
          guest_name?: string
          id?: string
          invitation_id?: string | null
          message?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rsvp_responses_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      template_versions: {
        Row: {
          configuration: Json | null
          created_at: string | null
          id: string
          sections: Json | null
          status: Database["public"]["Enums"]["template_status"] | null
          template_id: string | null
          theme: Json | null
          version_number: string
        }
        Insert: {
          configuration?: Json | null
          created_at?: string | null
          id?: string
          sections?: Json | null
          status?: Database["public"]["Enums"]["template_status"] | null
          template_id?: string | null
          theme?: Json | null
          version_number: string
        }
        Update: {
          configuration?: Json | null
          created_at?: string | null
          id?: string
          sections?: Json | null
          status?: Database["public"]["Enums"]["template_status"] | null
          template_id?: string | null
          theme?: Json | null
          version_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          base_price: number | null
          created_at: string | null
          description: string | null
          event_type_id: string | null
          id: string
          is_featured: boolean | null
          name: string
          slug: string
          status: Database["public"]["Enums"]["template_status"] | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          base_price?: number | null
          created_at?: string | null
          description?: string | null
          event_type_id?: string | null
          id?: string
          is_featured?: boolean | null
          name: string
          slug: string
          status?: Database["public"]["Enums"]["template_status"] | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          base_price?: number | null
          created_at?: string | null
          description?: string | null
          event_type_id?: string | null
          id?: string
          is_featured?: boolean | null
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["template_status"] | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      increment_otp_attempt: { Args: { request_id: string }; Returns: number }
    }
    Enums: {
      invitation_status:
        | "DRAFT"
        | "PENDING_PAYMENT"
        | "PENDING_APPROVAL"
        | "PUBLISHED"
        | "REJECTED"
        | "SUSPENDED"
        | "EXPIRED"
      plan_status: "ACTIVE" | "INACTIVE" | "ARCHIVED"
      template_status: "ACTIVE" | "INACTIVE" | "DRAFT" | "ARCHIVED"
      user_role: "USER" | "ADMIN" | "SUPER_ADMIN" | "DESIGNER" | "SUPPORT"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      invitation_status: [
        "DRAFT",
        "PENDING_PAYMENT",
        "PENDING_APPROVAL",
        "PUBLISHED",
        "REJECTED",
        "SUSPENDED",
        "EXPIRED",
      ],
      plan_status: ["ACTIVE", "INACTIVE", "ARCHIVED"],
      template_status: ["ACTIVE", "INACTIVE", "DRAFT", "ARCHIVED"],
      user_role: ["USER", "ADMIN", "SUPER_ADMIN", "DESIGNER", "SUPPORT"],
    },
  },
} as const
