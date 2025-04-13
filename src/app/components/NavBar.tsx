// FILE: src/app/components/NavBar.tsx
'use client'; 

import { useState } from 'react';
import Link from 'next/link'; 
import Image from 'next/image'; 
import { MessageSquare, Menu, X, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext'; 

interface NavBarProps {
  simplified?: boolean;
  className?: string;
}

export function NavBar({ className = '' }: NavBarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isLoading, signInWithGoogle, signOut } = useAuth(); 
  // console.log(user)

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
          <div className="flex items-center gap-4"> 
            {isLoading ? (
              <div className="animate-pulse h-8 w-20 bg-gray-300 rounded-full"></div> 
            ) : user ? (
              <div className="flex items-center gap-3">
                {user.user_metadata?.picture ? (
                  <Image 
                    src={user.user_metadata.picture} 
                    alt="User Avatar" 
                    width={32} 
                    height={32} 
                    className="rounded-full" 
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white">
                    <UserIcon size={18} />
                  </div>
                )}
                <span className="text-sm text-slate-600 hidden sm:inline">{user.user_metadata?.full_name || user.email}</span>
                <button 
                  onClick={signOut}
                  className="bg-gray-100 hover:bg-gray-200 text-slate-700 px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 shadow-sm"
                  title="Sign out"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={signInWithGoogle}
                className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 shadow-md"
              >
                <LogIn size={18} />
                <span className="hidden sm:inline">Sign in with Google</span>
              </button>
            )}
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
            
            {!isLoading && (
              user ? (
                <button 
                  onClick={() => { signOut(); closeMenu(); }}
                  className="w-full text-left flex items-center px-3 py-2.5 rounded-lg text-base font-medium text-slate-700 hover:text-red-600 hover:bg-slate-50 transition-colors"
                >
                  <LogOut size={20} className="mr-3"/>
                  Sign out
                </button>
              ) : (
                <button 
                  onClick={() => { signInWithGoogle(); closeMenu(); }}
                  className="w-full text-left flex items-center px-3 py-2.5 rounded-lg text-base font-medium text-teal-600 hover:text-teal-700 hover:bg-slate-50 transition-colors"
                >
                  <LogIn size={20} className="mr-3"/>
                  Sign in with Google
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}