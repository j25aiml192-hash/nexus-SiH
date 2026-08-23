import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Menu, X, Shield, Terminal } from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        {/* Brand / Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-white font-mono text-sm font-bold tracking-tight transition-transform group-hover:scale-105">
            NX
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold tracking-tight text-black">
              NEXUS
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          <a
            href="#capabilities"
            className="text-xs font-semibold uppercase tracking-wider text-neutral-600 transition-colors hover:text-black"
          >
            Capabilities
          </a>
          <a
            href="#workflow"
            className="text-xs font-semibold uppercase tracking-wider text-neutral-600 transition-colors hover:text-black"
          >
            Workflow
          </a>
          <a
            href="#metrics"
            className="text-xs font-semibold uppercase tracking-wider text-neutral-600 transition-colors hover:text-black"
          >
            Metrics
          </a>
          <a
            href="#architecture"
            className="text-xs font-semibold uppercase tracking-wider text-neutral-600 transition-colors hover:text-black"
          >
            Architecture
          </a>
        </nav>

        {/* Action Button */}
        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-neutral-800"
          >
            <span>Operator Console</span>
            <ArrowUpRight size={14} />
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden rounded-lg p-2 text-black hover:bg-neutral-100"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-6 py-6 space-y-4 shadow-xl">
          <div className="flex flex-col space-y-3 font-mono text-xs uppercase tracking-wider">
            <a
              href="#capabilities"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-neutral-700 hover:text-black"
            >
              Capabilities
            </a>
            <a
              href="#workflow"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-neutral-700 hover:text-black"
            >
              Workflow
            </a>
            <a
              href="#metrics"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-neutral-700 hover:text-black"
            >
              Metrics
            </a>
            <a
              href="#architecture"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-neutral-700 hover:text-black"
            >
              Architecture
            </a>
          </div>
          <div className="pt-4 border-t border-neutral-100 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-500">
              <Terminal size={12} />
              <span>Section 65B Evidence Compliance</span>
            </div>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/login');
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-black py-3 text-xs font-bold uppercase tracking-wider text-white"
            >
              <Shield size={14} />
              <span>Access Operator Console</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
