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

const SORTS = [
  { label: 'Newest', value: 'createdAt', order: 'desc' },
  { label: 'Most Viewed', value: 'viewCount', order: 'desc' },
  { label: 'Relevance', value: 'relevanceScore', order: 'desc' },
  { label: 'Name A–Z', value: 'name', order: 'asc' },
  { label: 'Largest', value: 'size', order: 'desc' },
];

const DashboardPage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { items, loading, pagination } = useSelector((state) => state.files);
  const [fileType, setFileType] = useState('');
  const [sort, setSort] = useState(SORTS[0]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchFiles({ fileType: fileType || undefined, sortBy: sort.value, order: sort.order, page, limit: 12 }));
  }, [dispatch, fileType, sort, page]);

  const handleFilterChange = (val) => { setFileType(val); setPage(1); };
  const handleSortChange = (s) => { setSort(s); setPage(1); };

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__title">
            Hey, <span>{user?.username}</span> 👋
          </h1>
          <p className="dashboard__subtitle">
            {pagination.total} file{pagination.total !== 1 ? 's' : ''} in the vault
          </p>
        </div>
        <Link to="/upload" className="btn btn-primary btn-lg">
          ↑ Upload File
        </Link>
      </div>

      {/* Stats */}
      <div className="dashboard__stats">
        {[
          { label: 'Total Files', value: pagination.total, icon: '◫', color: 'violet' },
          { label: 'Images', value: items.filter(f => f.fileType === 'image').length, icon: '🖼', color: 'teal' },
          { label: 'Videos', value: items.filter(f => f.fileType === 'video').length, icon: '🎬', color: 'amber' },
          { label: 'Documents', value: items.filter(f => f.fileType === 'pdf').length, icon: '📄', color: 'rose' },
        ].map((stat) => (
          <div key={stat.label} className={`stat-card stat-card--${stat.color}`}>
            <span className="stat-card__icon">{stat.icon}</span>
            <div>
              <p className="stat-card__value">{stat.value}</p>
              <p className="stat-card__label">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Sort */}
      <div className="dashboard__controls">
        <div className="filter-tabs">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={`filter-tab ${fileType === f.value ? 'filter-tab--active' : ''}`}
              onClick={() => handleFilterChange(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="sort-select-wrap">
          <span className="sort-label">Sort:</span>
          <select
            className="sort-select"
            value={sort.value}
            onChange={(e) => handleSortChange(SORTS.find(s => s.value === e.target.value))}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="dashboard__loading">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton-card" style={{ animationDelay: `${i * 0.05}s` }} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <h3>No files yet</h3>
          <p>Upload your first file to get started</p>
          <Link to="/upload" className="btn btn-primary">Upload Now</Link>
        </div>
      ) : (
        <div className="file-grid">
          {items.map((file, i) => (
            <div key={file._id} className="animate-fadeInUp" style={{ animationDelay: `${i * 0.04}s` }}>
              <FileCard file={file} />
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="pagination">
          <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
          {[...Array(Math.min(pagination.pages, 7))].map((_, i) => {
            const p = i + 1;
            return (
              <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
            );
          })}
          <button onClick={() => setPage(p => p + 1)} disabled={page === pagination.pages}>›</button>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
