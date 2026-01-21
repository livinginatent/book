"use server";

import { cookies } from "next/headers";

import { getReadingDNA } from "@/app/actions/insights";
import { createClient } from "@/lib/supabase/server";
import { createTimer } from "@/lib/utils/perf";

// ============================================================================
// Types
// ============================================================================

export interface BookRecommendation {
  title: string;
  author: string;
  matchPercentage: number;
  reason: string;
  genres?: string[];
}

export interface SmartRecommendationsResult {
  success: true;
  recommendations: BookRecommendation[];
  tier: "free" | "bibliophile";
  cachedAt?: string;
}

export interface SmartRecommendationsError {
  success: false;
  error: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Call DeepSeek API to generate book recommendations
 */
async function callDeepSeekAPI(
  prompt: string,
  model: string = "deepseek-chat"
): Promise<{ success: boolean; data?: string; error?: string }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: "DeepSeek API key not configured",
    };
  }

  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a knowledgeable book recommendation expert. Provide book recommendations in valid JSON format only, without any additional text or markdown formatting.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `DeepSeek API error: ${response.status} - ${JSON.stringify(errorData)}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: "No content returned from DeepSeek API",
      };
    }

    return {
      success: true,
      data: content,
    };
  } catch (error) {
    console.error("DeepSeek API call error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Parse AI response to extract book recommendations
 */
function parseRecommendations(
  aiResponse: string
): BookRecommendation[] | null {
  try {
    // Try to find JSON in the response (handle markdown code blocks)
    let jsonStr = aiResponse.trim();

    // Remove markdown code blocks if present
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```\n?/g, "");
    }

    const parsed = JSON.parse(jsonStr);

    // Handle both array and object with recommendations key
    const recommendations = Array.isArray(parsed)
      ? parsed
      : parsed.recommendations || [];

    // Validate structure
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      return null;
    }

    return recommendations.map((rec: any) => ({
      title: rec.title || "Unknown Title",
      author: rec.author || "Unknown Author",
      matchPercentage: Math.min(100, Math.max(0, rec.matchPercentage || rec.match_percentage || 0)),
      reason: rec.reason || "Recommended based on your reading preferences",
      genres: rec.genres || [],
    }));
  } catch (error) {
    console.error("Failed to parse recommendations:", error);
    return null;
  }
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Generate smart book recommendations using DeepSeek AI
 * Recommendations are cached for 7 days to avoid redundant API calls
 */
export async function getSmartRecommendations(): Promise<
  SmartRecommendationsResult | SmartRecommendationsError
> {
  const timer = createTimer("getSmartRecommendations");

  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // Authenticate user
    const authTimer = createTimer("getSmartRecommendations.auth");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    authTimer.end();

    if (authError || !user) {
      timer.end();
      return { success: false, error: "You must be logged in" };
    }

    // Get user's subscription tier
    const tierTimer = createTimer("getSmartRecommendations.tier");
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();
    tierTimer.end();

    if (profileError || !profile) {
      timer.end();
      return {
        success: false,
        error: "Failed to fetch user profile",
      };
    }

    const tier = profile.subscription_tier || "free";

    // Check for cached recommendations
    const cacheTimer = createTimer("getSmartRecommendations.cache");
    const { data: cachedRec, error: cacheError } = await supabase
      .from("recommendation_cache")
      .select("*")
      .eq("user_id", user.id)
      .eq("tier", tier)
      .gt("expires_at", new Date().toISOString())
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    cacheTimer.end();

    if (!cacheError && cachedRec && cachedRec.recommendations) {
      console.log("Returning cached recommendations");
      timer.end();
      return {
        success: true,
        recommendations: cachedRec.recommendations as BookRecommendation[],
        tier,
        cachedAt: cachedRec.generated_at,
      };
    }

    // Generate new recommendations based on tier
    let recommendations: BookRecommendation[] = [];

    if (tier === "free") {
      recommendations = await generateFreeRecommendations(supabase, user.id);
    } else {
      recommendations = await generatePremiumRecommendations(supabase, user.id);
    }

    if (recommendations.length === 0) {
      timer.end();
      return {
        success: false,
        error: "Unable to generate recommendations. Please finish more books to get personalized suggestions.",
      };
    }

    // Cache the recommendations
    const cacheInsertTimer = createTimer("getSmartRecommendations.cacheInsert");
    await supabase.from("recommendation_cache").insert({
      user_id: user.id,
      tier,
      recommendations: recommendations as any,
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    });
    cacheInsertTimer.end();

    timer.end();

    return {
      success: true,
      recommendations,
      tier,
    };
  } catch (error) {
    timer.end();
    console.error("Get smart recommendations error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Generate recommendations for free tier users
 * Uses last 3 finished books and top 2 subjects
 */
async function generateFreeRecommendations(
  supabase: any,
  userId: string
): Promise<BookRecommendation[]> {
  const timer = createTimer("generateFreeRecommendations");

  try {
    // Get last 3 finished books with subjects
    const { data: finishedBooks, error: booksError } = await supabase
      .from("user_books")
      .select(
        `
        book_id,
        subjects,
        books!inner (
          title,
          authors
        )
      `
      )
      .eq("user_id", userId)
      .eq("status", "finished")
      .order("date_finished", { ascending: false })
      .limit(3);

    if (booksError || !finishedBooks || finishedBooks.length === 0) {
      console.error("No finished books found for free recommendations");
      return [];
    }

    // Extract book titles and authors
    const booksList = finishedBooks
      .map((fb: any) => {
        const book = fb.books;
        if (!book) return null;
        return `"${book.title}" by ${book.authors?.[0] || "Unknown"}`;
      })
      .filter(Boolean);

    // Count subjects across all finished books
    const subjectCounts = new Map<string, number>();
    for (const fb of finishedBooks) {
      const subjects = fb.subjects || [];
      for (const subject of subjects) {
        if (subject && typeof subject === "string") {
          subjectCounts.set(subject, (subjectCounts.get(subject) || 0) + 1);
        }
      }
    }

    // Get top 2 subjects
    const topSubjects = Array.from(subjectCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([subject]) => subject);

    // Construct prompt for DeepSeek
    const prompt = `Based on a reader who recently finished these books:
${booksList.join("\n")}

And enjoys these genres: ${topSubjects.join(", ")}

Please recommend 3 similar books they would enjoy. For each book, provide:
1. title (string)
2. author (string)
3. matchPercentage (number 0-100, how well it matches their taste)
4. reason (string, brief explanation why it's a good match)
5. genres (array of strings)

Return ONLY a JSON array with this exact structure, no additional text:
[
  {
    "title": "Book Title",
    "author": "Author Name",
    "matchPercentage": 85,
    "reason": "Brief explanation",
    "genres": ["Genre1", "Genre2"]
  }
]`;

    const apiResult = await callDeepSeekAPI(prompt);

    if (!apiResult.success || !apiResult.data) {
      console.error("DeepSeek API failed:", apiResult.error);
      return [];
    }

    const recommendations = parseRecommendations(apiResult.data);
    timer.end();

    return recommendations || [];
  } catch (error) {
    timer.end();
    console.error("Generate free recommendations error:", error);
    return [];
  }
}

/**
 * Generate recommendations for premium tier users
 * Uses Reading DNA (winning combo) + 10 highest-rated books
 */
async function generatePremiumRecommendations(
  supabase: any,
  userId: string
): Promise<BookRecommendation[]> {
  const timer = createTimer("generatePremiumRecommendations");

  try {
    // Get Reading DNA
    const dnaResult = await getReadingDNA();

    if (!dnaResult.success) {
      console.error("Failed to get Reading DNA:", dnaResult.error);
      return [];
    }

    // Get top 10 highest-rated books
    const { data: topBooks, error: booksError } = await supabase
      .from("user_books")
      .select(
        `
        rating,
        books!inner (
          title,
          authors,
          subjects
        )
      `
      )
      .eq("user_id", userId)
      .eq("status", "finished")
      .not("rating", "is", null)
      .gte("rating", 4)
      .order("rating", { ascending: false })
      .limit(10);

    if (booksError || !topBooks || topBooks.length === 0) {
      console.error("No highly-rated books found for premium recommendations");
      return [];
    }

    // Extract book information
    const favoriteBooks = topBooks
      .map((tb: any) => {
        const book = tb.books;
        if (!book) return null;
        return {
          title: book.title,
          author: book.authors?.[0] || "Unknown",
          rating: tb.rating,
        };
      })
      .filter(Boolean);

    // Extract Reading DNA insights
    const topMoods = dnaResult.moods?.slice(0, 3).map((m) => m.name) || [];
    const topPacing = dnaResult.pacingStats?.[0]?.label || "Moderate";
    const topDifficulty = dnaResult.complexity?.[0]?.level || "Medium";
    const topSubjects = dnaResult.subjects?.slice(0, 5).map((s) => s.name) || [];
    const winningCombo = dnaResult.winningCombo?.description || "";

    // Construct premium prompt
    const prompt = `As an expert book curator, analyze this reader's profile:

READING DNA PROFILE:
- Winning Combo: ${winningCombo}
- Favorite Moods: ${topMoods.join(", ")}
- Preferred Pacing: ${topPacing}
- Complexity Level: ${topDifficulty}
- Top Genres: ${topSubjects.join(", ")}

TOP RATED BOOKS (4+ stars):
${favoriteBooks.map((b: any) => `- "${b.title}" by ${b.author} (${b.rating}★)`).join("\n")}

Based on this detailed reading DNA profile, recommend 10 books that specifically match their preferences. Each recommendation should align with their winning combination of attributes.

For each book, provide:
1. title (string)
2. author (string)
3. matchPercentage (number 0-100, based on DNA profile alignment)
4. reason (string, explain how it matches their specific reading DNA)
5. genres (array of strings)

Return ONLY a JSON array with this exact structure, no additional text:
[
  {
    "title": "Book Title",
    "author": "Author Name",
    "matchPercentage": 92,
    "reason": "Matches your love for [specific DNA elements]",
    "genres": ["Genre1", "Genre2"]
  }
]`;

    const apiResult = await callDeepSeekAPI(prompt);

    if (!apiResult.success || !apiResult.data) {
      console.error("DeepSeek API failed:", apiResult.error);
      return [];
    }

    const recommendations = parseRecommendations(apiResult.data);
    timer.end();

    return recommendations || [];
  } catch (error) {
    timer.end();
    console.error("Generate premium recommendations error:", error);
    return [];
  }
}

/**
 * Clear cached recommendations for the current user
 * Useful for forcing a refresh
 */
export async function clearRecommendationCache(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    const { error: deleteError } = await supabase
      .from("recommendation_cache")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Clear recommendation cache error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
