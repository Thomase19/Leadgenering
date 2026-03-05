import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800">Page not found</h1>
        <p className="text-slate-600 mt-2">The page you’re looking for doesn’t exist.</p>
        <Link
          href="/"
          className="inline-block mt-6 rounded-lg bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-700"
        >
          Go to home
        </Link>
      </div>
    </div>
  );
}
