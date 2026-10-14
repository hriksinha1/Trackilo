import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, Sparkles, Building2, Calendar, CreditCard, BedDouble } from 'lucide-react';

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('host@bookzee.local');
  const [password, setPassword] = useState('••••••••••••');
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      onLogin();
    }, 400);
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F8F7F4] text-[#1A2B28]">
      {/* Left Hospitality Atmosphere Showcase */}
      <div className="lg:w-7/12 relative bg-[#09423E] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between overflow-hidden">
        {/* Subtle Architectural Gradient Backing */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#0D5C56_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#0D5C56] opacity-30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#C45532] opacity-20 blur-3xl pointer-events-none" />

        {/* Top Branding */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0D5C56] to-[#12413C] flex items-center justify-center shadow-md border border-white/20">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 10.5L12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20v-9.5z"/>
                <path d="M9 21v-7a3 3 0 0 1 6 0v7"/>
              </svg>
            </div>
            <div>
              <span className="font-semibold text-2xl tracking-tight text-white flex items-center gap-2">
                Bookzee
                <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full bg-[#E8F3F1]/20 text-[#E8F3F1]">
                  PMS
                </span>
              </span>
              <p className="text-xs text-white/70">Property Management for Homestays & Boutique Stays</p>
            </div>
          </div>
        </div>

        {/* Middle Atmospheric Narrative & Stats */}
        <div className="relative z-10 my-12 lg:my-0 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-medium backdrop-blur-xs mb-6">
            <Sparkles size={14} className="text-[#F8F7F4]" />
            <span>Crafted for hospitality hosts</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white leading-[1.18]">
            Effortless stays, verified payments, and peaceful guests.
          </h1>

          <p className="mt-5 text-base sm:text-lg text-white/80 leading-relaxed">
            Run your rooms, monitor real-time arrivals and departures, collect advance deposits, and generate instant stay folio invoices — all from a single hospitality workspace.
          </p>

          {/* Quick Hospitality Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8 pt-8 border-t border-white/15">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-white/70">
                <Calendar size={14} /> Operations
              </div>
              <div className="text-xl font-semibold text-white">Daily Timeline</div>
              <div className="text-xs text-white/60">Arrivals & departures</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-white/70">
                <CreditCard size={14} /> Cashflow
              </div>
              <div className="text-xl font-semibold text-white">Zero Due Leaks</div>
              <div className="text-xs text-white/60">Outstanding tracking</div>
            </div>
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1.5 text-xs text-white/70">
                <BedDouble size={14} /> Multi-Stay
              </div>
              <div className="text-xl font-semibold text-white">5 Properties</div>
              <div className="text-xs text-white/60">Integrated portfolio</div>
            </div>
          </div>
        </div>

        {/* Bottom Trust Badge */}
        <div className="relative z-10 flex items-center justify-between text-xs text-white/60 pt-6">
          <span>Trusted by independent hoteliers and homestay hosts</span>
          <span>Bookzee Hospitality Suite</span>
        </div>
      </div>

      {/* Right Login / Demo Workspace Entry */}
      <div className="lg:w-5/12 flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-md space-y-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0D5C56]">
              Host Portal
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-[#1A2B28] mt-1 tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-[#5C6E6B] mt-2 leading-relaxed">
              Manage your stays, guests, and payment collections across your properties from one place.
            </p>
          </div>

          {/* Direct One-Click Demo Button */}
          <div className="p-5 rounded-2xl bg-[#E8F3F1] border border-[#BDDFC9] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0D5C56] flex items-center gap-1.5">
                <ShieldCheck size={16} /> Instant Demo Workspace
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#276749] text-white font-medium">
                Ready to Explore
              </span>
            </div>
            <p className="text-xs text-[#1A2B28] leading-relaxed">
              Pre-loaded with live bookings, real arrivals and departures, payment receipts, and property analytics. No signup required.
            </p>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[#0D5C56] text-white font-medium hover:bg-[#09423E] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm text-sm"
            >
              {loading ? (
                <span>Entering Workspace...</span>
              ) : (
                <>
                  <span>Enter Demo Workspace</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#D8D2C5] w-full" />
            <span className="bg-[#F8F7F4] px-3 text-xs text-[#5C6E6B] uppercase tracking-wider">
              Or Sign In With Account
            </span>
          </div>

          {/* Standard Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1A2B28] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input text-sm"
                placeholder="host@property.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#1A2B28]">Password</label>
                <span className="text-xs text-[#0D5C56] hover:underline cursor-pointer">
                  Forgot password?
                </span>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[#1A2B28] text-white font-medium hover:bg-[#09423E] transition-all text-sm flex items-center justify-center gap-2 mt-2"
            >
              Sign In to Dashboard
            </button>
          </form>

          <p className="text-center text-xs text-[#5C6E6B]">
            Bookzee PMS • Premium Hospitality Management
          </p>
        </div>
      </div>
    </div>
  );
}
