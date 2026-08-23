export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          phone: string | null
          display_name: string | null
          role: 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'DESIGNER' | 'SUPPORT'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          phone?: string | null
          display_name?: string | null
          role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'DESIGNER' | 'SUPPORT'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          phone?: string | null
          display_name?: string | null
          role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'DESIGNER' | 'SUPPORT'
          created_at?: string
          updated_at?: string
        }
      }
      event_types: {
        Row: {
          id: string
          name_ar: string
          name_en: string
          slug: string
          is_active: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name_ar: string
          name_en: string
          slug: string
          is_active?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name_ar?: string
          name_en?: string
          slug?: string
          is_active?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      plans: {
        Row: {
          id: string
          name: string
          price: number
          currency: string
          duration_days: number
          status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          price: number
          currency?: string
          duration_days: number
          status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          price?: number
          currency?: string
          duration_days?: number
          status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      plan_features: {
        Row: {
          id: string
          plan_id: string
          feature_key: string
          feature_value: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          feature_key: string
          feature_value?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          feature_key?: string
          feature_value?: Json | null
          created_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          event_type_id: string
          name: string
          slug: string
          description: string | null
          base_price: number | null
          status: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED'
          is_featured: boolean
          thumbnail_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_type_id: string
          name: string
          slug: string
          description?: string | null
          base_price?: number | null
          status?: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED'
          is_featured?: boolean
          thumbnail_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_type_id?: string
          name?: string
          slug?: string
          description?: string | null
          base_price?: number | null
          status?: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED'
          is_featured?: boolean
          thumbnail_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      template_versions: {
        Row: {
          id: string
          template_id: string
          version_number: string
          configuration: Json
          theme: Json
          sections: Json
          status: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED'
          created_at: string
        }
        Insert: {
          id?: string
          template_id: string
          version_number: string
          configuration?: Json
          theme?: Json
          sections?: Json
          status?: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED'
          created_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          version_number?: string
          configuration?: Json
          theme?: Json
          sections?: Json
          status?: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED'
          created_at?: string
        }
      }
      invitations: {
        Row: {
          id: string
          user_id: string
          template_id: string
          event_type_id: string
          title: string
          slug: string
          status: 'DRAFT' | 'PENDING_PAYMENT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'REJECTED' | 'SUSPENDED' | 'EXPIRED'
          published_at: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          template_id: string
          event_type_id: string
          title: string
          slug: string
          status?: 'DRAFT' | 'PENDING_PAYMENT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'REJECTED' | 'SUSPENDED' | 'EXPIRED'
          published_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          template_id?: string
          event_type_id?: string
          title?: string
          slug?: string
          status?: 'DRAFT' | 'PENDING_PAYMENT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'REJECTED' | 'SUSPENDED' | 'EXPIRED'
          published_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invitation_versions: {
        Row: {
          id: string
          invitation_id: string
          template_version_id: string
          is_published: boolean
          invitation_data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invitation_id: string
          template_version_id: string
          is_published?: boolean
          invitation_data?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invitation_id?: string
          template_version_id?: string
          is_published?: boolean
          invitation_data?: Json
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          invitation_id: string
          plan_id: string
          amount: number
          currency: string
          status: string
          approved_by: string | null
          approved_at: string | null
          rejected_by: string | null
          rejected_at: string | null
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          invitation_id: string
          plan_id: string
          amount: number
          currency?: string
          status?: string
          approved_by?: string | null
          approved_at?: string | null
          rejected_by?: string | null
          rejected_at?: string | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          invitation_id?: string
          plan_id?: string
          amount?: number
          currency?: string
          status?: string
          approved_by?: string | null
          approved_at?: string | null
          rejected_by?: string | null
          rejected_at?: string | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          order_id: string
          payment_method: string
          transaction_reference: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          payment_method: string
          transaction_reference?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          payment_method?: string
          transaction_reference?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
