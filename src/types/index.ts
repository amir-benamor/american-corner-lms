export type Role = "super_admin" | "librarian" | "member" | "guest";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  avatar_url?: string;
  membership_barcode?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  description?: string;
  genre: string;
  language: "english" | "french" | "arabic";
  cefr_level?: string;
  cover_url?: string;
  shelf_location?: string;
  total_copies: number;
  available_copies: number;
  barcode?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface Loan {
  id: string;
  user_id: string;
  book_id: string;
  book?: Book;
  borrowed_at: string;
  due_at: string;
  returned_at?: string;
  status: "active" | "returned" | "overdue";
  renewal_count: number;
}

export interface Hold {
  id: string;
  user_id: string;
  book_id: string;
  book?: Book;
  placed_at: string;
  expires_at: string;
  status: "active" | "fulfilled" | "cancelled" | "expired";
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  type: "english_club" | "tech_workshop" | "study_info" | "cultural" | "other";
  start_date: string;
  end_date: string;
  location: string;
  max_capacity: number;
  registered_count: number;
  cover_image?: string;
  created_by: string;
  created_at: string;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  qr_pass?: string;
  checked_in: boolean;
  registered_at: string;
}

export interface Booking {
  id: string;
  user_id: string;
  resource_type: "computer" | "discussion_room" | "study_space";
  start_time: string;
  end_time: string;
  status: "confirmed" | "cancelled" | "completed";
  created_at: string;
}

export interface AIChatMessage {
  role: "user" | "assistant";
  content: string;
}
