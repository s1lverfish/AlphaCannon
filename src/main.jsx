import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AlphaGrid from './AlphaStatistics';
import FieldsPage from './FieldStatistics.jsx';
import NavBar from './NavBar.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <NavBar />
      <div style={{ padding: '20px' }}>
        <Routes>
          <Route path="/alpha-submitter" element={<App />}/>
          <Route path="/submitted-alphas" element={<AlphaGrid />} />
          <Route path="/fields" element={<FieldsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  </React.StrictMode>,
)
