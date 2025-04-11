'use client';

import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-teal-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome Back</h1>
          <p className="text-slate-600">Sign in to continue to VideoChat AI</p>
        </div>
        
        <SignIn
          appearance={{
            elements: {
              formButtonPrimary: 'bg-teal-600 hover:bg-teal-700 text-white',
              footerActionLink: 'text-teal-600 hover:text-teal-700',
              card: 'shadow-md rounded-lg'
            }
          }}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          afterSignInUrl="/"
          afterSignUpUrl="/"
        />
      </div>
    </div>
  );
}
