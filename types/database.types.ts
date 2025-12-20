export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SubscriptionTier = "free" | "bibliophile";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          subscription_tier: SubscriptionTier;
          dodo_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: SubscriptionTier;
          dodo_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: SubscriptionTier;
          dodo_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      books: {
        Row: {
          id: string;
          open_library_id: string;
          open_library_edition_id: string | null;
          title: string;
          subtitle: string | null;
          authors: string[];
          description: string | null;
          subjects: string[];
          publish_date: string | null;
          publishers: string[];
          isbn_10: string[] | null;
          isbn_13: string[] | null;
          page_count: number | null;
          cover_url_small: string | null;
          cover_url_medium: string | null;
          cover_url_large: string | null;
          language: string | null;
          created_at: string;
          updated_at: string;
          last_synced_at: string;
        };
        Insert: {
          id?: string;
          open_library_id: string;
          open_library_edition_id?: string | null;
          title: string;
          subtitle?: string | null;
          authors?: string[];
          description?: string | null;
          subjects?: string[];
          publish_date?: string | null;
          publishers?: string[];
          isbn_10?: string[] | null;
          isbn_13?: string[] | null;
          page_count?: number | null;
          cover_url_small?: string | null;
          cover_url_medium?: string | null;
          cover_url_large?: string | null;
          language?: string | null;
          created_at?: string;
          updated_at?: string;
          last_synced_at?: string;
        };
        Update: {
          id?: string;
          open_library_id?: string;
          open_library_edition_id?: string | null;
          title?: string;
          subtitle?: string | null;
          authors?: string[];
          description?: string | null;
          subjects?: string[];
          publish_date?: string | null;
          publishers?: string[];
          isbn_10?: string[] | null;
          isbn_13?: string[] | null;
          page_count?: number | null;
          cover_url_small?: string | null;
          cover_url_medium?: string | null;
          cover_url_large?: string | null;
          language?: string | null;
          created_at?: string;
          updated_at?: string;
          last_synced_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      subscription_tier: SubscriptionTier;
    };
  };
}

// Helper types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type Book = Database["public"]["Tables"]["books"]["Row"];
export type BookInsert = Database["public"]["Tables"]["books"]["Insert"];
export type BookUpdate = Database["public"]["Tables"]["books"]["Update"];
