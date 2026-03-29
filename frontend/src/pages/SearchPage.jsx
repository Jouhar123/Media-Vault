import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { searchFiles, fetchSuggestions, setQuery, setFilter, clearSearch, clearSuggestions } from '../store/slices/searchSlice';
import FileCard from '../components/FileCard/FileCard';
import './SearchPage.scss';

const FILE_TYPES = ['', 'image', 'video', 'audio', 'pdf'];
const TYPE_LABELS = { '': 'All Types', image: '🖼 Images', video: '🎬 Videos', audio: '🎵 Audio', pdf: '📄 PDFs' };
const SORT_OPTIONS = [
  { value: 'relevance', label: '⭐ Relevance' },
  { value: 'date',      label: '🕐 Date' },
  { value: 'views',     label: '👁 Views' },
  { value: 'name',      label: '🔤 Name' },
  { value: 'size',      label: '📦 Size' },
];

const SearchPage = () => {
  const dispatch = useDispatch();
  const { results, suggestions, pagination, filters, loading, hasSearched, query } = useSelector((s) => s.search);
  const [localQuery, setLocalQuery] = useState(query);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const inputRef = useRef(null);
  const suggestTimer = useRef(null);

  // Debounced suggestions
  const handleQueryChange = (val) => {
    setLocalQuery(val);
    clearTimeout(suggestTimer.current);
    if (val.length >= 2) {
      suggestTimer.current = setTimeout(() => dispatch(fetchSuggestions(val)), 300);
    } else {
      dispatch(clearSuggestions());
    }
    setShowSuggestions(true);
  };

  const runSearch = useCallback((p = 1) => {
    if (!localQuery.trim() && !filters.fileType && !filters.tags) return;
    dispatch(setQuery(localQuery));
    dispatch(searchFiles({
      query: localQuery.trim(),
      ...filters,
      page: p,
      limit: 12,
    }));
    setShowSuggestions(false);
    setPage(p);
  }, [dispatch, localQuery, filters]);

  const handleSubmit = (e) => { e.preventDefault(); runSearch(1); };

  const handleSuggestionClick = (val) => {
    setLocalQuery(val);
    dispatch(setQuery(val));
    setShowSuggestions(false);
    dispatch(searchFiles({ query: val, ...filters, page: 1, limit: 12 }));
  };

  const handleFilterChange = (key, val) => {
    dispatch(setFilter({ [key]: val }));
  };

  // Re-run when filters change (if already searched)
  useEffect(() => {
    if (hasSearched) runSearch(1);
  }, [filters]);

  useEffect(() => {
    return () => { dispatch(clearSearch()); };
  }, [dispatch]);

  return (
    <div className="search-page">
      <div className="search-page__header">
        <h1>Search Files</h1>
        <p>Find anything in the vault by name, tag, or description</p>
      </div>

      {/* Search Bar */}
      <form className="search-bar-wrap" onSubmit={handleSubmit}>
        <div className="search-bar" ref={inputRef}>
          <span className="search-bar__icon">⌕</span>
          <input
            type="text"
            className="search-bar__input"
            placeholder="Search by name, tag, description…"
            value={localQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => setShowSuggestions(suggestions.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            autoComplete="off"
          />
          {localQuery && (
            <button type="button" className="search-bar__clear" onClick={() => { setLocalQuery(''); dispatch(clearSearch()); }}>✕</button>
          )}

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions">
              {suggestions.map((s, i) => (
                <button key={i} type="button" className="suggestions__item" onClick={() => handleSuggestionClick(s.value)}>
                  <span className="suggestions__type-icon">{s.type === 'tag' ? '#' : '◫'}</span>
                  <span>{s.value}</span>
                  <span className="suggestions__kind">{s.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : 'Search'}
        </button>

        <button
          type="button"
          className={`btn btn-secondary ${showFilters ? 'btn--active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          ⚙ Filters
        </button>
      </form>

      {/* Filters Panel */}
      {showFilters && (
        <div className="filters-panel animate-fadeInUp">
          <div className="filters-panel__row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>File Type</label>
              <div className="filter-tabs" style={{ marginTop: 6 }}>
                {FILE_TYPES.map(t => (
                  <button
                    key={t}
                    type="button"
                    className={`filter-tab ${filters.fileType === t ? 'filter-tab--active' : ''}`}
                    onClick={() => handleFilterChange('fileType', t)}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Sort By</label>
              <select
                className="sort-select"
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                style={{ marginTop: 6 }}
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Order</label>
              <select
                className="sort-select"
                value={filters.order}
                onChange={(e) => handleFilterChange('order', e.target.value)}
                style={{ marginTop: 6 }}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>

          <div className="filters-panel__row">
            <div className="form-group">
              <label>From Date</label>
              <input type="date" className="input" value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)} style={{ marginTop: 6 }} />
            </div>
            <div className="form-group">
              <label>To Date</label>
              <input type="date" className="input" value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)} style={{ marginTop: 6 }} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Tags (comma-separated)</label>
              <input
                type="text"
                className="input"
                placeholder="nature, travel, art"
                value={filters.tags}
                onChange={(e) => handleFilterChange('tags', e.target.value)}
                style={{ marginTop: 6 }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {!hasSearched && (
        <div className="search-page__prompt">
          <div className="search-page__prompt-icon">🔍</div>
          <h3>Start searching</h3>
          <p>Type a keyword, tag, or description to find files across the vault</p>
        </div>
      )}

      {hasSearched && (
        <>
          <div className="search-page__result-header">
            <p className="search-page__count">
              {pagination.total} result{pagination.total !== 1 ? 's' : ''}
              {localQuery && <> for <span>"{localQuery}"</span></>}
            </p>
          </div>

          {loading ? (
            <div className="file-grid">
              {[...Array(6)].map((_, i) => <div key={i} className="skeleton-card" style={{ animationDelay: `${i * 0.05}s` }} />)}
            </div>
          ) : results.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🕳</span>
              <h3>No results found</h3>
              <p>Try different keywords, check your filters, or browse the dashboard</p>
            </div>
          ) : (
            <div className="file-grid">
              {results.map((file, i) => (
                <div key={file._id} className="animate-fadeInUp" style={{ animationDelay: `${i * 0.04}s` }}>
                  <FileCard file={file} />
                </div>
              ))}
            </div>
          )}

          {pagination.pages > 1 && (
            <div className="pagination">
              <button onClick={() => runSearch(page - 1)} disabled={page === 1}>‹</button>
              {[...Array(Math.min(pagination.pages, 7))].map((_, i) => {
                const p = i + 1;
                return <button key={p} className={page === p ? 'active' : ''} onClick={() => runSearch(p)}>{p}</button>;
              })}
              <button onClick={() => runSearch(page + 1)} disabled={page === pagination.pages}>›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SearchPage;
