import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { NAV_LINKS } from '@/lib/navLinks';

export default function NavDrawer({ open, onClose }) {
  const { pathname } = useLocation();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-foreground/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed left-0 top-0 z-50 flex h-full w-[86%] max-w-sm flex-col border-r border-border bg-background p-7"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-xs uppercase tracking-[0.35em] text-foreground">
                Lacunarium
              </span>
              <button onClick={onClose} aria-label="Close menu" className="rounded-full p-2 text-foreground transition hover:bg-foreground/10">
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="mt-12 flex flex-col gap-1">
              {NAV_LINKS.map((link, i) => (
                <motion.div
                  key={link.to}
                  initial={{ opacity: 0, x: -18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06 + i * 0.06 }}
                >
                  <Link
                    to={link.to}
                    onClick={onClose}
                    className={`block border-b border-border py-4 text-3xl font-semibold tracking-tight transition-colors ${
                      pathname === link.to ? 'text-foreground' : 'text-foreground/60 hover:text-foreground'
                    }`}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </nav>

          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}