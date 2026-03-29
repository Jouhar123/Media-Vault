import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchFiles } from '../store/slices/filesSlice';
import FileCard from '../components/FileCard/FileCard';
import './DashboardPage.scss';

const FILTERS = [
  { label: 'All', value: '' },
  { label: '🖼 Images', value: 'image' },
  { label: '🎬 Videos', value: 'video' },
  { label: '🎵 Audio', value: 'audio' },
  { label: '📄 PDFs', value: 'pdf' },
];

const MyFilesPage = () => {
  const dispatch = useDispatch();
  const { items, loading, pagination } = useSelector((s) => s.files);
  const [fileType, setFileType] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchFiles({ myFiles: true, fileType: fileType || undefined, sortBy, order: 'desc', page, limit: 12 }));
  }, [dispatch, fileType, sortBy, page]);

  const totalSize = items.reduce((acc, f) => acc + (f.size || 0), 0);
  const formatSize = (bytes) => {
    const mb = bytes / 1024 / 1024;
    return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__title">My Files</h1>
          <p className="dashboard__subtitle">
            {pagination.total} file{pagination.total !== 1 ? 's' : ''} · {formatSize(totalSize)} used
          </p>
        </div>
        <Link to="/upload" className="btn btn-primary btn-lg">↑ Upload File</Link>
      </div>

      {/* Stats */}
      <div className="dashboard__stats">
        {[
          { label: 'Total Files', value: pagination.total, icon: '◫', color: 'violet' },
          { label: 'Images', value: items.filter(f => f.fileType === 'image').length, icon: '🖼', color: 'teal' },
          { label: 'Videos', value: items.filter(f => f.fileType === 'video').length, icon: '🎬', color: 'amber' },
          { label: 'Total Views', value: items.reduce((a, f) => a + f.viewCount, 0), icon: '👁', color: 'rose' },
        ].map(stat => (
          <div key={stat.label} className={`stat-card stat-card--${stat.color}`}>
            <span className="stat-card__icon">{stat.icon}</span>
            <div>
              <p className="stat-card__value">{stat.value}</p>
              <p className="stat-card__label">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard__controls">
        <div className="filter-tabs">
          {FILTERS.map(f => (
            <button
              key={f.value}
              className={`filter-tab ${fileType === f.value ? 'filter-tab--active' : ''}`}
              onClick={() => { setFileType(f.value); setPage(1); }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="sort-select-wrap">
          <span className="sort-label">Sort:</span>
          <select className="sort-select" value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }}>
            <option value="createdAt">Newest</option>
            <option value="viewCount">Most Viewed</option>
            <option value="name">Name A–Z</option>
            <option value="size">Largest</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="dashboard__loading">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton-card" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <h3>No files yet</h3>
          <p>Start uploading to build your vault</p>
          <Link to="/upload" className="btn btn-primary">Upload Now</Link>
        </div>
      ) : (
        <div className="file-grid">
          {items.map((file, i) => (
            <div key={file._id} className="animate-fadeInUp" style={{ animationDelay: `${i * 0.04}s` }}>
              <FileCard file={file} showActions />
            </div>
          ))}
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="pagination">
          <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
          {[...Array(Math.min(pagination.pages, 7))].map((_, i) => {
            const p = i + 1;
            return <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>;
          })}
          <button onClick={() => setPage(p => p + 1)} disabled={page === pagination.pages}>›</button>
        </div>
      )}
    </div>
  );
};

export default MyFilesPage;
