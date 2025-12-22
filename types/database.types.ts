export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SubscriptionTier = "free" | "bibliophile";

export type ReadingStatus =
  | "want_to_read"
  | "currently_reading"
  | "finished"
  | "dnf"
  | "up_next"
  | "paused";

export type ReadingFormat = "physical" | "ebook" | "audiobook";

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
          want_to_read: string[];
          currently_reading: string[];
          up_next: string[];
          did_not_finish: string[];
          has_imported_from_goodreads: boolean;
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
          want_to_read?: string[];
          currently_reading?: string[];
          up_next?: string[];
          did_not_finish?: string[];
          has_imported_from_goodreads?: boolean;
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
          want_to_read?: string[];
          currently_reading?: string[];
          up_next?: string[];
          did_not_finish?: string[];
          has_imported_from_goodreads?: boolean;
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
      reading_progress: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          pages_read: number;
          started_at: string;
          last_read_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id: string;
          pages_read?: number;
          started_at?: string;
          last_read_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          book_id?: string;
          pages_read?: number;
          started_at?: string;
          last_read_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_books: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          status: ReadingStatus;
          rating: number | null;
          reading_format: ReadingFormat | null;
          date_added: string;
          date_started: string | null;
          date_finished: string | null;
          notes: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id: string;
          status?: ReadingStatus;
          rating?: number | null;
          reading_format?: ReadingFormat | null;
          date_added?: string;
          date_started?: string | null;
          date_finished?: string | null;
          notes?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          book_id?: string;
          status?: ReadingStatus;
          rating?: number | null;
          reading_format?: ReadingFormat | null;
          date_added?: string;
          date_started?: string | null;
          date_finished?: string | null;
          notes?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      reading_journal: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          type: "note" | "quote" | "prediction";
          content: string;
          page: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id: string;
          type: "note" | "quote" | "prediction";
          content: string;
          page?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          book_id?: string;
          type?: "note" | "quote" | "prediction";
          content?: string;
          page?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      reading_sessions: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          pages_read: number;
          duration_minutes: number | null;
          session_date: string;
          started_at: string;
          ended_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id: string;
          pages_read?: number;
          duration_minutes?: number | null;
          session_date?: string;
          started_at?: string;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          book_id?: string;
          pages_read?: number;
          duration_minutes?: number | null;
          session_date?: string;
          started_at?: string;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      shelves: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: "default" | "custom";
          status: ReadingStatus | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type?: "default" | "custom";
          status?: ReadingStatus | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: "default" | "custom";
          status?: ReadingStatus | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      subscription_tier: SubscriptionTier;
      reading_status: ReadingStatus;
      journal_entry_type: "note" | "quote" | "prediction";
      shelf_type: "default" | "custom";
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

export type ReadingProgress = Database["public"]["Tables"]["reading_progress"]["Row"];
export type ReadingProgressInsert = Database["public"]["Tables"]["reading_progress"]["Insert"];
export type ReadingProgressUpdate = Database["public"]["Tables"]["reading_progress"]["Update"];

export type UserBook = Database["public"]["Tables"]["user_books"]["Row"];
export type UserBookInsert = Database["public"]["Tables"]["user_books"]["Insert"];
export type UserBookUpdate = Database["public"]["Tables"]["user_books"]["Update"];

export type ReadingJournal = Database["public"]["Tables"]["reading_journal"]["Row"];
export type ReadingJournalInsert = Database["public"]["Tables"]["reading_journal"]["Insert"];
export type ReadingJournalUpdate = Database["public"]["Tables"]["reading_journal"]["Update"];

export type ReadingSession = Database["public"]["Tables"]["reading_sessions"]["Row"];
export type ReadingSessionInsert = Database["public"]["Tables"]["reading_sessions"]["Insert"];
export type ReadingSessionUpdate = Database["public"]["Tables"]["reading_sessions"]["Update"];

export type Shelf = Database["public"]["Tables"]["shelves"]["Row"];
export type ShelfInsert = Database["public"]["Tables"]["shelves"]["Insert"];
export type ShelfUpdate = Database["public"]["Tables"]["shelves"]["Update"];
