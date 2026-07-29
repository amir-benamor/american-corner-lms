import { NextResponse } from "next/server";

const SAMPLE_BOOKS = [
  { title: "To Kill a Mockingbird", author: "Harper Lee", isbn: "9780061120084", description: "A novel about racial injustice and moral growth in the American South, seen through the eyes of young Scout Finch.", genre: "Fiction", language: "english", cefr_level: "B2", cover_url: "https://covers.openlibrary.org/b/isbn/9780061120084-L.jpg", shelf_location: "A-01", total_copies: 3, tags: ["classic", "american-literature"] },
  { title: "The Great Gatsby", author: "F. Scott Fitzgerald", isbn: "9780743273565", description: "A story of wealth, love, and the American Dream set in the Jazz Age of 1920s New York.", genre: "Fiction", language: "english", cefr_level: "B2", cover_url: "https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg", shelf_location: "A-02", total_copies: 2, tags: ["classic", "american-dream"] },
  { title: "1984", author: "George Orwell", isbn: "9780451524935", description: "A dystopian novel set in a totalitarian society ruled by Big Brother.", genre: "Science Fiction", language: "english", cefr_level: "C1", cover_url: "https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg", shelf_location: "B-01", total_copies: 2, tags: ["dystopian", "classic"] },
  { title: "The Alchemist", author: "Paulo Coelho", isbn: "9780062315007", description: "A young shepherd travels from Spain to Egypt in search of treasure.", genre: "Fiction", language: "english", cefr_level: "A2", cover_url: "https://covers.openlibrary.org/b/isbn/9780062315007-L.jpg", shelf_location: "A-03", total_copies: 2, tags: ["adventure", "inspirational"] },
  { title: "Sapiens: A Brief History of Humankind", author: "Yuval Noah Harari", isbn: "9780143127741", description: "A sweeping narrative of humanity's creation and evolution.", genre: "Non-Fiction", language: "english", cefr_level: "C1", cover_url: "https://covers.openlibrary.org/b/isbn/9780143127741-L.jpg", shelf_location: "C-01", total_copies: 2, tags: ["history", "science"] },
  { title: "The Catcher in the Rye", author: "J.D. Salinger", isbn: "9780316769488", description: "A teenager's journey through New York City exploring alienation and identity.", genre: "Fiction", language: "english", cefr_level: "B1", cover_url: "https://covers.openlibrary.org/b/isbn/9780316769488-L.jpg", shelf_location: "A-04", total_copies: 2, tags: ["classic", "coming-of-age"] },
  { title: "A Brief History of Time", author: "Stephen Hawking", isbn: "9780553380163", description: "Exploring black holes, the Big Bang, and the nature of the universe.", genre: "Science", language: "english", cefr_level: "C2", cover_url: "https://covers.openlibrary.org/b/isbn/9780553380163-L.jpg", shelf_location: "C-02", total_copies: 1, tags: ["physics", "cosmology"] },
  { title: "The Old Man and the Sea", author: "Ernest Hemingway", isbn: "9780684801223", description: "An aging Cuban fisherman struggles with a giant marlin in the Gulf Stream.", genre: "Fiction", language: "english", cefr_level: "A2", cover_url: "https://covers.openlibrary.org/b/isbn/9780684801223-L.jpg", shelf_location: "A-05", total_copies: 2, tags: ["classic", "adventure"] },
];

const SAMPLE_EVENTS = [
  { title: "English Club: American Idioms", description: "Practice English conversation skills exploring common American idioms.", type: "english_club", start_date: new Date(Date.now() + 7 * 86400000).toISOString(), end_date: new Date(Date.now() + 7 * 86400000 + 7200000).toISOString(), location: "American Corner Sousse - Main Hall", max_capacity: 30 },
  { title: "Tech Workshop: Intro to Python", description: "Hands-on Python programming for beginners. Bring your laptop!", type: "tech_workshop", start_date: new Date(Date.now() + 14 * 86400000).toISOString(), end_date: new Date(Date.now() + 14 * 86400000 + 10800000).toISOString(), location: "Computer Lab", max_capacity: 20 },
  { title: "US Study Info Session", description: "Scholarships, applications, visas, and student life in the US.", type: "study_info", start_date: new Date(Date.now() + 21 * 86400000).toISOString(), end_date: new Date(Date.now() + 21 * 86400000 + 7200000).toISOString(), location: "Conference Room", max_capacity: 50 },
];

function cleanUrl(url: string) {
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ message: "No auth token" }, { status: 401 });

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!),
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return NextResponse.json({ message: "Invalid token" }, { status: 401 });

    // allow any logged-in user to seed demo data

    const results = { books: 0, events: 0, skipped: 0 };

    for (const book of SAMPLE_BOOKS) {
      const { data: existing } = await supabase.from("books").select("id").eq("isbn", book.isbn).maybeSingle();
      if (existing) { results.skipped++; continue; }

      const barcode = `BOOK-${book.isbn}-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from("books").insert({
        ...book,
        barcode,
        available_copies: book.total_copies,
        language: book.language as any,
        cefr_level: book.cefr_level as any,
      });
      if (!error) results.books++;
    }

    for (const event of SAMPLE_EVENTS) {
      const { data: existing } = await supabase.from("events").select("id").eq("title", event.title).maybeSingle();
      if (existing) { results.skipped++; continue; }

      const { error } = await supabase.from("events").insert({
        ...event,
        type: event.type as any,
        created_by: user.id,
      });
      if (!error) results.events++;
    }

    return NextResponse.json({ success: true, ...results });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
