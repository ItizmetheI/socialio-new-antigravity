/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, useLocation, useParams, Navigate } from 'react-router-dom';
import React, { useEffect, lazy, Suspense } from 'react';
import { motion } from 'motion/react';
import { ReactLenis, useLenis } from 'lenis/react';
import Spinner from './components/Spinner';
import Home from './pages/Home';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './lib/auth/AuthContext';
import RequireRole from './lib/auth/RequireRole';
import { TEST_MODE } from './lib/testMode/flag';

// Dashboard, ops, auth, and checkout screens are only reached by signed-in
// clients/staff — split them out so marketing visitors don't download the
// whole client portal and ops tooling (dnd-kit, builders, etc.) up front.
const AuthShell = lazy(() => import('./components/AuthLayout').then((m) => ({ default: m.AuthShell })));
const Login = lazy(() => import('./app/Login'));
const Signup = lazy(() => import('./app/Signup'));
const ForgotPassword = lazy(() => import('./app/ForgotPassword'));
const SetPassword = lazy(() => import('./lib/auth/SetPassword'));
const Checkout = lazy(() => import('./checkout/Checkout'));
const CheckoutSuccess = lazy(() => import('./checkout/CheckoutSuccess'));
const ClientLayout = lazy(() => import('./app/ClientLayout'));
const DashboardHome = lazy(() => import('./app/DashboardHome'));
const Onboarding = lazy(() => import('./app/Onboarding'));
const PlanView = lazy(() => import('./app/PlanView'));
const ProposalView = lazy(() => import('./app/ProposalView'));
const AccountPage = lazy(() => import('./app/AccountPage'));
const OpsLayout = lazy(() => import('./ops/OpsLayout'));
const OpsOverview = lazy(() => import('./ops/OpsOverview'));
const OpsWork = lazy(() => import('./ops/OpsWork'));
const ClientsList = lazy(() => import('./ops/ClientsList'));
const LeadsInbox = lazy(() => import('./ops/LeadsInbox'));
const ClientDetail = lazy(() => import('./ops/ClientDetail'));
const ProposalBuilder = lazy(() => import('./ops/admin/ProposalBuilder'));
const PlanBuilder = lazy(() => import('./ops/admin/PlanBuilder'));
const EverythingPage = lazy(() => import('./ops/admin/everything/EverythingPage'));
const RoleSwitcher = lazy(() => import('./lib/testMode/RoleSwitcher'));

// Home is the landing page and stays in the main bundle; every other
// marketing page loads on first visit.
const Services = lazy(() => import('./pages/Services'));
const ServiceDetail = lazy(() => import('./pages/ServiceDetail'));
const Pricing = lazy(() => import('./pages/Pricing'));
const CaseStudies = lazy(() => import('./pages/CaseStudies'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Blog = lazy(() => import('./pages/Blog'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Compare = lazy(() => import('./pages/Compare'));
const Examples = lazy(() => import('./pages/Examples'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Industries = lazy(() => import('./pages/Industries'));

// Goes through Lenis rather than window.scrollTo: a native jump leaves
// Lenis's internal target at the old position, so the first wheel tick on
// the new page would glide back toward where the previous page was.
function ScrollToTop() {
  const { pathname } = useLocation();
  const lenis = useLenis();

  useEffect(() => {
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
  }, [pathname, lenis]);

  return null;
}

// Enter-only fade. The old exit animation + AnimatePresence mode="wait"
// held every navigation for 300ms, and ScrollToTop fired during that exit,
// visibly snapping the outgoing page to the top before it faded.
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/service/:id" element={<ServiceDetail />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/case-studies" element={<CaseStudies />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/examples" element={<Examples />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/industries" element={<Industries />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </motion.div>
  );
}

// /app/requests/:id (notification links, old bookmarks) → the piece opened in
// the home page's side panel.
function OpenRequestOnHome() {
  const { id } = useParams();
  return <Navigate to={`/app?item=${id}`} replace />;
}

// /ops/requests/:id (activity feeds, notification links) → Work with that
// piece open in the side panel.
function OpenOpsRequest() {
  const { id } = useParams();
  return <Navigate to={`/ops/work?item=${id}`} replace />;
}

// Redirect that keeps the query string (e.g. ?org=… for the plan builder).
function KeepSearch({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}

const DASHBOARD_PATH_PREFIXES = ['/app', '/ops', '/set-password', '/checkout'];

function isDashboardPath(pathname: string): boolean {
  return DASHBOARD_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// Dashboard routes (client portal + internal/admin ops) render their own
// chrome instead of the marketing NavBar/Footer — see ClientLayout/OpsLayout.
function DashboardRoutes() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <ScrollToTop />
      {TEST_MODE && <RoleSwitcher />}
      <Routes>
        <Route element={<AuthShell />}>
          <Route path="/app/login" element={<Login />} />
          <Route path="/app/signup" element={<Signup />} />
          <Route path="/app/forgot-password" element={<ForgotPassword />} />
        </Route>
        <Route path="/app/reset-password" element={<SetPassword />} />
        <Route path="/set-password" element={<SetPassword />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/checkout/success" element={<CheckoutSuccess />} />
        <Route path="/app" element={<ClientLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="onboarding" element={<Onboarding />} />
          <Route path="plan" element={<PlanView />} />
          <Route path="proposal" element={<ProposalView />} />
          <Route path="account" element={<AccountPage />} />
          {/* The client dashboard is two pages now (Home + Account); older
              links and bookmarks land on the part that replaced them. */}
          <Route path="requests" element={<Navigate to="/app" replace />} />
          <Route path="requests/:id" element={<OpenRequestOnHome />} />
          <Route path="calendar" element={<Navigate to="/app?view=calendar" replace />} />
          <Route path="results" element={<Navigate to="/app#results" replace />} />
          <Route path="billing" element={<Navigate to="/app/account#billing" replace />} />
          <Route path="brand" element={<Navigate to="/app/account#brand" replace />} />
          <Route path="settings" element={<Navigate to="/app/account#profile" replace />} />
        </Route>
        <Route path="/ops" element={<OpsLayout />}>
          <Route index element={<OpsOverview />} />
          <Route path="work" element={<OpsWork />} />
          <Route path="clients" element={<ClientsList />} />
          <Route path="clients/plan" element={<PlanBuilder />} />
          <Route path="clients/:orgId" element={<ClientDetail />} />
          <Route path="leads" element={<LeadsInbox />} />
          <Route
            path="admin"
            element={
              <RequireRole roles={['admin']}>
                <EverythingPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/proposals"
            element={
              <RequireRole roles={['admin']}>
                <ProposalBuilder />
              </RequireRole>
            }
          />
          {/* Staff side is Today / Work / Clients / Leads / Admin now; older
              links and bookmarks land on the part that replaced them. */}
          <Route path="board" element={<Navigate to="/ops/work" replace />} />
          <Route path="calendar" element={<Navigate to="/ops/work" replace />} />
          <Route path="requests/:id" element={<OpenOpsRequest />} />
          <Route path="onboarding" element={<Navigate to="/ops/clients" replace />} />
          <Route path="admin/plans" element={<KeepSearch to="/ops/clients/plan" />} />
          <Route path="admin/orgs" element={<Navigate to="/ops/clients" replace />} />
          <Route path="admin/everything" element={<Navigate to="/ops/admin" replace />} />
          <Route path="admin/users" element={<Navigate to="/ops/admin?view=team" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function MarketingSite() {
  return (
    <>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col bg-background text-on-surface transition-colors duration-500">
        <NavBar />
        <main className="flex-grow">
          <Suspense fallback={<div className="min-h-screen" />}>
            <AnimatedRoutes />
          </Suspense>
        </main>
        <Footer />
      </div>
    </>
  );
}

function AppShell() {
  const { pathname } = useLocation();
  return isDashboardPath(pathname) ? <DashboardRoutes /> : <MarketingSite />;
}

export default function App() {
  return (
    <ReactLenis root>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <CartProvider>
              <AppShell />
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ReactLenis>
  );
}
