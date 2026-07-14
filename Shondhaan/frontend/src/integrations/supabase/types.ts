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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      app_notifications: {
        Row: {
          channel: string
          created_at: string
          id: string
          is_read: boolean
          link_url: string | null
          message: string
          metadata: Json | null
          priority: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          message: string
          metadata?: Json | null
          priority?: string
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          message?: string
          metadata?: Json | null
          priority?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      approval_queue: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          payload: Json | null
          priority: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string | null
          submitter_name: string | null
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          payload?: Json | null
          priority?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          submitter_name?: string | null
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          payload?: Json | null
          priority?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          submitter_name?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      area_representatives: {
        Row: {
          commission_percent: number | null
          created_at: string
          district: string
          division: string
          id: string
          is_active: boolean
          name: string
          phone: string
          thana: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          commission_percent?: number | null
          created_at?: string
          district: string
          division: string
          id?: string
          is_active?: boolean
          name: string
          phone: string
          thana?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          commission_percent?: number | null
          created_at?: string
          district?: string
          division?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string
          thana?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assignable_modules: {
        Row: {
          applicable_roles: string[]
          category: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          label_bn: string
          label_en: string | null
          module_key: string
          sort_order: number
        }
        Insert: {
          applicable_roles?: string[]
          category?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          label_bn: string
          label_en?: string | null
          module_key: string
          sort_order?: number
        }
        Update: {
          applicable_roles?: string[]
          category?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          label_bn?: string
          label_en?: string | null
          module_key?: string
          sort_order?: number
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      booking_assignments: {
        Row: {
          assigned_by: string | null
          assignment_type: string
          booking_id: string
          created_at: string
          id: string
          provider_id: string | null
          reason: string | null
          representative_id: string | null
          score: number | null
        }
        Insert: {
          assigned_by?: string | null
          assignment_type?: string
          booking_id: string
          created_at?: string
          id?: string
          provider_id?: string | null
          reason?: string | null
          representative_id?: string | null
          score?: number | null
        }
        Update: {
          assigned_by?: string | null
          assignment_type?: string
          booking_id?: string
          created_at?: string
          id?: string
          provider_id?: string | null
          reason?: string | null
          representative_id?: string | null
          score?: number | null
        }
        Relationships: []
      }
      booking_messages: {
        Row: {
          booking_id: string
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          message: string
          sender_id: string
          sender_role: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          message: string
          sender_id: string
          sender_role?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          message?: string
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_date: string
          booking_time: string
          created_at: string
          customer_address: string
          customer_name: string
          customer_phone: string
          id: string
          is_emergency: boolean
          package_name: string
          package_price: number
          provider_id: string | null
          service_slug: string
          service_title: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_date: string
          booking_time: string
          created_at?: string
          customer_address: string
          customer_name: string
          customer_phone: string
          id?: string
          is_emergency?: boolean
          package_name: string
          package_price: number
          provider_id?: string | null
          service_slug: string
          service_title: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_date?: string
          booking_time?: string
          created_at?: string
          customer_address?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          is_emergency?: boolean
          package_name?: string
          package_price?: number
          provider_id?: string | null
          service_slug?: string
          service_title?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      call_ice_candidates: {
        Row: {
          call_id: string
          candidate: Json
          created_at: string
          id: string
          sender: string
        }
        Insert: {
          call_id: string
          candidate: Json
          created_at?: string
          id?: string
          sender: string
        }
        Update: {
          call_id?: string
          candidate?: Json
          created_at?: string
          id?: string
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_ice_candidates_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          answered_at: string | null
          call_center_user_id: string | null
          caller_name: string
          caller_phone: string
          conversation_id: string | null
          created_at: string
          ended_at: string | null
          id: string
          sdp_answer: Json | null
          sdp_offer: Json | null
          status: string
        }
        Insert: {
          answered_at?: string | null
          call_center_user_id?: string | null
          caller_name: string
          caller_phone: string
          conversation_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          sdp_answer?: Json | null
          sdp_offer?: Json | null
          status?: string
        }
        Update: {
          answered_at?: string | null
          call_center_user_id?: string | null
          caller_name?: string
          caller_phone?: string
          conversation_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          sdp_answer?: Json | null
          sdp_offer?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          id: string
          is_active: boolean
          service_interest: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          id?: string
          is_active?: boolean
          service_interest?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          id?: string
          is_active?: boolean
          service_interest?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_categories: {
        Row: {
          color_accent: string | null
          color_chip_bg: string | null
          color_chip_text: string | null
          color_gradient: string | null
          color_overlay: string | null
          created_at: string
          icon_url: string | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          color_accent?: string | null
          color_chip_bg?: string | null
          color_chip_text?: string | null
          color_gradient?: string | null
          color_overlay?: string | null
          created_at?: string
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          color_accent?: string | null
          color_chip_bg?: string | null
          color_chip_text?: string | null
          color_gradient?: string | null
          color_overlay?: string | null
          created_at?: string
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      cms_hero_banners: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean | null
          sort_order: number | null
          subtitle_bn: string | null
          subtitle_en: string | null
          title_bn: string
          title_en: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          subtitle_bn?: string | null
          subtitle_en?: string | null
          title_bn: string
          title_en?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          subtitle_bn?: string | null
          subtitle_en?: string | null
          title_bn?: string
          title_en?: string | null
        }
        Relationships: []
      }
      cms_homepage_sections: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          section_key: string
          service_slugs: Json | null
          sort_order: number | null
          title_bn: string
          title_en: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          section_key: string
          service_slugs?: Json | null
          sort_order?: number | null
          title_bn: string
          title_en?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          section_key?: string
          service_slugs?: Json | null
          sort_order?: number | null
          title_bn?: string
          title_en?: string | null
        }
        Relationships: []
      }
      cms_service_packages: {
        Row: {
          created_at: string
          features: Json | null
          id: string
          name: string
          original_price: number | null
          price: number
          service_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          features?: Json | null
          id?: string
          name: string
          original_price?: number | null
          price: number
          service_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          features?: Json | null
          id?: string
          name?: string
          original_price?: number | null
          price?: number
          service_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_service_packages_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "cms_services"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_services: {
        Row: {
          available_cities: Json | null
          category_id: string | null
          commission_percent: number | null
          created_at: string
          description: string | null
          features: Json | null
          id: string
          image_url: string | null
          is_active: boolean | null
          rating: number | null
          slug: string
          sort_order: number | null
          title: string
          title_en: string | null
          total_orders: number | null
          total_reviews: number | null
          updated_at: string
        }
        Insert: {
          available_cities?: Json | null
          category_id?: string | null
          commission_percent?: number | null
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          rating?: number | null
          slug: string
          sort_order?: number | null
          title: string
          title_en?: string | null
          total_orders?: number | null
          total_reviews?: number | null
          updated_at?: string
        }
        Update: {
          available_cities?: Json | null
          category_id?: string | null
          commission_percent?: number | null
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          rating?: number | null
          slug?: string
          sort_order?: number | null
          title?: string
          title_en?: string | null
          total_orders?: number | null
          total_reviews?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "cms_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_site_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cms_special_offers: {
        Row: {
          accent_color: string | null
          badge: string | null
          bg_accent: string | null
          border_color: string | null
          created_at: string
          description_bn: string | null
          description_en: string | null
          discount_bn: string
          discount_en: string | null
          expires_at: string | null
          gradient: string | null
          id: string
          is_active: boolean | null
          service_slug: string | null
          sort_order: number | null
          title_bn: string
          title_en: string | null
        }
        Insert: {
          accent_color?: string | null
          badge?: string | null
          bg_accent?: string | null
          border_color?: string | null
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          discount_bn: string
          discount_en?: string | null
          expires_at?: string | null
          gradient?: string | null
          id?: string
          is_active?: boolean | null
          service_slug?: string | null
          sort_order?: number | null
          title_bn: string
          title_en?: string | null
        }
        Update: {
          accent_color?: string | null
          badge?: string | null
          bg_accent?: string | null
          border_color?: string | null
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          discount_bn?: string
          discount_en?: string | null
          expires_at?: string | null
          gradient?: string | null
          id?: string
          is_active?: boolean | null
          service_slug?: string | null
          sort_order?: number | null
          title_bn?: string
          title_en?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount_amount: number | null
          min_order_amount: number | null
          starts_at: string | null
          updated_at: string
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_order_amount?: number | null
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_order_amount?: number | null
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: []
      }
      daily_stats_snapshot: {
        Row: {
          cancelled_bookings: number | null
          completed_bookings: number | null
          created_at: string
          id: string
          metadata: Json | null
          new_bookings: number | null
          new_deals: number | null
          new_jobs: number | null
          new_users: number | null
          open_disputes: number | null
          pending_approvals: number | null
          snapshot_date: string
          total_bookings: number | null
          total_revenue: number | null
        }
        Insert: {
          cancelled_bookings?: number | null
          completed_bookings?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_bookings?: number | null
          new_deals?: number | null
          new_jobs?: number | null
          new_users?: number | null
          open_disputes?: number | null
          pending_approvals?: number | null
          snapshot_date?: string
          total_bookings?: number | null
          total_revenue?: number | null
        }
        Update: {
          cancelled_bookings?: number | null
          completed_bookings?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_bookings?: number | null
          new_deals?: number | null
          new_jobs?: number | null
          new_users?: number | null
          open_disputes?: number | null
          pending_approvals?: number | null
          snapshot_date?: string
          total_bookings?: number | null
          total_revenue?: number | null
        }
        Relationships: []
      }
      deal_categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          parent_id: string | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          parent_id?: string | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "deal_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_favorites: {
        Row: {
          created_at: string | null
          id: string
          conversation_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          conversation_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          conversation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_favorites_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "deal_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_listings: {
        Row: {
          category_id: string | null
          condition: string | null
          created_at: string | null
          description: string | null
          hide_phone: boolean | null
          id: string
          images: Json | null
          inquiries_count: number | null
          is_featured: boolean | null
          is_negotiable: boolean | null
          location_area: string | null
          location_district: string | null
          location_division: string | null
          phone: string | null
          price: number
          status: string | null
          title: string
          title_en: string | null
          updated_at: string | null
          user_id: string
          views_count: number | null
        }
        Insert: {
          category_id?: string | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          hide_phone?: boolean | null
          id?: string
          images?: Json | null
          inquiries_count?: number | null
          is_featured?: boolean | null
          is_negotiable?: boolean | null
          location_area?: string | null
          location_district?: string | null
          location_division?: string | null
          phone?: string | null
          price?: number
          status?: string | null
          title: string
          title_en?: string | null
          updated_at?: string | null
          user_id: string
          views_count?: number | null
        }
        Update: {
          category_id?: string | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          hide_phone?: boolean | null
          id?: string
          images?: Json | null
          inquiries_count?: number | null
          is_featured?: boolean | null
          is_negotiable?: boolean | null
          location_area?: string | null
          location_district?: string | null
          location_division?: string | null
          phone?: string | null
          price?: number
          status?: string | null
          title?: string
          title_en?: string | null
          updated_at?: string | null
          user_id?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "deal_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_messages: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          conversation_id: string
          message: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          conversation_id: string
          message: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          conversation_id?: string
          message?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "deal_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_reports: {
        Row: {
          admin_note: string | null
          created_at: string
          details: string | null
          id: string
          conversation_id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          details?: string | null
          id?: string
          conversation_id: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          details?: string | null
          id?: string
          conversation_id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_reports_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "deal_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_messages: {
        Row: {
          attachment_url: string | null
          created_at: string
          dispute_id: string
          id: string
          is_internal: boolean
          message: string
          sender_id: string
          sender_role: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          dispute_id: string
          id?: string
          is_internal?: boolean
          message: string
          sender_id: string
          sender_role?: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          dispute_id?: string
          id?: string
          is_internal?: boolean
          message?: string
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_messages_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          priority: string
          refund_amount: number | null
          refund_status: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          resolution_note: string | null
          resolved_at: string | null
          sla_due_at: string | null
          status: string
          subject: string
          ticket_no: string
          updated_at: string
          user_email: string | null
          user_id: string
          user_phone: string | null
        }
        Insert: {
          assigned_to?: string | null
          category: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          refund_amount?: number | null
          refund_status?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          sla_due_at?: string | null
          status?: string
          subject: string
          ticket_no?: string
          updated_at?: string
          user_email?: string | null
          user_id: string
          user_phone?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          refund_amount?: number | null
          refund_status?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          sla_due_at?: string | null
          status?: string
          subject?: string
          ticket_no?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string
          user_phone?: string | null
        }
        Relationships: []
      }
      employer_profiles: {
        Row: {
          address: string | null
          company_logo_url: string | null
          company_name: string
          company_name_bn: string | null
          company_type: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          district: string | null
          division: string | null
          employee_count: string | null
          establishment_year: number | null
          id: string
          industry_type: string | null
          is_active: boolean | null
          is_verified: boolean | null
          thana: string | null
          total_hires: number | null
          total_jobs_posted: number | null
          trade_license_url: string | null
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          address?: string | null
          company_logo_url?: string | null
          company_name: string
          company_name_bn?: string | null
          company_type?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          division?: string | null
          employee_count?: string | null
          establishment_year?: number | null
          id?: string
          industry_type?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          thana?: string | null
          total_hires?: number | null
          total_jobs_posted?: number | null
          trade_license_url?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          address?: string | null
          company_logo_url?: string | null
          company_name?: string
          company_name_bn?: string | null
          company_type?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          division?: string | null
          employee_count?: string | null
          establishment_year?: number | null
          id?: string
          industry_type?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          thana?: string | null
          total_hires?: number | null
          total_jobs_posted?: number | null
          trade_license_url?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      employer_subscriptions: {
        Row: {
          created_at: string
          employer_id: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          jobs_limit: number | null
          jobs_used: number | null
          package_id: string
          payment_method: string | null
          payment_status: string | null
          starts_at: string
          transaction_id: string | null
        }
        Insert: {
          created_at?: string
          employer_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          jobs_limit?: number | null
          jobs_used?: number | null
          package_id: string
          payment_method?: string | null
          payment_status?: string | null
          starts_at?: string
          transaction_id?: string | null
        }
        Update: {
          created_at?: string
          employer_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          jobs_limit?: number | null
          jobs_used?: number | null
          package_id?: string
          payment_method?: string | null
          payment_status?: string | null
          starts_at?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employer_subscriptions_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employer_subscriptions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "job_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      employer_talent_bookmarks: {
        Row: {
          created_at: string
          employer_id: string
          id: string
          note: string | null
          seeker_profile_id: string
        }
        Insert: {
          created_at?: string
          employer_id: string
          id?: string
          note?: string | null
          seeker_profile_id: string
        }
        Update: {
          created_at?: string
          employer_id?: string
          id?: string
          note?: string | null
          seeker_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employer_talent_bookmarks_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employer_talent_bookmarks_seeker_profile_id_fkey"
            columns: ["seeker_profile_id"]
            isOneToOne: false
            referencedRelation: "job_seeker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          message_type: string
          metadata: Json | null
          service_slug: string
          user_id: string
          user_name: string
          user_role: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          message_type?: string
          metadata?: Json | null
          service_slug: string
          user_id: string
          user_name: string
          user_role?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          message_type?: string
          metadata?: Json | null
          service_slug?: string
          user_id?: string
          user_name?: string
          user_role?: string
        }
        Relationships: []
      }
      interview_schedules: {
        Row: {
          application_id: string
          candidate_notified: boolean | null
          created_at: string
          duration_minutes: number | null
          employer_id: string
          id: string
          interview_type: string
          job_id: string
          location: string | null
          meeting_link: string | null
          notes: string | null
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          application_id: string
          candidate_notified?: boolean | null
          created_at?: string
          duration_minutes?: number | null
          employer_id: string
          id?: string
          interview_type?: string
          job_id: string
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          candidate_notified?: boolean | null
          created_at?: string
          duration_minutes?: number | null
          employer_id?: string
          id?: string
          interview_type?: string
          job_id?: string
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_schedules_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_portal_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_schedules_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_schedules_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          address: string
          created_at: string
          email: string | null
          experience_years: number | null
          full_name: string
          id: string
          nid_back_url: string
          nid_front_url: string
          phone: string
          service_category: string
          status: string
          user_id: string | null
        }
        Insert: {
          address: string
          created_at?: string
          email?: string | null
          experience_years?: number | null
          full_name: string
          id?: string
          nid_back_url: string
          nid_front_url: string
          phone: string
          service_category: string
          status?: string
          user_id?: string | null
        }
        Update: {
          address?: string
          created_at?: string
          email?: string | null
          experience_years?: number | null
          full_name?: string
          id?: string
          nid_back_url?: string
          nid_front_url?: string
          phone?: string
          service_category?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      job_packages: {
        Row: {
          created_at: string
          duration_days: number
          features: Json | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          max_applications: number | null
          max_jobs_per_year: number | null
          name: string
          name_bn: string | null
          price: number
          sort_order: number | null
          updated_at: string
          visibility_level: string | null
        }
        Insert: {
          created_at?: string
          duration_days?: number
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          max_applications?: number | null
          max_jobs_per_year?: number | null
          name: string
          name_bn?: string | null
          price?: number
          sort_order?: number | null
          updated_at?: string
          visibility_level?: string | null
        }
        Update: {
          created_at?: string
          duration_days?: number
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          max_applications?: number | null
          max_jobs_per_year?: number | null
          name?: string
          name_bn?: string | null
          price?: number
          sort_order?: number | null
          updated_at?: string
          visibility_level?: string | null
        }
        Relationships: []
      }
      job_portal_applications: {
        Row: {
          applicant_email: string | null
          applicant_name: string
          applicant_phone: string
          attendance: string | null
          cover_letter: string | null
          created_at: string
          cv_url: string | null
          hiring_stage: string | null
          id: string
          interviewer_notes: string | null
          job_id: string
          score: number | null
          status: string
          user_id: string
          video_cv_url: string | null
        }
        Insert: {
          applicant_email?: string | null
          applicant_name: string
          applicant_phone: string
          attendance?: string | null
          cover_letter?: string | null
          created_at?: string
          cv_url?: string | null
          hiring_stage?: string | null
          id?: string
          interviewer_notes?: string | null
          job_id: string
          score?: number | null
          status?: string
          user_id: string
          video_cv_url?: string | null
        }
        Update: {
          applicant_email?: string | null
          applicant_name?: string
          applicant_phone?: string
          attendance?: string | null
          cover_letter?: string | null
          created_at?: string
          cv_url?: string | null
          hiring_stage?: string | null
          id?: string
          interviewer_notes?: string | null
          job_id?: string
          score?: number | null
          status?: string
          user_id?: string
          video_cv_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_portal_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_seeker_profiles: {
        Row: {
          about_me: string | null
          address: string | null
          career_objective: string | null
          created_at: string
          date_of_birth: string | null
          education: Json | null
          email: string | null
          expected_salary: number | null
          experience: Json | null
          full_name: string
          gender: string | null
          id: string
          is_available: boolean | null
          languages: Json | null
          marital_status: string | null
          nationality: string | null
          phone: string | null
          photo_url: string | null
          preferred_districts: Json | null
          preferred_job_categories: Json | null
          present_salary: number | null
          profile_completeness: number | null
          reference_persons: Json | null
          skills: Json | null
          training: Json | null
          updated_at: string
          user_id: string
          video_cv_url: string | null
        }
        Insert: {
          about_me?: string | null
          address?: string | null
          career_objective?: string | null
          created_at?: string
          date_of_birth?: string | null
          education?: Json | null
          email?: string | null
          expected_salary?: number | null
          experience?: Json | null
          full_name?: string
          gender?: string | null
          id?: string
          is_available?: boolean | null
          languages?: Json | null
          marital_status?: string | null
          nationality?: string | null
          phone?: string | null
          photo_url?: string | null
          preferred_districts?: Json | null
          preferred_job_categories?: Json | null
          present_salary?: number | null
          profile_completeness?: number | null
          reference_persons?: Json | null
          skills?: Json | null
          training?: Json | null
          updated_at?: string
          user_id: string
          video_cv_url?: string | null
        }
        Update: {
          about_me?: string | null
          address?: string | null
          career_objective?: string | null
          created_at?: string
          date_of_birth?: string | null
          education?: Json | null
          email?: string | null
          expected_salary?: number | null
          experience?: Json | null
          full_name?: string
          gender?: string | null
          id?: string
          is_available?: boolean | null
          languages?: Json | null
          marital_status?: string | null
          nationality?: string | null
          phone?: string | null
          photo_url?: string | null
          preferred_districts?: Json | null
          preferred_job_categories?: Json | null
          present_salary?: number | null
          profile_completeness?: number | null
          reference_persons?: Json | null
          skills?: Json | null
          training?: Json | null
          updated_at?: string
          user_id?: string
          video_cv_url?: string | null
        }
        Relationships: []
      }
      jobs: {
        Row: {
          address: string | null
          age_max: number | null
          age_min: number | null
          application_instruction: string | null
          applications_count: number | null
          benefits: string | null
          category: string | null
          closed_at: string | null
          closure_reason: string | null
          company_logo_url: string | null
          company_name: string
          company_type: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          deadline: string | null
          description: string
          district: string | null
          division: string | null
          education_required: string | null
          experience_max: number | null
          experience_min: number | null
          gender_preference: string | null
          hired_count: number | null
          id: string
          is_closed: boolean | null
          is_featured: boolean | null
          job_type: string
          requirements: string | null
          salary_max: number | null
          salary_min: number | null
          salary_negotiable: boolean | null
          status: string
          thana: string | null
          title: string
          title_en: string | null
          updated_at: string
          user_id: string
          vacancy_count: number | null
          views_count: number | null
        }
        Insert: {
          address?: string | null
          age_max?: number | null
          age_min?: number | null
          application_instruction?: string | null
          applications_count?: number | null
          benefits?: string | null
          category?: string | null
          closed_at?: string | null
          closure_reason?: string | null
          company_logo_url?: string | null
          company_name: string
          company_type?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          deadline?: string | null
          description: string
          district?: string | null
          division?: string | null
          education_required?: string | null
          experience_max?: number | null
          experience_min?: number | null
          gender_preference?: string | null
          hired_count?: number | null
          id?: string
          is_closed?: boolean | null
          is_featured?: boolean | null
          job_type?: string
          requirements?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_negotiable?: boolean | null
          status?: string
          thana?: string | null
          title: string
          title_en?: string | null
          updated_at?: string
          user_id: string
          vacancy_count?: number | null
          views_count?: number | null
        }
        Update: {
          address?: string | null
          age_max?: number | null
          age_min?: number | null
          application_instruction?: string | null
          applications_count?: number | null
          benefits?: string | null
          category?: string | null
          closed_at?: string | null
          closure_reason?: string | null
          company_logo_url?: string | null
          company_name?: string
          company_type?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          deadline?: string | null
          description?: string
          district?: string | null
          division?: string | null
          education_required?: string | null
          experience_max?: number | null
          experience_min?: number | null
          gender_preference?: string | null
          hired_count?: number | null
          id?: string
          is_closed?: boolean | null
          is_featured?: boolean | null
          job_type?: string
          requirements?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_negotiable?: boolean | null
          status?: string
          thana?: string | null
          title?: string
          title_en?: string | null
          updated_at?: string
          user_id?: string
          vacancy_count?: number | null
          views_count?: number | null
        }
        Relationships: []
      }
      lab_test_reports: {
        Row: {
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          expected_date: string | null
          id: string
          notes: string | null
          report_file_url: string | null
          report_ready: boolean
          sample_date: string
          status: string
          test_name: string
          test_name_en: string | null
          tracking_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          report_file_url?: string | null
          report_ready?: boolean
          sample_date?: string
          status?: string
          test_name: string
          test_name_en?: string | null
          tracking_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          report_file_url?: string | null
          report_ready?: boolean
          sample_date?: string
          status?: string
          test_name?: string
          test_name_en?: string | null
          tracking_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mart_banners: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean | null
          link_url: string | null
          sort_order: number | null
          subtitle: string | null
          subtitle_en: string | null
          title: string
          title_en: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          subtitle?: string | null
          subtitle_en?: string | null
          title: string
          title_en?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          subtitle?: string | null
          subtitle_en?: string | null
          title?: string
          title_en?: string | null
        }
        Relationships: []
      }
      mart_categories: {
        Row: {
          created_at: string
          icon_url: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          name_en: string | null
          parent_id: string | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          icon_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          name_en?: string | null
          parent_id?: string | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          icon_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mart_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "mart_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      mart_coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount_amount: number | null
          min_order_amount: number | null
          starts_at: string | null
          updated_at: string
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_order_amount?: number | null
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_order_amount?: number | null
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: []
      }
      mart_messages: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          product_id: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          product_id: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          product_id?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mart_messages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mart_products"
            referencedColumns: ["id"]
          },
        ]
      }
      mart_order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_image: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_image?: string | null
          product_name: string
          quantity?: number
          total_price: number
          unit_price: number
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_image?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mart_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "mart_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mart_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mart_products"
            referencedColumns: ["id"]
          },
        ]
      }
      mart_orders: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          customer_name: string
          customer_phone: string
          discount: number | null
          estimated_delivery_date: string | null
          id: string
          notes: string | null
          order_number: string
          payment_method: string
          payment_status: string
          return_reason: string | null
          return_requested_at: string | null
          shipping_address: string
          shipping_district: string | null
          shipping_division: string | null
          shipping_fee: number | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_name: string
          customer_phone: string
          discount?: number | null
          estimated_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string
          payment_status?: string
          return_reason?: string | null
          return_requested_at?: string | null
          shipping_address: string
          shipping_district?: string | null
          shipping_division?: string | null
          shipping_fee?: number | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_name?: string
          customer_phone?: string
          discount?: number | null
          estimated_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string
          payment_status?: string
          return_reason?: string | null
          return_requested_at?: string | null
          shipping_address?: string
          shipping_district?: string | null
          shipping_division?: string | null
          shipping_fee?: number | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mart_product_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          created_at: string
          id: string
          is_visible: boolean | null
          product_id: string
          question: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          id?: string
          is_visible?: boolean | null
          product_id: string
          question: string
          user_id: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          id?: string
          is_visible?: boolean | null
          product_id?: string
          question?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mart_product_questions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mart_products"
            referencedColumns: ["id"]
          },
        ]
      }
      mart_product_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          product_id: string
          rating: number
          reviewer_name: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id: string
          rating: number
          reviewer_name: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          reviewer_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mart_product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mart_products"
            referencedColumns: ["id"]
          },
        ]
      }
      mart_products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          gallery_urls: Json | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          name: string
          name_en: string | null
          original_price: number | null
          price: number
          rating: number | null
          shop_id: string | null
          slug: string
          sort_order: number | null
          stock: number | null
          total_reviews: number | null
          total_sold: number | null
          unit: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          gallery_urls?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name: string
          name_en?: string | null
          original_price?: number | null
          price: number
          rating?: number | null
          shop_id?: string | null
          slug: string
          sort_order?: number | null
          stock?: number | null
          total_reviews?: number | null
          total_sold?: number | null
          unit?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          gallery_urls?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string
          name_en?: string | null
          original_price?: number | null
          price?: number
          rating?: number | null
          shop_id?: string | null
          slug?: string
          sort_order?: number | null
          stock?: number | null
          total_reviews?: number | null
          total_sold?: number | null
          unit?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mart_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "mart_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mart_products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "mart_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      mart_shipping_addresses: {
        Row: {
          address: string
          created_at: string
          district: string | null
          division: string | null
          id: string
          is_default: boolean | null
          label: string
          name: string
          phone: string
          thana: string | null
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          district?: string | null
          division?: string | null
          id?: string
          is_default?: boolean | null
          label?: string
          name: string
          phone: string
          thana?: string | null
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          district?: string | null
          division?: string | null
          id?: string
          is_default?: boolean | null
          label?: string
          name?: string
          phone?: string
          thana?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mart_shops: {
        Row: {
          banner_url: string | null
          created_at: string
          description: string | null
          district: string | null
          division: string | null
          id: string
          is_active: boolean
          is_verified: boolean
          logo_url: string | null
          name: string
          name_en: string | null
          owner_id: string
          phone: string | null
          rating: number | null
          slug: string
          total_orders: number
          total_products: number
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          division?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          logo_url?: string | null
          name: string
          name_en?: string | null
          owner_id: string
          phone?: string | null
          rating?: number | null
          slug: string
          total_orders?: number
          total_products?: number
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          division?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          logo_url?: string | null
          name?: string
          name_en?: string | null
          owner_id?: string
          phone?: string | null
          rating?: number | null
          slug?: string
          total_orders?: number
          total_products?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_ledger: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          notes: string | null
          payment_method: string | null
          recipient_id: string | null
          source_id: string | null
          source_table: string
          status: string
          transaction_id: string | null
          type: string
          updated_at: string
          user_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          recipient_id?: string | null
          source_id?: string | null
          source_table: string
          status?: string
          transaction_id?: string | null
          type: string
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          recipient_id?: string | null
          source_id?: string | null
          source_table?: string
          status?: string
          transaction_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_verified: boolean
          nid_back_url: string | null
          nid_front_url: string | null
          nid_number: string | null
          notes: string | null
          phone: string | null
          status: string
          status_changed_at: string | null
          status_changed_by: string | null
          status_reason: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_verified?: boolean
          nid_back_url?: string | null
          nid_front_url?: string | null
          nid_number?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_reason?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_verified?: boolean
          nid_back_url?: string | null
          nid_front_url?: string | null
          nid_number?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_reason?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      rep_earnings: {
        Row: {
          commission_amount: number
          commission_percent: number
          created_at: string
          id: string
          receipt_number: string
          rep_earning: number
          rep_id: string
          service_request_id: string
          status: string
          total_amount: number
        }
        Insert: {
          commission_amount?: number
          commission_percent?: number
          created_at?: string
          id?: string
          receipt_number?: string
          rep_earning?: number
          rep_id: string
          service_request_id: string
          status?: string
          total_amount?: number
        }
        Update: {
          commission_amount?: number
          commission_percent?: number
          created_at?: string
          id?: string
          receipt_number?: string
          rep_earning?: number
          rep_id?: string
          service_request_id?: string
          status?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "rep_earnings_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_read: boolean
          can_update: boolean
          created_at: string
          id: string
          resource: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_read?: boolean
          can_update?: boolean
          created_at?: string
          id?: string
          resource: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_read?: boolean
          can_update?: boolean
          created_at?: string
          id?: string
          resource?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      saved_jobs: {
        Row: {
          created_at: string
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          assigned_rep_id: string | null
          commission_amount: number | null
          commission_percent: number | null
          created_at: string
          customer_name: string
          customer_phone: string
          detail_area: string | null
          district: string
          division: string
          first_response_at: string | null
          id: string
          payment_amount: number | null
          payment_confirmed_at: string | null
          payment_status: string
          rep_earning: number | null
          resolved_at: string | null
          service_completed_at: string | null
          service_description: string
          status: string
          thana: string | null
          tracking_token: string | null
        }
        Insert: {
          assigned_rep_id?: string | null
          commission_amount?: number | null
          commission_percent?: number | null
          created_at?: string
          customer_name: string
          customer_phone: string
          detail_area?: string | null
          district: string
          division: string
          first_response_at?: string | null
          id?: string
          payment_amount?: number | null
          payment_confirmed_at?: string | null
          payment_status?: string
          rep_earning?: number | null
          resolved_at?: string | null
          service_completed_at?: string | null
          service_description: string
          status?: string
          thana?: string | null
          tracking_token?: string | null
        }
        Update: {
          assigned_rep_id?: string | null
          commission_amount?: number | null
          commission_percent?: number | null
          created_at?: string
          customer_name?: string
          customer_phone?: string
          detail_area?: string | null
          district?: string
          division?: string
          first_response_at?: string | null
          id?: string
          payment_amount?: number | null
          payment_confirmed_at?: string | null
          payment_status?: string
          rep_earning?: number | null
          resolved_at?: string | null
          service_completed_at?: string | null
          service_description?: string
          status?: string
          thana?: string | null
          tracking_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_assigned_rep_id_fkey"
            columns: ["assigned_rep_id"]
            isOneToOne: false
            referencedRelation: "area_representatives"
            referencedColumns: ["id"]
          },
        ]
      }
      service_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewer_name: string
          service_slug: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewer_name: string
          service_slug: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewer_name?: string
          service_slug?: string
          user_id?: string
        }
        Relationships: []
      }
      staff_assignments: {
        Row: {
          assigned_by: string
          assigned_to: string
          assigned_to_name: string | null
          assigned_to_role: string
          assigner_role: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          notes: string | null
          permissions: Json
          priority: string
          scope_label: string | null
          scope_type: string
          scope_value: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          assigned_to: string
          assigned_to_name?: string | null
          assigned_to_role: string
          assigner_role: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          permissions?: Json
          priority?: string
          scope_label?: string | null
          scope_type: string
          scope_value: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          assigned_to?: string
          assigned_to_name?: string | null
          assigned_to_role?: string
          assigner_role?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          permissions?: Json
          priority?: string
          scope_label?: string | null
          scope_type?: string
          scope_value?: string
          updated_at?: string
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
      withdrawal_requests: {
        Row: {
          account_name: string | null
          account_number: string
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          method: string
          note: string | null
          processed_at: string | null
          rep_id: string
          status: string
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          account_number: string
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          method?: string
          note?: string | null
          processed_at?: string | null
          rep_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          account_number?: string
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          method?: string
          note?: string | null
          processed_at?: string | null
          rep_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      payment_summary_daily: {
        Row: {
          count: number | null
          day: string | null
          status: string | null
          total_amount: number | null
          type: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      auto_cancel_stale_bookings: { Args: never; Returns: undefined }
      cleanup_expired_records: { Args: never; Returns: undefined }
      create_notification: {
        Args: {
          _link_url?: string
          _message: string
          _priority?: string
          _title: string
          _type?: string
          _user_id: string
        }
        Returns: string
      }
      generate_daily_snapshot: { Args: never; Returns: undefined }
      get_email_by_phone: { Args: { _phone: string }; Returns: string }
      get_lab_report_status: {
        Args: { _tracking_id: string }
        Returns: {
          expected_date: string
          report_ready: boolean
          sample_date: string
          status: string
          test_name: string
          test_name_en: string
          tracking_id: string
        }[]
      }
      get_my_roles: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      get_public_deal_listings: {
        Args: never
        Returns: {
          category_id: string
          condition: string
          created_at: string
          description: string
          hide_phone: boolean
          id: string
          images: Json
          inquiries_count: number
          is_featured: boolean
          is_negotiable: boolean
          location_area: string
          location_district: string
          location_division: string
          phone: string
          price: number
          status: string
          title: string
          title_en: string
          updated_at: string
          user_id: string
          views_count: number
        }[]
      }
      get_service_request_status: {
        Args: { _tracking_token: string }
        Returns: {
          created_at: string
          district: string
          division: string
          first_response_at: string
          payment_status: string
          resolved_at: string
          service_completed_at: string
          status: string
          thana: string
          tracking_token: string
        }[]
      }
      get_user_assignments: {
        Args: { _user_id: string }
        Returns: {
          expires_at: string
          id: string
          permissions: Json
          priority: string
          scope_label: string
          scope_type: string
          scope_value: string
        }[]
      }
      has_module_assignment: {
        Args: { _module: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_job_views: { Args: { job_id: string }; Returns: undefined }
      is_user_blocked: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "call_center"
        | "provider"
        | "representative"
        | "supervisor"
        | "finance"
        | "mart_vendor"
        | "kenabecha_seller"
        | "yessdeal_seller"
        | "mart_delivery"
        | "mart_cs"
        | "super_admin"
        | "employer"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "call_center",
        "provider",
        "representative",
        "supervisor",
        "finance",
        "mart_vendor",
        "kenabecha_seller",
        "yessdeal_seller",
        "mart_delivery",
        "mart_cs",
        "super_admin",
        "employer",
      ],
    },
  },
} as const
