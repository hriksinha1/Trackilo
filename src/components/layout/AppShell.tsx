import React, { useEffect, useState, useCallback } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Users,
  Building2,
  CreditCard,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Search,
  Plus,
  Menu,
  X,
  ChevronDown,
  CheckCircle,
  Home,
  SlidersHorizontal,
  Layers
} from 'lucide-react';
import { repository } from '../../lib/repository';
import { Property } from '../../lib/repository/types';
import GlobalSearchModal from '../navigation/GlobalSearchModal';

const SCOPE_STORAGE_KEY = 'bookzee_property_scope_v1';

export type AppContextType = {
  propertyFilter: string;
  setPropertyFilter: (id: string) => void;
  properties: Property[];
  refreshProperties: () => Promise<void>;
};

export default function AppShell({ onLogout }: { onLogout: () => void }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyFilter, setPropertyFilterState] = useState<string>(() => {
    return localStorage.getItem(SCOPE_STORAGE_KEY) || '';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const loadProperties = useCallback(async () => {
    try {
      const res = await repository.getProperties();
      setProperties(res);
    } catch (err) {
      console.error('Failed to load properties in shell', err);
    }
  }, []);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const setPropertyFilter = useCallback((id: string) => {
    setPropertyFilterState(id);
    if (id) {
      localStorage.setItem(SCOPE_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(SCOPE_STORAGE_KEY);
    }
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const activeProperty = properties.find((p) => p.id === propertyFilter);
  const activeProperties = properties.filter((p) => p.active);
  const inactiveProperties = properties.filter((p) => !p.active);

  const navLinks = [
    {
      section: 'TODAY',
      items: [
        { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
        { to: '/calendar', label: 'Calendar', icon: Calendar },
      ],
    },
    {
      section: 'STAYS',
      items: [
        { to: '/bookings', label: 'Bookings', icon: CalendarDays },
        { to: '/guests', label: 'Guests', icon: Users },
      ],
    },
    {
      section: 'MONEY',
      items: [
        { to: '/payments', label: 'Payments', icon: CreditCard },
      ],
    },
    {
      section: 'BUSINESS',
      items: [
        { to: '/properties', label: 'Properties', icon: Building2 },
        { to: '/reports', label: 'Reports', icon: BarChart3 },
      ],
    },
  ];

  return (
    <div className="flex h-screen bg-[#F8F7F4] overflow-hidden font-sans text-[#1A2B28]">
      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Desktop Sidebar Rail */}
      <aside className="w-68 bg-white border-r border-[#D8D2C5] flex-col z-30 hidden lg:flex select-none shrink-0">
        {/* Brand Area */}
        <div className="h-18 flex items-center px-6 border-b border-[#EAE5DC] justify-between">
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0D5C56] to-[#073330] text-white flex items-center justify-center shadow-xs group-hover:scale-[1.02] transition-transform">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 10.5L12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20v-9.5z"/>
                <path d="M9 21v-7a3 3 0 0 1 6 0v7"/>
              </svg>
            </div>
            <div>
              <div className="font-display text-2xl tracking-wide text-[#1A2B28] flex items-center gap-1.5 leading-none">
                BOOKZEE
              </div>
              <div className="text-[11px] text-[#5C6E6B] font-medium tracking-tight mt-0.5">
                Hospitality Workspace
              </div>
            </div>
          </NavLink>
        </div>

        {/* Primary Action Button */}
        <div className="p-4 border-b border-[#EAE5DC]">
          <button
            onClick={() => navigate('/bookings/new')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#0D5C56] text-white font-medium hover:bg-[#094440] transition-all shadow-xs active:scale-[0.99] text-xs font-semibold"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>New Stay Booking</span>
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {navLinks.map((group) => (
            <div key={group.section} className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#5C6E6B]">
                {group.section}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-[#E8F3F1] text-[#0D5C56] shadow-2xs font-bold'
                          : 'text-[#5C6E6B] hover:bg-[#FAF9F6] hover:text-[#1A2B28]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          size={18}
                          strokeWidth={isActive ? 2.2 : 1.8}
                          className={isActive ? 'text-[#0D5C56]' : 'text-[#5C6E6B]'}
                        />
                        <span className="flex-1">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}

          {/* System Section */}
          <div className="space-y-1 pt-2 border-t border-[#EAE5DC]">
            <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#5C6E6B]">
              SYSTEM
            </div>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#E8F3F1] text-[#0D5C56] shadow-2xs font-bold'
                    : 'text-[#5C6E6B] hover:bg-[#FAF9F6] hover:text-[#1A2B28]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <SettingsIcon
                    size={18}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    className={isActive ? 'text-[#0D5C56]' : 'text-[#5C6E6B]'}
                  />
                  <span>Settings & Policies</span>
                </>
              )}
            </NavLink>
          </div>
        </nav>

        {/* User Session Footer */}
        <div className="p-4 border-t border-[#EAE5DC] bg-[#FAF9F6]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#E8F3F1] text-[#0D5C56] font-bold text-xs flex items-center justify-center border border-[#BDDFC9]">
                BZ
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#1A2B28] truncate">Bookzee Stays</p>
                <p className="text-[11px] text-[#5C6E6B] truncate">Host Operations</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out of Demo Workspace"
              className="p-1.5 rounded-lg text-[#5C6E6B] hover:text-[#C45532] hover:bg-white transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-18 bg-white border-b border-[#D8D2C5] flex items-center justify-between px-3 sm:px-6 lg:px-8 z-20 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-4 flex-1 min-w-0">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-[#1A2B28] hover:bg-[#FAF9F6] transition-colors"
              aria-label="Open navigation drawer"
            >
              <Menu size={20} />
            </button>

            {/* Mobile Brand Logo */}
            <div className="flex items-center gap-1.5 lg:hidden">
              <div className="w-8 h-8 rounded-lg bg-[#0D5C56] text-white flex items-center justify-center font-bold text-xs">
                B
              </div>
              <span className="font-display text-lg tracking-wide text-[#1A2B28] hidden sm:inline">BOOKZEE</span>
            </div>

            {/* Prominent Property Scope Selector */}
            <div className="relative flex items-center min-w-0">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-[#D8D2C5] bg-[#FAF9F6] text-xs font-medium text-[#1A2B28] hover:border-[#0D5C56] transition-colors">
                <Building2 size={15} className="text-[#0D5C56] shrink-0" />
                <select
                  aria-label="Filter workspace by property"
                  value={propertyFilter}
                  onChange={(e) => setPropertyFilter(e.target.value)}
                  className="bg-transparent border-none outline-none text-[#1A2B28] font-semibold cursor-pointer pr-5 appearance-none max-w-[130px] sm:max-w-[210px] truncate"
                >
                  <option value="">All Properties ({properties.length})</option>
                  <optgroup label="Active Properties">
                    {activeProperties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                  {inactiveProperties.length > 0 && (
                    <optgroup label="Inactive Archive">
                      {inactiveProperties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Archived)
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <ChevronDown size={13} className="text-[#5C6E6B] -ml-4 pointer-events-none" />
              </div>

              {propertyFilter ? (
                <div className="ml-2 hidden sm:inline-flex items-center gap-1.5 text-xs text-[#0D5C56] bg-[#E8F3F1] px-2.5 py-1 rounded-full font-medium border border-[#BDDFC9] shrink-0">
                  <CheckCircle size={13} />
                  <span className="truncate max-w-[140px]">{activeProperty?.name}</span>
                  <button
                    onClick={() => setPropertyFilter('')}
                    className="hover:text-[#C45532] ml-0.5 text-stone-400"
                    title="Clear filter to Portfolio View"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="ml-2 hidden sm:inline-flex items-center gap-1 text-xs text-[#5C6E6B] bg-stone-100 px-2 py-0.5 rounded-full font-medium shrink-0">
                  <Layers size={12} className="text-[#0D5C56]" />
                  <span>Whole Portfolio</span>
                </div>
              )}
            </div>

            {/* Global Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#D8D2C5] bg-[#FAF9F6] text-[#5C6E6B] hover:text-[#1A2B28] hover:border-[#0D5C56] transition-colors text-xs max-w-xs flex-1 sm:flex-initial"
            >
              <Search size={15} className="text-[#5C6E6B]" />
              <span className="hidden md:inline">Search stays, guests, receipts...</span>
              <span className="md:hidden">Search...</span>
              <kbd className="hidden sm:inline-block ml-auto text-[10px] px-1.5 py-0.5 bg-white border border-stone-200 rounded text-stone-500 font-mono shadow-2xs">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Link to New Booking */}
            <button
              onClick={() => navigate('/bookings/new')}
              className="flex items-center justify-center p-2 sm:px-3 sm:py-1.5 rounded-xl bg-[#0D5C56] text-white text-xs font-semibold hover:bg-[#094440] shadow-2xs"
              title="New Booking"
            >
              <Plus size={16} />
              <span className="hidden sm:inline ml-1.5">New Stay</span>
            </button>
          </div>
        </header>

        {/* Scrollable Page Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <Outlet
            context={{
              propertyFilter,
              setPropertyFilter,
              properties,
              refreshProperties: loadProperties
            }}
          />
        </main>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex lg:hidden animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="w-72 bg-white h-full flex flex-col p-5 space-y-6 shadow-2xl animate-modal-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE5DC]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#0D5C56] text-white flex items-center justify-center font-bold text-xs">
                    B
                  </div>
                  <div>
                    <div className="font-display text-xl tracking-wide text-[#1A2B28] leading-none">BOOKZEE</div>
                    <div className="text-[10px] text-[#5C6E6B]">Operations Workspace</div>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-[#1A2B28]"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scope filter inside mobile drawer */}
              <div className="space-y-1 text-xs">
                <span className="font-bold uppercase tracking-wider text-[#5C6E6B] text-[10px]">Property Filter</span>
                <select
                  value={propertyFilter}
                  onChange={(e) => setPropertyFilter(e.target.value)}
                  className="select text-xs"
                >
                  <option value="">All Properties ({properties.length})</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {!p.active ? '(Inactive)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Navigation links */}
              <nav className="flex-1 overflow-y-auto space-y-4 text-xs font-medium">
                {navLinks.map((group) => (
                  <div key={group.section} className="space-y-1">
                    <div className="px-2 text-[10px] font-bold text-[#5C6E6B] uppercase tracking-wider">
                      {group.section}
                    </div>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.end}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                              isActive
                                ? 'bg-[#E8F3F1] text-[#0D5C56] font-bold'
                                : 'text-[#5C6E6B] hover:bg-[#FAF9F6] hover:text-[#1A2B28]'
                            }`
                          }
                        >
                          <Icon size={16} />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                ))}

                <div className="pt-2 border-t border-[#EAE5DC]">
                  <NavLink
                    to="/settings"
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                        isActive
                          ? 'bg-[#E8F3F1] text-[#0D5C56] font-bold'
                          : 'text-[#5C6E6B] hover:bg-[#FAF9F6] hover:text-[#1A2B28]'
                      }`
                    }
                  >
                    <SettingsIcon size={16} />
                    <span>Settings & Policies</span>
                  </NavLink>
                </div>
              </nav>

              <div className="pt-3 border-t border-[#EAE5DC] flex items-center justify-between">
                <span className="text-xs text-[#5C6E6B]">Demo Session Active</span>
                <button
                  onClick={onLogout}
                  className="text-xs font-semibold text-[#C45532] hover:underline"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Bottom Navigation Bar (below 768px) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#D8D2C5] flex items-center justify-around z-30 px-2 shadow-lg">
          {[
            { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
            { to: '/calendar', label: 'Calendar', icon: Calendar },
            { to: '/bookings', label: 'Bookings', icon: CalendarDays },
            { to: '/payments', label: 'Payments', icon: CreditCard },
            { to: '/properties', label: 'Properties', icon: Building2 },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium transition-colors ${
                    isActive ? 'text-[#0D5C56] font-bold' : 'text-[#5C6E6B] hover:text-[#1A2B28]'
                  }`
                }
              >
                <Icon size={18} strokeWidth={1.9} />
                <span className="mt-0.5">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
}
