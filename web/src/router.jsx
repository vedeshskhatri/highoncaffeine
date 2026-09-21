import React, { useEffect } from 'react';
import { createBrowserRouter, Navigate, Outlet, ScrollRestoration, useLocation } from 'react-router-dom';

import LandingPage from './components/platform/LandingPage';
import PlatformLayout from './components/platform/PlatformLayout';
import DashboardPage from './components/platform/DashboardPage';
import SitesPage from './components/platform/SitesPage';
import SiteHubPage from './components/platform/SiteHubPage';
import ProgrammePage from './components/platform/ProgrammePage';
import AlertsPage from './components/platform/AlertsPage';
import LibraryPage from './components/platform/LibraryPage';
import ForecastPage from './components/platform/ForecastPage';
import MaterialsPage from './components/platform/MaterialsPage';
import ReportPage from './components/platform/ReportPage';
import MethodPage from './components/platform/MethodPage';
import ValidationPage from './components/platform/ValidationPage';
import CpwdPage from './components/platform/CpwdPage';
import MlPredictorPage from './components/platform/MlPredictorPage';
import VerifyPage from './components/platform/VerifyPage';
import TokensPage from './TokensPage';
import App from './App';

function Root() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.body.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const mainViewport = document.querySelector('.platform-main-viewport');
    if (mainViewport) mainViewport.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const pageContent = document.querySelector('.platform-page-content');
    if (pageContent) pageContent.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        path: '/',
        element: <LandingPage />,
      },
      {
        element: <PlatformLayout />,
        children: [
      {
        path: '/platform',
        element: <Navigate to="/sites/site_siachen_base/design" replace />,
      },
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      {
        path: '/sites',
        element: <SitesPage />,
      },
      {
        path: '/sites/:id',
        element: <SiteHubPage />,
      },
      {
        path: '/programme',
        element: <ProgrammePage />,
      },
      {
        path: '/alerts',
        element: <AlertsPage />,
      },
      {
        path: '/library',
        element: <LibraryPage />,
      },
      {
        path: '/forecast',
        element: <ForecastPage />,
      },
      {
        path: '/materials',
        element: <MaterialsPage />,
      },
      {
        path: '/reports',
        element: <ReportPage />,
      },
      {
        path: '/reports/:id',
        element: <ReportPage />,
      },
      {
        path: '/method',
        element: <MethodPage />,
      },
      {
        path: '/validation',
        element: <ValidationPage />,
      },
      {
        path: '/cpwd',
        element: <CpwdPage />,

      },
      {
        path: '/ml-predictor',
        element: <MlPredictorPage />,
      },
      {
        path: '/verify',
        element: <VerifyPage />,
      },
    ],
  },
  {
    path: '/sites/:id/design',
    element: <App />,
  },
  {
    path: '/design',
    element: <App />,
  },
  {
    path: '/tokens',
    element: <TokensPage />,
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
    ],
  },
]);
