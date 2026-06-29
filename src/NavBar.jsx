import React from 'react';
import { Link } from 'react-router-dom';

const NavBar = () => {
  return (
    <nav style={navStyle}>
      <div style={logoStyle}>AlphaCannon</div>
      <div style={linksContainerStyle}>
        {/* Use Link instead of <a> tags to prevent full page reloads */}
        <Link to="/alpha-submitter" style={linkStyle}>Alpha Submitter</Link>
        <Link to="/submitted-alphas" style={linkStyle}>Submitted Alphas</Link>
        <Link to="/fields" style={linkStyle}>Data Fields</Link>
      </div>
    </nav>
  );
};

// Simple inline styles for the navigation bar
const navStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '15px 30px',
  backgroundColor: '#1a1a1a',
  color: '#ffffff',
  fontFamily: 'sans-serif',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
};

const logoStyle = {
  fontSize: '20px',
  fontWeight: 'bold',
  letterSpacing: '1px'
};

const linksContainerStyle = {
  display: 'flex',
  gap: '20px'
};

const linkStyle = {
  color: '#ffffff',
  textDecoration: 'none',
  fontSize: '16px',
  fontWeight: '500'
};

export default NavBar;
