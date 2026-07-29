import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const isbn = searchParams.get("isbn");
  if (!isbn) return NextResponse.json({ error: "ISBN required" }, { status: 400 });

  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&country=US`
    );
    const json = await res.json();
    if (!json.items?.length) {
      const res2 = await fetch(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
      );
      const json2 = await res2.json();
      const book = json2[`ISBN:${isbn}`];
      if (!book) return NextResponse.json(null);
      return NextResponse.json({
        title: book.title,
        author: book.authors?.map((a: any) => a.name).join(", ") || "Unknown",
        description: book.subtitle || "",
        cover_url: book.cover?.large || book.cover?.medium || "",
        genre: book.subjects?.[0]?.name || "",
        language: "english",
      });
    }

    const info = json.items[0].volumeInfo;
    return NextResponse.json({
      title: info.title,
      author: info.authors?.join(", ") || "Unknown",
      description: info.description || "",
      cover_url: info.imageLinks?.thumbnail?.replace("http:", "https:").replace("&zoom=1", "&zoom=2") || "",
      genre: info.categories?.[0] || "",
      language: info.language === "fr" ? "french" : info.language === "ar" ? "arabic" : "english",
    });
  } catch {
    return NextResponse.json(null);
  }
}
