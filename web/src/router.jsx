import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

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



export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    element: <PlatformLayout />,
    children: [
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
]);
