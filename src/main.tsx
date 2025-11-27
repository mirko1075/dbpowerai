import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, useLocation } from 'react-router-dom';
import { trackEvent } from './lib/tracking';
import { HelmetProvider } from 'react-helmet-async';
import Layout from './components/Layout.tsx';
import App from './App.tsx';
import Landing from './pages/Landing.tsx';
import Demo from './Demo.tsx';
import Login from './pages/Login.tsx';
import Signup from './pages/Signup.tsx';
import Pricing from './pages/Pricing.tsx';
import AppPage from './pages/AppPage.tsx';
import Dashboard from './pages/Dashboard.tsx';
import ProfilePage from './pages/ProfilePage.tsx';
import ContactPage from './pages/Contact.tsx';
import Admin from './pages/Admin.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import NotFound from "./pages/NotFoundPage.tsx";
import APIPage from './pages/API.tsx'
import AboutPage from './pages/About.tsx'
import FeaturesPage from './pages/Features.tsx'
import SlowQueryAnalyzerPage from "./pages/SlowQueryAnalyzerPage";
import SqlQueryOptimizationPage from "./pages/SqlQueryOptimizationPage";
import MysqlSlowQueriesPage from "./pages/MysqlSlowQueriesPage";
import PostgresSlowQueriesPage from "./pages/PostgresSlowQueriesPage";
import ExplainPlanAnalyzerPage from "./pages/ExplainPlanAnalyzerPage";
import SqlPerformanceExamplesPage from "./pages/SqlPerformanceExamplesPage";
import './index.css';

function PageViewTracker({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    trackEvent('page_view', { page: location.pathname });
  }, [location.pathname]);

  return <>{children}</>;
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: '/',
        element: (
          <PageViewTracker>
            <Landing />
          </PageViewTracker>
        ),
      },
      {
        path: '/early-access',
        element: (
          <PageViewTracker>
            <App />
          </PageViewTracker>
        ),
      },
      {
        path: '/demo',
        element: (
          <PageViewTracker>
            <Demo />
          </PageViewTracker>
        ),
      },
      {
        path: '/login',
        element: (
          <PageViewTracker>
            <Login />
          </PageViewTracker>
        ),
      },
      {
        path: '/signup',
        element: (
          <PageViewTracker>
            <Signup />
          </PageViewTracker>
        ),
      },
      {
        path: '/pricing',
        element: (
          <PageViewTracker>
            <Pricing />
          </PageViewTracker>
        ),
      },
      {
        path: '/analize',
        element: (
          <PageViewTracker>
            <ProtectedRoute>
              <AppPage />
            </ProtectedRoute>
          </PageViewTracker>
        ),
      },
      {
        path: '/app',
        element: (
          <PageViewTracker>
            <ProtectedRoute>
              <AppPage />
            </ProtectedRoute>
          </PageViewTracker>
        ),
      },
      {
        path: '/dashboard',
        element: (
          <PageViewTracker>
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          </PageViewTracker>
        ),
      },
      {
        path: '/profile',
        element: (
          <PageViewTracker>
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          </PageViewTracker>
        ),
      },
      {
        path: '/admin',
        element: (
          <PageViewTracker>
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          </PageViewTracker>
        ),
      },
      {
        path: '/contact',
        element: (
          <PageViewTracker>
              <ContactPage />
          </PageViewTracker>
        ),
      },
      {
        path: '/api',
        element: (
          <PageViewTracker>
              <APIPage />
          </PageViewTracker>
        ),
      },
      {
        path: '/about',
        element: (
          <PageViewTracker>
              <AboutPage />
          </PageViewTracker>
        ),
      },
      {
        path: '/features',
        element: (
          <PageViewTracker>
              <FeaturesPage />
          </PageViewTracker>
        ),
      },

      // LEARN SECTION (le 6 nuove pagine)
      {
        path: '/slow-query-analyzer',
        element: (
          <PageViewTracker>
            <SlowQueryAnalyzerPage />
          </PageViewTracker>
        ),
      },
      {
        path: '/sql-query-optimization',
        element: (
          <PageViewTracker>
            <SqlQueryOptimizationPage />
          </PageViewTracker>
        ),
      },
      {
        path: '/mysql-slow-queries',
        element: (
          <PageViewTracker>
            <MysqlSlowQueriesPage />
          </PageViewTracker>
        ),
      },
      {
        path: '/postgres-slow-queries',
        element: (
          <PageViewTracker>
            <PostgresSlowQueriesPage />
          </PageViewTracker>
        ),
      },
      {
        path: '/explain-plan-analyzer',
        element: (
          <PageViewTracker>
            <ExplainPlanAnalyzerPage />
          </PageViewTracker>
        ),
      },
      {
        path: '/sql-performance-examples',
        element: (
          <PageViewTracker>
            <SqlPerformanceExamplesPage />
          </PageViewTracker>
        ),
      },
      {
        path: "*",
        element: (
          <PageViewTracker>
            <NotFound />
          </PageViewTracker>
        )
      }
    ]
  }
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <RouterProvider router={router} />
    </HelmetProvider>
  </StrictMode>
);
