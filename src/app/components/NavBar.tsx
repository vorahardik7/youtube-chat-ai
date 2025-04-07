// FILE: src/app/components/NavBar.tsx
'use client'; // Add this because it uses useState

import { useState } from 'react';
import Link from 'next/link'; // Import from next/link
import { motion } from 'motion/react';
import { MessageSquare, Menu, X } from 'lucide-react';

export function NavBar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMenu = () => setIsMobileMenuOpen(false); // Helper to close menu

  return (
    <div className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-sm"> 
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2" onClick={closeMenu}>
              <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center">
                <MessageSquare size={18} className="text-white" />
              </div>
              <span className="text-slate-900 font-bold text-lg">VideoChat AI</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-4">
              <Link href="/" className="text-slate-700 hover:text-teal-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Home
              </Link>
              {/* Keep external links as <a> */}
              <a href="https://github.com/yourusername/youtube-chat" target="_blank" rel="noopener noreferrer" className="text-slate-700 hover:text-teal-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                GitHub
              </a>
              <motion.a
                href="mailto:your-email@example.com"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Contact
              </motion.a>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-700 hover:text-teal-600 hover:bg-slate-100 focus:outline-none"
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

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
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
            <a
              href="https://github.com/yourusername/youtube-chat"
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-teal-600 hover:bg-slate-50 transition-colors"
            >
              GitHub
            </a>
            <a
              href="mailto:your-email@example.com"
              onClick={closeMenu}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-teal-600 hover:bg-slate-50 transition-colors"
            >
              Contact
            </a>
          </div>
        </motion.div>
      )}
    </div>
  );
}