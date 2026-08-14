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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          criteria: Json
          description: string | null
          emoji: string | null
          id: string
          name: string
          slug: string
          updated_at: string
          xp_reward: number
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          criteria?: Json
          description?: string | null
          emoji?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          criteria?: Json
          description?: string | null
          emoji?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
          xp_reward?: number
        }
        Relationships: []
      }
      garden_items: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          item_type: string
          name: string
          premium_required: boolean
          seasonal_tag: string | null
          slug: string
          unlock_level: number
          updated_at: string
          xp_cost: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          item_type: string
          name: string
          premium_required?: boolean
          seasonal_tag?: string | null
          slug: string
          unlock_level?: number
          updated_at?: string
          xp_cost?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          item_type?: string
          name?: string
          premium_required?: boolean
          seasonal_tag?: string | null
          slug?: string
          unlock_level?: number
          updated_at?: string
          xp_cost?: number
        }
        Relationships: []
      }
      learning_content: {
        Row: {
          active: boolean
          body: string | null
          category: string | null
          content_type: string
          created_at: string
          duration_minutes: number | null
          emoji: string | null
          id: string
          media_url: string | null
          premium_required: boolean
          slug: string
          summary: string | null
          title: string
          updated_at: string
          xp_reward: number
        }
        Insert: {
          active?: boolean
          body?: string | null
          category?: string | null
          content_type: string
          created_at?: string
          duration_minutes?: number | null
          emoji?: string | null
          id?: string
          media_url?: string | null
          premium_required?: boolean
          slug: string
          summary?: string | null
          title: string
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          active?: boolean
          body?: string | null
          category?: string | null
          content_type?: string
          created_at?: string
          duration_minutes?: number | null
          emoji?: string | null
          id?: string
          media_url?: string | null
          premium_required?: boolean
          slug?: string
          summary?: string | null
          title?: string
          updated_at?: string
          xp_reward?: number
        }
        Relationships: []
      }
      levels: {
        Row: {
          created_at: string
          emoji: string | null
          id: number
          level_number: number
          name: string
          tagline: string | null
          xp_required: number
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          id?: number
          level_number: number
          name: string
          tagline?: string | null
          xp_required: number
        }
        Update: {
          created_at?: string
          emoji?: string | null
          id?: number
          level_number?: number
          name?: string
          tagline?: string | null
          xp_required?: number
        }
        Relationships: []
      }
      mind_gym_activities: {
        Row: {
          active: boolean
          category: string
          created_at: string
          description: string | null
          difficulty: string
          duration_minutes: number
          emoji: string | null
          id: string
          instructions: Json
          premium_required: boolean
          slug: string
          title: string
          updated_at: string
          xp_reward: number
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          description?: string | null
          difficulty?: string
          duration_minutes?: number
          emoji?: string | null
          id?: string
          instructions?: Json
          premium_required?: boolean
          slug: string
          title: string
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          difficulty?: string
          duration_minutes?: number
          emoji?: string | null
          id?: string
          instructions?: Json
          premium_required?: boolean
          slug?: string
          title?: string
          updated_at?: string
          xp_reward?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          locale: string
          nickname: string | null
          onboarding_completed: boolean
          preferred_motivational_style: string
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          first_name?: string | null
          id: string
          last_name?: string | null
          locale?: string
          nickname?: string | null
          onboarding_completed?: boolean
          preferred_motivational_style?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          locale?: string
          nickname?: string | null
          onboarding_completed?: boolean
          preferred_motivational_style?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      quests: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          description: string | null
          emoji: string | null
          end_date: string | null
          id: string
          premium_required: boolean
          quest_type: string
          requirements: Json
          slug: string
          start_date: string | null
          title: string
          updated_at: string
          xp_reward: number
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          end_date?: string | null
          id?: string
          premium_required?: boolean
          quest_type: string
          requirements?: Json
          slug: string
          start_date?: string | null
          title: string
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          end_date?: string | null
          id?: string
          premium_required?: boolean
          quest_type?: string
          requirements?: Json
          slug?: string
          start_date?: string | null
          title?: string
          updated_at?: string
          xp_reward?: number
        }
        Relationships: []
      }
      rewards: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          name: string
          premium_required: boolean
          reward_type: string
          slug: string
          unlock_level: number
          updated_at: string
          xp_cost: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          name: string
          premium_required?: boolean
          reward_type: string
          slug: string
          unlock_level?: number
          updated_at?: string
          xp_cost?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          name?: string
          premium_required?: boolean
          reward_type?: string
          slug?: string
          unlock_level?: number
          updated_at?: string
          xp_cost?: number
        }
        Relationships: []
      }
      safety_resources: {
        Row: {
          active: boolean
          country_code: string
          created_at: string
          description: string | null
          hours: string | null
          id: string
          name: string
          phone: string | null
          priority: number
          region: string | null
          sms: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          active?: boolean
          country_code?: string
          created_at?: string
          description?: string | null
          hours?: string | null
          id?: string
          name: string
          phone?: string | null
          priority?: number
          region?: string | null
          sms?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          active?: boolean
          country_code?: string
          created_at?: string
          description?: string | null
          hours?: string | null
          id?: string
          name?: string
          phone?: string | null
          priority?: number
          region?: string | null
          sms?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          emoji: string | null
          features: Json
          id: string
          name: string
          popular: boolean
          price_annual_cents: number
          price_monthly_cents: number
          slug: string
          sort_order: number
          tagline: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          emoji?: string | null
          features?: Json
          id?: string
          name: string
          popular?: boolean
          price_annual_cents?: number
          price_monthly_cents?: number
          slug: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          emoji?: string | null
          features?: Json
          id?: string
          name?: string
          popular?: boolean
          price_annual_cents?: number
          price_monthly_cents?: number
          slug?: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
