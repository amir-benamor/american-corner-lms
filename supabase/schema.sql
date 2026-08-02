-- ============================================================
-- AMERICAN CORNER SOUSSE - Library Management System
-- Complete Supabase Schema with RLS, pgvector, and Indexes
-- ============================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('super_admin', 'librarian', 'member');
CREATE TYPE loan_status AS ENUM ('active', 'returned', 'overdue');
CREATE TYPE hold_status AS ENUM ('active', 'fulfilled', 'cancelled', 'expired');
CREATE TYPE event_type AS ENUM ('english_club', 'tech_workshop', 'study_info', 'cultural', 'other');
CREATE TYPE booking_status AS ENUM ('confirmed', 'cancelled', 'completed');
CREATE TYPE booking_resource AS ENUM ('computer', 'discussion_room', 'study_space');
CREATE TYPE book_language AS ENUM ('english', 'french', 'arabic');
CREATE TYPE cefr_level AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- 2. TABLES

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'member',
  avatar_url TEXT,
  membership_barcode TEXT UNIQUE,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  genre TEXT NOT NULL,
  language book_language NOT NULL DEFAULT 'english',
  cefr_level cefr_level,
  cover_url TEXT,
  shelf_location TEXT,
  total_copies INTEGER NOT NULL DEFAULT 1,
  available_copies INTEGER NOT NULL DEFAULT 1,
  barcode TEXT UNIQUE,
  tags TEXT[] DEFAULT '{}',
  embedding vector(512),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  borrowed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at TIMESTAMPTZ NOT NULL,
  returned_at TIMESTAMPTZ,
  status loan_status NOT NULL DEFAULT 'active',
  renewal_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  status hold_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  type event_type NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 30,
  registered_count INTEGER NOT NULL DEFAULT 0,
  cover_image TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  qr_pass TEXT,
  checked_in BOOLEAN NOT NULL DEFAULT false,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  resource_type booking_resource NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status booking_status NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE overdue_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai_chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. INDEXES
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_barcode ON books(barcode);
CREATE INDEX idx_books_genre ON books(genre);
CREATE INDEX idx_books_language ON books(language);
CREATE INDEX idx_books_cefr ON books(cefr_level);
CREATE INDEX idx_books_title_trgm ON books USING GIN (title gin_trgm_ops);
CREATE INDEX idx_loans_user ON loans(user_id);
CREATE INDEX idx_loans_book ON loans(book_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_due ON loans(due_at) WHERE status IN ('active', 'overdue');
CREATE INDEX idx_holds_user ON holds(user_id);
CREATE INDEX idx_holds_book ON holds(book_id);
CREATE INDEX idx_profiles_barcode ON profiles(membership_barcode);
CREATE INDEX idx_events_date ON events(start_date);
CREATE INDEX idx_event_regs_event ON event_registrations(event_id);
CREATE INDEX idx_event_regs_user ON event_registrations(user_id);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_resource ON bookings(resource_type);

-- 4. pgvector index
CREATE INDEX idx_books_embedding ON books USING hnsw (embedding vector_cosine_ops);

-- 5. AUTO-UPDATE updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_books_updated_at
  BEFORE UPDATE ON books FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. TRIGGERS: Auto-set membership barcode on profile insert
CREATE OR REPLACE FUNCTION set_membership_barcode()
RETURNS TRIGGER AS $$
BEGIN
  NEW.membership_barcode := COALESCE(
    NEW.membership_barcode,
    'MEM-' || UPPER(SUBSTRING(MD5(NEW.id::TEXT) FROM 1 FOR 8))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_membership_barcode_trigger
  BEFORE INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION set_membership_barcode();

-- 7. FUNCTION: Decrement event registered count
CREATE OR REPLACE FUNCTION decrement_event_count(event_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE events SET registered_count = GREATEST(registered_count - 1, 0) WHERE id = event_id;
END;
$$ LANGUAGE plpgsql;

-- 8. FUNCTION: Semantic book search (pgvector)
CREATE OR REPLACE FUNCTION search_books(
  query_embedding vector(512),
  match_threshold double precision,
  match_count integer
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  author TEXT,
  isbn TEXT,
  description TEXT,
  genre TEXT,
  language book_language,
  cefr_level cefr_level,
  cover_url TEXT,
  available_copies INTEGER,
  similarity double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id, b.title, b.author, b.isbn, b.description, b.genre,
    b.language, b.cefr_level, b.cover_url, b.available_copies,
    1 - (b.embedding <=> query_embedding) AS similarity
  FROM books b
  WHERE 1 - (b.embedding <=> query_embedding) > match_threshold
    AND b.available_copies > 0
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- 9. BASE TABLE PRIVILEGES (required for anon, authenticated, and service_role to access tables)

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- 10. STAFF CHECK FUNCTION (SECURITY DEFINER bypasses RLS, avoiding recursion)
CREATE OR REPLACE FUNCTION is_staff(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role IN ('super_admin', 'librarian')
  );
$$;

-- 11. ROW LEVEL SECURITY

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Staff can view all profiles"
  ON profiles FOR SELECT USING (is_staff(auth.uid()));
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Books
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view books"
  ON books FOR SELECT USING (true);
CREATE POLICY "Staff can insert books"
  ON books FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update books"
  ON books FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "Staff can delete books"
  ON books FOR DELETE USING (is_staff(auth.uid()));

-- Loans
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own loans"
  ON loans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Staff can view all loans"
  ON loans FOR SELECT USING (is_staff(auth.uid()));
CREATE POLICY "Staff can insert loans"
  ON loans FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update loans"
  ON loans FOR UPDATE USING (is_staff(auth.uid()));

-- Holds
ALTER TABLE holds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own holds"
  ON holds FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Staff can view all holds"
  ON holds FOR SELECT USING (is_staff(auth.uid()));
CREATE POLICY "Users can place holds"
  ON holds FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can cancel own holds"
  ON holds FOR UPDATE USING (auth.uid() = user_id);

-- Events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view events"
  ON events FOR SELECT USING (true);
CREATE POLICY "Staff can manage events"
  ON events FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update events"
  ON events FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "Staff can delete events"
  ON events FOR DELETE USING (is_staff(auth.uid()));

-- Event Registrations
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own registrations"
  ON event_registrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Staff can view all registrations"
  ON event_registrations FOR SELECT USING (is_staff(auth.uid()));
CREATE POLICY "Users can register"
  ON event_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can cancel own registration"
  ON event_registrations FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Staff can check in"
  ON event_registrations FOR UPDATE USING (is_staff(auth.uid()));

-- Bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Staff can view all bookings"
  ON bookings FOR SELECT USING (is_staff(auth.uid()));
CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can cancel own bookings"
  ON bookings FOR UPDATE USING (auth.uid() = user_id);
