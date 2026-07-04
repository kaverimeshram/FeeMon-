import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './context/WalletContext';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import ValidatorPage from './pages/ValidatorPage';
import Docs from './pages/Docs';

export const App = () => {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/validator/:id" element={<ValidatorPage />} />
          <Route path="/docs" element={<Docs />} />
        </Routes>
      </BrowserRouter>
    </WalletProvider>
  );
};

export default App;
