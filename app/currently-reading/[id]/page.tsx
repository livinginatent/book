import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getCurrentlyReadingPageData } from "@/app/actions/currently-reading-page";
import { CurrentlyReadingClient } from "@/components/currently-reading/currently-reading-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading book details...</p>
      </div>
    </div>
  );
}

// Error display
function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Link href="/" className="text-primary hover:underline">
          Go back to home
        </Link>
      </div>
    </div>
  );
}

// Server component that fetches data
async function CurrentlyReadingServer({ bookId }: { bookId: string }) {
  const result = await getCurrentlyReadingPageData(bookId);

  if (!result.success) {
    // Redirect to home if not authenticated
    if (result.error === "You must be logged in") {
      redirect("/");
    }
    return <ErrorDisplay error={result.error} />;
  }

  return <CurrentlyReadingClient initialData={result.data} bookId={bookId} />;
}

export default async function CurrentlyReadingDetailPage({
  params,
}: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <CurrentlyReadingServer bookId={id} />
    </Suspense>
  );
}
