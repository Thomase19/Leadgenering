"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export function Header({ email }: { email?: string | null }) {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/sites" className="text-xl font-semibold text-slate-800">
          LeadBot
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">{email}</span>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Log ud
          </button>
        </div>
      </div>
    </header>
  );
}
