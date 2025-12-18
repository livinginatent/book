import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Error Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Link Expired or Invalid</h1>
          <p className="text-muted-foreground">
            The verification link you clicked has expired or is invalid. This can happen if:
          </p>
        </div>

        {/* Reasons */}
        <ul className="text-left text-sm text-muted-foreground space-y-2 bg-muted/50 rounded-xl p-4">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            The link was opened in a different browser than where you requested it
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            The link has expired (links are valid for a limited time)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            The link was already used
          </li>
        </ul>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link href="/forgot-password">
            <Button className="w-full gap-2">
              <RefreshCw className="w-4 h-4" />
              Request New Reset Link
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" className="w-full gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

