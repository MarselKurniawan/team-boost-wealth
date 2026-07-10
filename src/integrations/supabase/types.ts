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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          account_type: string
          created_at: string | null
          id: string
          provider: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          account_type: string
          created_at?: string | null
          id?: string
          provider: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          account_type?: string
          created_at?: string | null
          id?: string
          provider?: string
          user_id?: string
        }
        Relationships: []
      }
      company_legality: {
        Row: {
          created_at: string
          description: string
          document_number: string
          id: string
          image_url: string
          sort_order: number
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string
          document_number?: string
          id?: string
          image_url?: string
          sort_order?: number
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          document_number?: string
          id?: string
          image_url?: string
          sort_order?: number
          status?: string
          title?: string
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          id: string
          redeemed_at: string
          reward_amount: number
          user_id: string
        }
        Insert: {
          coupon_id: string
          id?: string
          redeemed_at?: string
          reward_amount?: number
          user_id: string
        }
        Update: {
          coupon_id?: string
          id?: string
          redeemed_at?: string
          reward_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          current_uses: number
          id: string
          is_used: boolean | null
          max_uses: number
          reward_amount: number | null
          reward_max: number
          reward_min: number
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_uses?: number
          id?: string
          is_used?: boolean | null
          max_uses?: number
          reward_amount?: number | null
          reward_max?: number
          reward_min?: number
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_uses?: number
          id?: string
          is_used?: boolean | null
          max_uses?: number
          reward_amount?: number | null
          reward_max?: number
          reward_min?: number
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          checked_in_at: string
          created_at: string
          day_number: number
          id: string
          reward_amount: number
          user_id: string
        }
        Insert: {
          checked_in_at?: string
          created_at?: string
          day_number?: number
          id?: string
          reward_amount?: number
          user_id: string
        }
        Update: {
          checked_in_at?: string
          created_at?: string
          day_number?: number
          id?: string
          reward_amount?: number
          user_id?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          amount: number
          created_at: string | null
          daily_income: number
          days_remaining: number
          id: string
          last_claimed_at: string | null
          product_id: string | null
          product_name: string
          status: string | null
          term_type: string
          total_earned: number | null
          total_income: number
          user_id: string
          validity: number
        }
        Insert: {
          amount: number
          created_at?: string | null
          daily_income: number
          days_remaining: number
          id?: string
          last_claimed_at?: string | null
          product_id?: string | null
          product_name: string
          status?: string | null
          term_type?: string
          total_earned?: number | null
          total_income: number
          user_id: string
          validity: number
        }
        Update: {
          amount?: number
          created_at?: string | null
          daily_income?: number
          days_remaining?: number
          id?: string
          last_claimed_at?: string | null
          product_id?: string | null
          product_name?: string
          status?: string | null
          term_type?: string
          total_earned?: number | null
          total_income?: number
          user_id?: string
          validity?: number
        }
        Relationships: [
          {
            foreignKeyName: "investments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string
          expires_at: string
          id: string
          is_verified: boolean | null
          phone: string
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          expires_at: string
          id?: string
          is_verified?: boolean | null
          phone: string
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_verified?: boolean | null
          phone?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          created_at: string | null
          daily_income: number
          description: string | null
          id: string
          image: string | null
          is_active: boolean | null
          max_per_user: number | null
          name: string
          price: number
          promo_daily_income: number | null
          promo_price: number | null
          promo_validity: number | null
          stock: number | null
          term_type: string
          total_income: number
          validity: number
          vip_level: number | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          daily_income: number
          description?: string | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          max_per_user?: number | null
          name: string
          price: number
          promo_daily_income?: number | null
          promo_price?: number | null
          promo_validity?: number | null
          stock?: number | null
          term_type?: string
          total_income: number
          validity: number
          vip_level?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          daily_income?: number
          description?: string | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          max_per_user?: number | null
          name?: string
          price?: number
          promo_daily_income?: number | null
          promo_price?: number | null
          promo_validity?: number | null
          stock?: number | null
          term_type?: string
          total_income?: number
          validity?: number
          vip_level?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          balance: number | null
          created_at: string | null
          email: string
          id: string
          name: string
          phone: string | null
          rabat_income: number | null
          referral_code: string | null
          referred_by: string | null
          team_income: number | null
          total_income: number | null
          total_recharge: number | null
          total_withdraw: number | null
          updated_at: string | null
          user_id: string
          vip_level: number | null
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          rabat_income?: number | null
          referral_code?: string | null
          referred_by?: string | null
          team_income?: number | null
          total_income?: number | null
          total_recharge?: number | null
          total_withdraw?: number | null
          updated_at?: string | null
          user_id: string
          vip_level?: number | null
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          rabat_income?: number | null
          referral_code?: string | null
          referred_by?: string | null
          team_income?: number | null
          total_income?: number | null
          total_recharge?: number | null
          total_withdraw?: number | null
          updated_at?: string | null
          user_id?: string
          vip_level?: number | null
        }
        Relationships: []
      }
      spin_rewards: {
        Row: {
          amount: number
          created_at: string
          fill: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
          weight: number
        }
        Insert: {
          amount: number
          created_at?: string
          fill?: string
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          weight?: number
        }
        Update: {
          amount?: number
          created_at?: string
          fill?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          weight?: number
        }
        Relationships: []
      }
      spin_tickets: {
        Row: {
          created_at: string
          id: string
          is_used: boolean
          reward_amount: number | null
          source: string
          source_user_id: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_used?: boolean
          reward_amount?: number | null
          source?: string
          source_user_id?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_used?: boolean
          reward_amount?: number | null
          source?: string
          source_user_id?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          payment_metadata: Json | null
          payment_method: string | null
          payment_reference: string | null
          payment_url: string | null
          status: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          payment_metadata?: Json | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_url?: string | null
          status?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          payment_metadata?: Json | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_url?: string | null
          status?: string | null
          type?: string
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vip_settings: {
        Row: {
          id: string
          required_deposit: number
          required_members: number
          updated_at: string | null
          vip_level: number
        }
        Insert: {
          id?: string
          required_deposit?: number
          required_members?: number
          updated_at?: string | null
          vip_level: number
        }
        Update: {
          id?: string
          required_deposit?: number
          required_members?: number
          updated_at?: string | null
          vip_level?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_investment_atomic: {
        Args: { _investment_id: string }
        Returns: Json
      }
      cleanup_expired_otps: { Args: never; Returns: undefined }
      create_notification: {
        Args: {
          _message: string
          _metadata?: Json
          _title: string
          _type: string
          _user_id: string
        }
        Returns: undefined
      }
      decrement_product_stock: {
        Args: { _product_id: string; _qty: number }
        Returns: boolean
      }
      generate_referral_code: { Args: never; Returns: string }
      get_long_term_investors: {
        Args: { _user_ids: string[] }
        Returns: string[]
      }
      get_my_referral_code: { Args: never; Returns: string }
      get_my_team: {
        Args: never
        Returns: {
          balance: number
          created_at: string
          email: string
          id: string
          level: string
          name: string
          phone: string
          rabat_income: number
          referral_code: string
          referred_by: string
          team_income: number
          total_income: number
          total_recharge: number
          total_withdraw: number
          updated_at: string
          user_id: string
          vip_level: number
        }[]
      }
      get_referral_team: {
        Args: { _referral_code?: string }
        Returns: {
          balance: number
          created_at: string
          email: string
          id: string
          level: string
          name: string
          phone: string
          rabat_income: number
          referral_code: string
          referred_by: string
          team_income: number
          total_income: number
          total_recharge: number
          total_withdraw: number
          updated_at: string
          user_id: string
          vip_level: number
        }[]
      }
      grant_spin_if_qualified: {
        Args: { _downline_user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
