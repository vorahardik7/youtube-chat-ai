// FILE: src/app/components/NavBar.tsx
'use client'; 

import { useState } from 'react';
import Link from 'next/link'; 
import { MessageSquare, Menu, X, LogIn } from 'lucide-react';
import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from '@clerk/nextjs';

interface NavBarProps {
  simplified?: boolean;
  className?: string;
}

export function NavBar({ className = '' }: NavBarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useUser();

  const closeMenu = () => setIsMobileMenuOpen(false); 

  return (
    <div className={`border-b border-slate-200 bg-white sticky top-0 z-20 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Content */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3" onClick={closeMenu}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-teal-500 to-teal-600 flex items-center justify-center shadow-md">
                  <MessageSquare size={20} className="text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-900 font-bold text-lg leading-tight">YouTube AI Chat</span>
                </div>
              </Link>
          </div>
          
          {/* Right Content */}
          <div className="flex items-center gap-2">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 shadow-md">
                  <LogIn size={20} />
                  <span className="hidden sm:inline">Sign in</span>
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <p className="text-sm text-slate-500">{user?.firstName}</p>
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-30 h-30"
                  }
                }}
              />
            </SignedIn>
          </div>
          
          {/* Mobile Menu Button - Only show if not simplified */}
          <div className="md:hidden flex items-center ml-2">
              <button
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-full text-slate-700 hover:text-teal-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                aria-controls="mobile-menu"
                aria-expanded={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

      {isMobileMenuOpen && (
        <div
          id="mobile-menu"
          className="md:hidden shadow-lg border-t border-slate-100"
        >
          <div className="px-4 pt-3 pb-4 space-y-3 bg-white">
            
            <Link
              href="/"
              onClick={closeMenu}
              className="flex items-center px-3 py-2.5 rounded-lg text-base font-medium text-slate-700 hover:text-teal-600 hover:bg-slate-50 transition-colors"
            >
              My Videos
            </Link>
            
            <SignedOut>
              <SignInButton mode="modal">
                <button className="w-full text-left flex items-center px-3 py-2.5 rounded-lg text-base font-medium text-teal-600 hover:text-teal-700 hover:bg-slate-50 transition-colors">
                  <LogIn size={20} className="mr-3"/>
                  Sign in
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      )}
    </div>
  );
}