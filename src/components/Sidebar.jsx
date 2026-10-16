'use client';

import { useState } from 'react';
import { CloseIcon, HomeIcon, MenuIcon, PlusIcon, ReturnIcon } from './Icons';

export default function Sidebar({ onNewRequest }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const brand = (
    <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white">
        <ReturnIcon className="h-5 w-5" />
      </span>
      ReturnDesk
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden">
        {brand}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </header>

      {/* Sidebar: hidden on mobile until the menu button is pressed, always visible on desktop */}
      <aside className={`${menuOpen ? 'block' : 'hidden'} border-b border-gray-200 bg-white p-4 md:sticky md:top-0 md:block md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r`}>
        <div className="mb-6 hidden md:block">{brand}</div>
        <nav className="space-y-1" aria-label="Main">
          <a href="#" className="flex items-center gap-3 rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
            <HomeIcon className="h-4 w-4" /> Dashboard
          </a>
          <button
            type="button"
            onClick={() => { setMenuOpen(false); onNewRequest(); }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <PlusIcon className="h-4 w-4" /> New Request
          </button>
        </nav>
      </aside>
    </>
  );
}
