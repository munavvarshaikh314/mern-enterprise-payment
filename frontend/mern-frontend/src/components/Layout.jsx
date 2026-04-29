import React, { useMemo, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CreditCard,
  Home,
  LogOut,
  Menu,
  PlusCircle,
  Settings,
  Shield,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const baseNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const adminNavigation = [
  { name: 'Admin Overview', href: '/admin', icon: BarChart3 },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'All Payments', href: '/admin/payments', icon: CreditCard },
];

const NavLink = ({ item, active, mobile = false }) => (
  <Link
    to={item.href}
    className={[
      'group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all',
      active
        ? 'bg-foreground text-background shadow-lg shadow-black/10'
        : 'text-muted-foreground hover:bg-white/70 hover:text-foreground',
      mobile ? 'w-full' : '',
    ].join(' ')}
  >
    <item.icon className="h-4 w-4 transition-transform group-hover:scale-105" />
    <span>{item.name}</span>
  </Link>
);

const UserBadge = ({ user }) => (
  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground text-sm font-semibold text-background shadow-lg shadow-black/10">
    {user?.firstName?.charAt(0)}
    {user?.lastName?.charAt(0)}
  </div>
);

const SidebarSection = ({ title, children }) => (
  <section className="rounded-[28px] border border-white/70 bg-white/80 p-4 shadow-xl shadow-orange-100/30 backdrop-blur-xl">
    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
      {title}
    </p>
    <div className="space-y-1.5">{children}</div>
  </section>
);

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAdmin = ['admin', 'superadmin'].includes(user?.role || '');

  const quickSummary = useMemo(() => {
    return [
      user?.region || 'Global account',
      user?.preferences?.twoFactorAuth ? '2FA on' : '2FA off',
    ];
  }, [user]);

  const isActive = (href) => {
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const renderNavigation = (items, mobile = false) =>
    items.map((item) => (
      <NavLink
        key={item.href}
        item={item}
        mobile={mobile}
        active={isActive(item.href)}
      />
    ));

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(254,215,170,0.5),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(110,231,183,0.24),_transparent_22%),linear-gradient(180deg,_#fffaf3_0%,_#fffdf8_45%,_#fff7ed_100%)]">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.02)_1px,transparent_1px)] bg-[size:22px_22px]" />

      <header className="sticky top-0 z-50 border-b border-white/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-2xl lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] border-white/80 bg-[#fff9f2]/95">
                <div className="space-y-6 py-4">
                  <div className="rounded-[24px] border border-white/70 bg-white/80 p-4 shadow-xl shadow-orange-100/30">
                    <div className="mb-3 flex items-center gap-3">
                      <UserBadge user={user} />
                      <div>
                        <p className="text-sm font-semibold">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {quickSummary.map((item) => (
                        <Badge key={item} variant="secondary" className="rounded-full">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <SidebarSection title="Workspace">
                    {renderNavigation(baseNavigation, true)}
                  </SidebarSection>

                  {isAdmin && (
                    <SidebarSection title="Admin">
                      {renderNavigation(adminNavigation, true)}
                    </SidebarSection>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-foreground text-background shadow-xl shadow-black/10">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  Payments Suite
                </p>
                <h1 className="text-lg font-semibold text-foreground">FlowPilot Console</h1>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Button
              asChild
              className="hidden rounded-2xl px-4 shadow-lg shadow-black/10 sm:inline-flex"
            >
              <Link to="/payments/create">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Payment
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-auto rounded-[24px] border-white/70 bg-white/80 px-3 py-2 shadow-lg shadow-orange-100/20"
                >
                  <div className="flex items-center gap-3">
                    <UserBadge user={user} />
                    <div className="hidden text-left sm:block">
                      <p className="text-sm font-semibold">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isAdmin ? 'Admin workspace' : 'Personal workspace'}
                      </p>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-2xl">
                <DropdownMenuLabel>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-6">
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-24 space-y-4">
            <section className="overflow-hidden rounded-[32px] border border-white/80 bg-white/85 p-5 shadow-2xl shadow-orange-100/40 backdrop-blur-xl">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,#0f172a,#1f2937)] text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Active Workspace
                  </p>
                  <p className="text-lg font-semibold text-foreground">Operations cockpit</p>
                </div>
              </div>

              <div className="rounded-[26px] bg-[linear-gradient(135deg,#111827,#1f2937)] p-4 text-white shadow-xl shadow-slate-900/20">
                <p className="text-sm text-white/70">Signed in as</p>
                <p className="mt-1 text-lg font-semibold">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="mt-2 text-sm text-white/70">{user?.email}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {quickSummary.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <SidebarSection title="Workspace">
              {renderNavigation(baseNavigation)}
            </SidebarSection>

            {isAdmin && (
              <SidebarSection title="Admin">
                {renderNavigation(adminNavigation)}
              </SidebarSection>
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-5">
          <div className="flex flex-wrap gap-2 lg:hidden">
            {renderNavigation(baseNavigation)}
            {isAdmin && renderNavigation(adminNavigation)}
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
