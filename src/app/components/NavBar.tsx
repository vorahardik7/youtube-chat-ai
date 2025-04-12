// FILE: src/app/components/NavBar.tsx
'use client'; 

import { useState } from 'react';
import Link from 'next/link'; 
import { MessageSquare, Menu, X, Search, Youtube } from 'lucide-react';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

interface NavBarProps {
  simplified?: boolean;
  className?: string;
  leftContent?: React.ReactNode;
  centerContent?: React.ReactNode;
  rightContent?: React.ReactNode;
}

export function NavBar({ simplified = false, className = '', leftContent, centerContent, rightContent }: NavBarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMenu = () => setIsMobileMenuOpen(false); 

  return (
    <div className={`${simplified ? '' : 'border-b border-slate-200'} bg-white ${simplified ? '' : 'sticky top-0 z-20 shadow-lg'} ${className}`}>
      <div className={`${simplified ? 'px-3' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}`}>
        <div className="flex items-center justify-between h-16">
          {/* Left Content */}
          <div className="flex items-center">
            {leftContent || (!simplified && (
              <Link href="/" className="flex items-center gap-3" onClick={closeMenu}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-teal-500 to-teal-600 flex items-center justify-center shadow-md">
                  <MessageSquare size={20} className="text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-900 font-bold text-lg leading-tight">VideoChat AI</span>
                  <span className="text-xs text-slate-500 -mt-1">Chat with any YouTube video</span>
                </div>
              </Link>
            ))}
          </div>
          
          {/* Center Content */}
          <div className="flex-1 flex justify-center max-w-xl mx-4 lg:mx-8 hidden md:flex">
            {centerContent || (
              <div className="relative w-full max-w-2xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-slate-400" />
                </div>
                <input 
                  type="text" 
                  placeholder="Paste YouTube URL or search..." 
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-full bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
              </div>
            )}
          </div>

          {/* Right Content */}
          <div className="flex items-center gap-2">
            {rightContent || (
              <>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 shadow-md">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M8 12h8"></path>
                        <path d="M12 8v8"></path>
                      </svg>
                      <span className="hidden sm:inline">Sign in</span>
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <UserButton
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        userButtonAvatarBox: "w-10 h-10 border-2 border-teal-100"
                      }
                    }}
                  />
                </SignedIn>
              </>
            )}
          </div>
          
          {/* Mobile Menu Button - Only show if not simplified */}
          {!simplified && (
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
          )}
        </div>
      </div>

      {!simplified && isMobileMenuOpen && (
        <div
          id="mobile-menu"
          className="md:hidden shadow-lg border-t border-slate-100"
        >
          <div className="px-4 pt-3 pb-4 space-y-3 bg-white">
            <div className="relative w-full mb-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-400" />
              </div>
              <input 
                type="text" 
                placeholder="Paste YouTube URL or search..." 
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-full bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>
            
            <Link
              href="/"
              onClick={closeMenu}
              className="flex items-center px-3 py-2.5 rounded-lg text-base font-medium text-slate-700 hover:text-teal-600 hover:bg-slate-50 transition-colors"
            >
              <Youtube size={18} className="mr-3 text-slate-500" />
              My Videos
            </Link>
            
            <SignedOut>
              <SignInButton mode="modal">
                <button className="w-full text-left flex items-center px-3 py-2.5 rounded-lg text-base font-medium text-teal-600 hover:text-teal-700 hover:bg-slate-50 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M8 12h8"></path>
                    <path d="M12 8v8"></path>
                  </svg>
                  Sign in with Google
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      )}
    </div>
  );
}