import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="container"><div className="card empty"><h2>Page not found</h2><p>That page does not exist.</p><Link to="/" className="btn btn-primary">Go home</Link></div></div>
  );
}
