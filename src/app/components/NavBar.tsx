// FILE: src/app/components/NavBar.tsx
'use client'; 

import { useState } from 'react';
import Link from 'next/link'; 
import { motion } from 'motion/react';
import { MessageSquare, Menu, X } from 'lucide-react';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

interface NavBarProps {
  simplified?: boolean;
  className?: string;
}

export function NavBar({ simplified = false, className = '' }: NavBarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMenu = () => setIsMobileMenuOpen(false); 

  return (
    <div className={`${simplified ? '' : 'border-b border-slate-200'} bg-white ${simplified ? '' : 'sticky top-0 z-20 shadow-sm'} ${className}`}>
      <div className={`${simplified ? 'px-2' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}`}>
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          {!simplified && (
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-2" onClick={closeMenu}>
                <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center">
                  <MessageSquare size={18} className="text-white" />
                </div>
                <span className="text-slate-900 font-bold text-lg">VideoChat AI</span>
              </Link>
            </div>
          )}

          {/* Desktop Navigation */}
          <div className="flex items-center space-x-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M8 12h8"></path>
                    <path d="M12 8v8"></path>
                  </svg>
                  Sign in with Google
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-8 h-8"
                  }
                }}
              />
            </SignedIn>
          </div>
          
          {/* Mobile Menu Button - Only show if not simplified */}
          {!simplified && (
            <div className="md:hidden flex items-center">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M8 12h8"></path>
                      <path d="M12 8v8"></path>
                    </svg>
                    Sign in
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "w-8 h-8"
                    }
                  }}
                />
              </SignedIn>
              <button
                type="button"
                className="ml-2 inline-flex items-center justify-center p-2 rounded-md text-slate-700 hover:text-teal-600 hover:bg-slate-100 focus:outline-none"
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
        <motion.div
          id="mobile-menu"
          className="md:hidden"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-slate-100">
            <Link
              href="/"
              onClick={closeMenu}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-teal-600 hover:bg-slate-50 transition-colors"
            >
              Home
            </Link>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-teal-600 hover:text-teal-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M8 12h8"></path>
                    <path d="M12 8v8"></path>
                  </svg>
                  Sign in with Google
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </motion.div>
      )}
    </div>
  );
}