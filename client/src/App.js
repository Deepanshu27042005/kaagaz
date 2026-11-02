import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HouseholdProvider } from './context/HouseholdContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import OnboardingPage from './pages/OnboardingPage';
import DocumentsPage from './pages/DocumentsPage';
import IssuesPage from './pages/IssuesPage';
import SchemesPage from './pages/SchemesPage';
import PlanPage from './pages/PlanPage';
import DossierPage from './pages/DossierPage';
import OperatorPage from './pages/OperatorPage';
import InsightsPage from './pages/InsightsPage';
import StudioPage from './pages/StudioPage';
import BenchmarkPage from './pages/BenchmarkPage';
import ChannelsPage from './pages/ChannelsPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <HouseholdProvider>
        <div className="app-shell">
          <Navbar />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/household" element={<OnboardingPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/issues" element={<IssuesPage />} />
              <Route path="/schemes" element={<SchemesPage />} />
              <Route path="/plan" element={<PlanPage />} />
              <Route path="/dossier" element={<DossierPage />} />
              <Route path="/operator" element={<OperatorPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/studio" element={<StudioPage />} />
              <Route path="/benchmark" element={<BenchmarkPage />} />
              <Route path="/channels" element={<ChannelsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </HouseholdProvider>
    </BrowserRouter>
  );
}
