/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ReactLenis } from 'lenis/react';
import Home from './pages/Home';
import Services from './pages/Services';
import Pricing from './pages/Pricing';
import CaseStudies from './pages/CaseStudies';
import About from './pages/About';
import Contact from './pages/Contact';
import Blog from './pages/Blog';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import ServiceDetail from './pages/ServiceDetail';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './lib/auth/AuthContext';
import Login from './app/Login';
import Signup from './app/Signup';
import ForgotPassword from './app/ForgotPassword';
import SetPassword from './lib/auth/SetPassword';
import Checkout from './checkout/Checkout';
import CheckoutSuccess from './checkout/CheckoutSuccess';
import ClientLayout from './app/ClientLayout';
import DashboardHome from './app/DashboardHome';
import Onboarding from './app/Onboarding';
import ProposalView from './app/ProposalView';
import RequestBoard from './app/RequestBoard';
import RequestDetail from './app/RequestDetail';
import Settings from './app/Settings';
import OpsLayout from './ops/OpsLayout';
import OpsBoard from './ops/OpsBoard';
import ClientsList from './ops/ClientsList';
import OnboardingReview from './ops/OnboardingReview';
import OpsRequestDetail from './ops/RequestDetail';
import OrgsAdmin from './ops/admin/OrgsAdmin';
import ProposalBuilder from './ops/admin/ProposalBuilder';
import UsersAdmin from './ops/admin/UsersAdmin';
import RequireRole from './lib/auth/RequireRole';
import { TEST_MODE } from './lib/testMode/flag';
import RoleSwitcher from './lib/testMode/RoleSwitcher';

import Compare from './pages/Compare';
import Examples from './pages/Examples';
import Reviews from './pages/Reviews';
import Industries from './pages/Industries';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
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
    </AnimatePresence>
  );
}

const DASHBOARD_PATH_PREFIXES = ['/app', '/ops', '/set-password', '/checkout'];

function isDashboardPath(pathname: string): boolean {
  return DASHBOARD_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// Dashboard routes (client portal + internal/admin ops) render their own
// chrome instead of the marketing NavBar/Footer — see ClientLayout/OpsLayout.
function DashboardRoutes() {
  return (
    <>
      <ScrollToTop />
      {TEST_MODE && <RoleSwitcher />}
      <Routes>
        <Route path="/app/login" element={<Login />} />
        <Route path="/app/signup" element={<Signup />} />
        <Route path="/app/forgot-password" element={<ForgotPassword />} />
        <Route path="/app/reset-password" element={<SetPassword />} />
        <Route path="/set-password" element={<SetPassword />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/checkout/success" element={<CheckoutSuccess />} />
        <Route path="/app" element={<ClientLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="onboarding" element={<Onboarding />} />
          <Route path="proposal" element={<ProposalView />} />
          <Route path="requests" element={<RequestBoard />} />
          <Route path="requests/:id" element={<RequestDetail />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="/ops" element={<OpsLayout />}>
          <Route index element={<OpsBoard />} />
          <Route path="clients" element={<ClientsList />} />
          <Route path="onboarding" element={<OnboardingReview />} />
          <Route path="requests/:id" element={<OpsRequestDetail />} />
          <Route
            path="admin/orgs"
            element={
              <RequireRole roles={['admin']}>
                <OrgsAdmin />
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
          <Route
            path="admin/users"
            element={
              <RequireRole roles={['admin']}>
                <UsersAdmin />
              </RequireRole>
            }
          />
        </Route>
      </Routes>
    </>
  );
}

function MarketingSite() {
  return (
    <>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col bg-background text-on-surface transition-colors duration-500">
        <NavBar />
        <main className="flex-grow">
          <AnimatedRoutes />
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
