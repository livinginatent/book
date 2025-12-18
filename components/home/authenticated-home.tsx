"use client";

import { BookOpen, BookCheck, TrendingUp, Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export function AuthenticatedHome() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}!
          </h1>
          <p className="text-muted-foreground text-lg">
            Continue your reading journey
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Currently Reading</h3>
            </div>
            <p className="text-3xl font-bold">0</p>
            <p className="text-sm text-muted-foreground mt-1">books</p>
          </div>

          <div className="p-6 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-3 mb-2">
              <BookCheck className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Books Read</h3>
            </div>
            <p className="text-3xl font-bold">0</p>
            <p className="text-sm text-muted-foreground mt-1">this year</p>
          </div>

          <div className="p-6 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Reading Streak</h3>
            </div>
            <p className="text-3xl font-bold">0</p>
            <p className="text-sm text-muted-foreground mt-1">days</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Link href="/discover">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add a Book
              </Button>
            </Link>
            <Link href="/discover">
              <Button variant="outline">Discover Books</Button>
            </Link>
            <Link href="/community">
              <Button variant="outline">Join Community</Button>
            </Link>
          </div>
        </div>

        {/* Recent Activity Placeholder */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
          <div className="p-8 rounded-lg border border-border bg-card text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No recent activity. Start by adding your first book!
            </p>
          </div>
        </div>

        {/* Reading Goals Placeholder */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Reading Goals</h2>
          <div className="p-8 rounded-lg border border-border bg-card text-center">
            <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Set your reading goals for the year
            </p>
            <Button variant="outline">Set Goals</Button>
          </div>
        </div>
      </div>
    </div>
  );
}




