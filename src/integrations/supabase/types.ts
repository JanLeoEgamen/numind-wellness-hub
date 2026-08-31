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
      ai_conversation_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          archived: boolean
          created_at: string
          id: string
          last_message_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          id?: string
          last_message_at?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          id?: string
          last_message_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_memories: {
        Row: {
          active: boolean
          content: string
          created_at: string
          id: string
          memory_type: string
          source_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          content: string
          created_at?: string
          id?: string
          memory_type: string
          source_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          content?: string
          created_at?: string
          id?: string
          memory_type?: string
          source_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
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
      community_posts: {
        Row: {
          anonymous: boolean
          category: string
          content: string
          created_at: string
          emoji: string | null
          hidden: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          anonymous?: boolean
          category?: string
          content: string
          created_at?: string
          emoji?: string | null
          hidden?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          anonymous?: boolean
          category?: string
          content?: string
          created_at?: string
          emoji?: string | null
          hidden?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      community_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          post_id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          post_id: string
          reason?: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          post_id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_resets: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          date: string
          energy: number | null
          focus: number | null
          id: string
          intention: string | null
          mood: number | null
          sleep_rating: number | null
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          date?: string
          energy?: number | null
          focus?: number | null
          id?: string
          intention?: string | null
          mood?: number | null
          sleep_rating?: number | null
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          date?: string
          energy?: number | null
          focus?: number | null
          id?: string
          intention?: string | null
          mood?: number | null
          sleep_rating?: number | null
          user_id?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          key: string
          label: string
          rollout_pct: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key: string
          label: string
          rollout_pct?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key?: string
          label?: string
          rollout_pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      focus_plans: {
        Row: {
          brain_dump: string | null
          created_at: string
          date: string
          id: string
          tasks: Json
          top_3: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          brain_dump?: string | null
          created_at?: string
          date?: string
          id?: string
          tasks?: Json
          top_3?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          brain_dump?: string | null
          created_at?: string
          date?: string
          id?: string
          tasks?: Json
          top_3?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          distractions: number
          duration_minutes: number
          id: string
          notes: string | null
          started_at: string
          status: string
          task: string | null
          user_id: string
          xp_awarded: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          distractions?: number
          duration_minutes?: number
          id?: string
          notes?: string | null
          started_at?: string
          status?: string
          task?: string | null
          user_id: string
          xp_awarded?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          distractions?: number
          duration_minutes?: number
          id?: string
          notes?: string | null
          started_at?: string
          status?: string
          task?: string | null
          user_id?: string
          xp_awarded?: number
        }
        Relationships: []
      }
      game_plays: {
        Row: {
          created_at: string
          game: string
          id: string
          played_at: string
          played_count: number
          played_date: string
          user_id: string
          xp_awarded: number
        }
        Insert: {
          created_at?: string
          game: string
          id?: string
          played_at?: string
          played_count?: number
          played_date?: string
          user_id: string
          xp_awarded?: number
        }
        Update: {
          created_at?: string
          game?: string
          id?: string
          played_at?: string
          played_count?: number
          played_date?: string
          user_id?: string
          xp_awarded?: number
        }
        Relationships: []
      }
      games: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          instructions: Json
          name: string
          premium_required: boolean
          preview_url: string | null
          slug: string
          sort_order: number
          updated_at: string
          xp_reward: number
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          instructions?: Json
          name: string
          premium_required?: boolean
          preview_url?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          instructions?: Json
          name?: string
          premium_required?: boolean
          preview_url?: string | null
          slug?: string
          sort_order?: number
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
      gardens: {
        Row: {
          created_at: string
          growth_points: number
          id: string
          name: string
          stage: number
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          growth_points?: number
          id?: string
          name?: string
          stage?: number
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          growth_points?: number
          id?: string
          name?: string
          stage?: number
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string
          current_value: number
          description: string | null
          id: string
          status: string
          target_date: string | null
          target_value: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          completed_at?: string | null
          created_at?: string
          current_value?: number
          description?: string | null
          id?: string
          status?: string
          target_date?: string | null
          target_value?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string
          current_value?: number
          description?: string | null
          id?: string
          status?: string
          target_date?: string | null
          target_value?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          created_at: string
          date: string
          habit_id: string
          id: string
          note: string | null
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          date?: string
          habit_id: string
          id?: string
          note?: string | null
          user_id: string
          value?: number
        }
        Update: {
          created_at?: string
          date?: string
          habit_id?: string
          id?: string
          note?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "wellness_habits"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          content: string
          created_at: string
          favorite: boolean
          id: string
          journal_type: string
          mood_tag: string | null
          private: boolean
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          favorite?: boolean
          id?: string
          journal_type?: string
          mood_tag?: string | null
          private?: boolean
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          favorite?: boolean
          id?: string
          journal_type?: string
          mood_tag?: string | null
          private?: boolean
          title?: string | null
          updated_at?: string
          user_id?: string
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
      learning_progress: {
        Row: {
          completed_at: string | null
          content_id: string
          id: string
          progress_percent: number
          started_at: string
          status: string
          user_id: string
          xp_awarded: number
        }
        Insert: {
          completed_at?: string | null
          content_id: string
          id?: string
          progress_percent?: number
          started_at?: string
          status?: string
          user_id: string
          xp_awarded?: number
        }
        Update: {
          completed_at?: string | null
          content_id?: string
          id?: string
          progress_percent?: number
          started_at?: string
          status?: string
          user_id?: string
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "learning_progress_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "learning_content"
            referencedColumns: ["id"]
          },
        ]
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
      memories: {
        Row: {
          created_at: string
          description: string | null
          emoji: string | null
          favorite: boolean
          id: string
          memory_type: string
          pinned: boolean
          source_id: string | null
          source_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          emoji?: string | null
          favorite?: boolean
          id?: string
          memory_type?: string
          pinned?: boolean
          source_id?: string | null
          source_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          emoji?: string | null
          favorite?: boolean
          id?: string
          memory_type?: string
          pinned?: boolean
          source_id?: string | null
          source_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      mind_checks: {
        Row: {
          created_at: string
          date: string
          energy: number | null
          focus: number | null
          id: string
          mood: number | null
          note: string | null
          stress: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          energy?: number | null
          focus?: number | null
          id?: string
          mood?: number | null
          note?: string | null
          stress?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          energy?: number | null
          focus?: number | null
          id?: string
          mood?: number | null
          note?: string | null
          stress?: number | null
          user_id?: string
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
      mind_gym_completions: {
        Row: {
          activity_id: string
          completed_at: string
          duration_minutes: number | null
          id: string
          user_id: string
          xp_awarded: number
        }
        Insert: {
          activity_id: string
          completed_at?: string
          duration_minutes?: number | null
          id?: string
          user_id: string
          xp_awarded?: number
        }
        Update: {
          activity_id?: string
          completed_at?: string
          duration_minutes?: number | null
          id?: string
          user_id?: string
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "mind_gym_completions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "mind_gym_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_id: string | null
          action_type: string | null
          created_at: string
          emoji: string | null
          id: string
          message: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_id?: string | null
          action_type?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          message?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_id?: string | null
          action_type?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          message?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      numi_prompts: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          id: string
          slug: string
          text: string
          tone: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          id?: string
          slug: string
          text: string
          tone?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          id?: string
          slug?: string
          text?: string
          tone?: string
          updated_at?: string
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
      quest_completions: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          period_key: string
          progress: Json
          quest_id: string
          user_id: string
          xp_awarded: number
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          period_key?: string
          progress?: Json
          quest_id: string
          user_id: string
          xp_awarded?: number
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          period_key?: string
          progress?: Json
          quest_id?: string
          user_id?: string
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "quest_completions_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
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
      quizzes: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          description: string | null
          id: string
          premium_required: boolean
          questions: Json
          slug: string
          title: string
          updated_at: string
          xp_reward: number
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          premium_required?: boolean
          questions?: Json
          slug: string
          title: string
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          premium_required?: boolean
          questions?: Json
          slug?: string
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
      seasonal_events: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          emoji: string | null
          ends_at: string | null
          id: string
          name: string
          slug: string
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          emoji?: string | null
          ends_at?: string | null
          id?: string
          name: string
          slug: string
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          emoji?: string | null
          ends_at?: string | null
          id?: string
          name?: string
          slug?: string
          starts_at?: string | null
          updated_at?: string
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
screening_completions: {
        Row: {
          completed_at: string
          id: string
          instrument: string
          range_label: string
          responses: Json
          score: number
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          instrument: string
          range_label: string
          responses?: Json
          score: number
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          instrument?: string
          range_label?: string
          responses?: Json
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_period: string
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          id: string
          plan_id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_period?: string
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_period?: string
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      themes: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          name: string
          palette: Json
          premium_required: boolean
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          name: string
          palette?: Json
          premium_required?: boolean
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          name?: string
          palette?: Json
          premium_required?: boolean
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_garden_items: {
        Row: {
          garden_id: string
          id: string
          item_id: string
          placed: boolean
          position_x: number | null
          position_y: number | null
          unlocked_at: string
          user_id: string
        }
        Insert: {
          garden_id: string
          id?: string
          item_id: string
          placed?: boolean
          position_x?: number | null
          position_y?: number | null
          unlocked_at?: string
          user_id: string
        }
        Update: {
          garden_id?: string
          id?: string
          item_id?: string
          placed?: boolean
          position_x?: number | null
          position_y?: number | null
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_garden_items_garden_id_fkey"
            columns: ["garden_id"]
            isOneToOne: false
            referencedRelation: "gardens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_garden_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "garden_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          appear_in_milestones: boolean
          community_activity: boolean
          created_at: string
          daily_reset_reminder: boolean
          font_scale: number
          garden_rewards: boolean
          high_contrast: boolean
          id: string
          numi_memory: boolean
          numi_personalization: boolean
          private_journal: boolean
          reduce_motion: boolean
          reminder_time: string
          show_nickname: boolean
          streak_nudges: boolean
          theme: string
          updated_at: string
        }
        Insert: {
          appear_in_milestones?: boolean
          community_activity?: boolean
          created_at?: string
          daily_reset_reminder?: boolean
          font_scale?: number
          garden_rewards?: boolean
          high_contrast?: boolean
          id: string
          numi_memory?: boolean
          numi_personalization?: boolean
          private_journal?: boolean
          reduce_motion?: boolean
          reminder_time?: string
          show_nickname?: boolean
          streak_nudges?: boolean
          theme?: string
          updated_at?: string
        }
        Update: {
          appear_in_milestones?: boolean
          community_activity?: boolean
          created_at?: string
          daily_reset_reminder?: boolean
          font_scale?: number
          garden_rewards?: boolean
          high_contrast?: boolean
          id?: string
          numi_memory?: boolean
          numi_personalization?: boolean
          private_journal?: boolean
          reduce_motion?: boolean
          reminder_time?: string
          show_nickname?: boolean
          streak_nudges?: boolean
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_rewards: {
        Row: {
          equipped: boolean
          id: string
          reward_id: string
          unlocked_at: string
          user_id: string
          xp_spent: number
        }
        Insert: {
          equipped?: boolean
          id?: string
          reward_id: string
          unlocked_at?: string
          user_id: string
          xp_spent?: number
        }
        Update: {
          equipped?: boolean
          id?: string
          reward_id?: string
          unlocked_at?: string
          user_id?: string
          xp_spent?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_rewards_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
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
      wellness_habits: {
        Row: {
          active: boolean
          created_at: string
          emoji: string | null
          favorite: boolean
          habit_type: string
          id: string
          target_value: number
          title: string | null
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          emoji?: string | null
          favorite?: boolean
          habit_type: string
          id?: string
          target_value?: number
          title?: string | null
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          emoji?: string | null
          favorite?: boolean
          habit_type?: string
          id?: string
          target_value?: number
          title?: string | null
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      xp_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          source_id: string | null
          source_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          source_id?: string | null
          source_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          source_id?: string | null
          source_type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_analytics_overview: { Args: never; Returns: Json }
      admin_broadcast_notification: {
        Args: {
          p_action_id?: string
          p_action_type?: string
          p_emoji?: string
          p_message?: string
          p_title: string
          p_type?: string
          p_user_id?: string
        }
        Returns: number
      }
      admin_list_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          roles: string[]
          user_id: string
        }[]
      }
      admin_remove_user_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      admin_set_user_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      admin_user_detail: { Args: { p_user_id: string }; Returns: Json }
      community_progress: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_is_admin: { Args: never; Returns: boolean }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
