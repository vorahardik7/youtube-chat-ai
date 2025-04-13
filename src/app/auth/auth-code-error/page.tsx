// src/app/auth/auth-code-error/page.tsx
import Link from 'next/link';

export default function AuthErrorPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-gray-50">
      <h1 className="text-3xl font-bold text-red-600 mb-4">Authentication Error</h1>
      <p className="mb-6 text-gray-700 max-w-md">
        Sorry, we encountered a problem trying to sign you in. This might be due to an invalid or expired authorization code, or a configuration issue.
      </p>
      <p className="mb-8 text-sm text-gray-500">
        Please try signing in again. If the problem persists, contact support.
      </p>
      <Link 
        href="/"
        className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors shadow-md"
      >
        Return to Home
      </Link>
    </div>
  );
}
