import React from 'react';
import { Link } from 'react-router-dom';
import './NotFoundPage.scss';

const NotFoundPage = () => (
  <div className="not-found">
    <div className="not-found__bg">
      {[...Array(4)].map((_, i) => <div key={i} className="not-found__orb" style={{ '--i': i }} />)}
    </div>
    <div className="not-found__content animate-fadeInUp">
      <div className="not-found__code">404</div>
      <h1>Page not found</h1>
      <p>The page you're looking for has escaped the vault.</p>
      <div className="not-found__actions">
        <Link to="/dashboard" className="btn btn-primary btn-lg">Go to Dashboard</Link>
        <Link to="/search" className="btn btn-secondary btn-lg">Search Files</Link>
      </div>
    </div>
  </div>
);

export default NotFoundPage;
