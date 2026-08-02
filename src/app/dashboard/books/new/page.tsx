import { BookForm } from "@/components/books/book-form";

export default function NewBookPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Add New Book</h1>
        <p className="text-muted-foreground">Add a book to the American Corner Sousse catalog</p>
      </div>
      <BookForm mode="create" />
    </div>
  );
}
