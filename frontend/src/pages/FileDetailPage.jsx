import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFile, updateFile, deleteFile, clearCurrentFile } from '../store/slices/filesSlice';
import { formatDistanceToNow, format } from 'date-fns';
import api from '../utils/api';
import toast from 'react-hot-toast';
import './FileDetailPage.scss';

const TYPE_ICONS = { image: '🖼', video: '🎬', audio: '🎵', pdf: '📄' };

const FileDetailPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentFile: file, loading } = useSelector((s) => s.files);
  const { user } = useSelector((s) => s.auth);
  const isOwner = file && user && (file.uploader?._id === user._id || file.uploader === user._id);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', tags: '', isPublic: true });

  useEffect(() => {
    dispatch(fetchFile(id));
    return () => dispatch(clearCurrentFile());
  }, [id, dispatch]);

  useEffect(() => {
    if (file) {
      setEditForm({
        name: file.name,
        description: file.description || '',
        tags: file.tags?.join(', ') || '',
        isPublic: file.isPublic,
      });
    }
  }, [file]);

  const handleSave = async () => {
    try {
      await dispatch(updateFile({
        id: file._id,
        data: {
          name: editForm.name,
          description: editForm.description,
          tags: editForm.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
          isPublic: editForm.isPublic,
        },
      })).unwrap();
      setEditing(false);
      toast.success('File updated!');
    } catch (err) {
      toast.error(err || 'Update failed');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${file.name}"? This cannot be undone.`)) return;
    try {
      await dispatch(deleteFile(file._id)).unwrap();
      toast.success('File deleted');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err || 'Delete failed');
    }
  };



  const handleDownload = async () => {
    try {
      const res = await api.get(`/files/${file._id}/download`);
      window.open(res.data.data.downloadUrl, '_blank');
    } catch (err) {
      toast.error('Download failed');
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    const mb = bytes / 1024 / 1024;
    return mb >= 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
  };

  if (loading || !file) {
    return (
      <div className="file-detail-loading">
        <div className="spinner" style={{ width: 48, height: 48, borderWidth: 3 }} />
      </div>
    );
  }

  return (
    <div className="file-detail">
      {/* Back */}
      <button className="file-detail__back btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="file-detail__layout">
        {/* Preview */}
        <div className="file-detail__preview-wrap">
          <div className={`file-detail__preview file-detail__preview--${file.fileType}`}>
            {file.fileType === 'image' && (
              <img src={file.cloudinaryUrl} alt={file.name} />
            )}
            {file.fileType === 'video' && (
              <video src={file.cloudinaryUrl} controls poster={file.thumbnailUrl} />
            )}
            {file.fileType === 'audio' && (
              <div className="file-detail__audio">
                <span>{TYPE_ICONS.audio}</span>
                <h3>{file.name}</h3>
                <audio src={file.cloudinaryUrl} controls />
              </div>
            )}
            {file.fileType === 'pdf' && (
              <div className="file-detail__pdf">
                <span>📄</span>
                <p>{file.name}</p>
                <a href={file.cloudinaryUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
                  Open PDF
                </a>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="file-detail__actions">
            <button className="btn btn-secondary" onClick={handleDownload}>
              ↓ Download
            </button>
            {isOwner && !editing && (
              <button className="btn btn-secondary" onClick={() => setEditing(true)}>
                ✎ Edit
              </button>
            )}
            {isOwner && (
              <button className="btn btn-danger" onClick={handleDelete}>
                ✕ Delete
              </button>
            )}
          </div>
        </div>

        {/* Info Panel */}
        <div className="file-detail__info">
          {editing ? (
            <div className="file-detail__edit-form">
              <h2>Edit File</h2>

              <div className="form-group">
                <label>Name</label>
                <input type="text" className="input" value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea className="input" rows={4} value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  style={{ resize: 'vertical' }} />
              </div>

              <div className="form-group">
                <label>Tags (comma-separated)</label>
                <input type="text" className="input" value={editForm.tags}
                  onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} />
              </div>

              <div className="file-detail__visibility">
                <label className="toggle-label">
                  <span>Public</span>
                  <div className={`toggle ${editForm.isPublic ? 'toggle--on' : ''}`}
                    onClick={() => setEditForm({ ...editForm, isPublic: !editForm.isPublic })}>
                    <div className="toggle__thumb" />
                  </div>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
              </div>
            </div>
          ) : (
            <>
              <div className="file-detail__title-row">
                <h1 className="file-detail__name">{file.name}</h1>
                <span className={`badge badge-${file.fileType === 'image' ? 'violet' : file.fileType === 'video' ? 'teal' : file.fileType === 'audio' ? 'amber' : 'rose'}`}>
                  {TYPE_ICONS[file.fileType]} {file.fileType}
                </span>
              </div>

              {file.description && (
                <p className="file-detail__description">{file.description}</p>
              )}

              {/* Tags */}
              {file.tags?.length > 0 && (
                <div className="file-detail__tags">
                  {file.tags.map(tag => (
                    <span key={tag} className="file-detail__tag">#{tag}</span>
                  ))}
                </div>
              )}

              {/* Metadata */}
              <div className="file-detail__meta">
                <div className="meta-row">
                  <span className="meta-label">Uploaded by</span>
                  <span className="meta-value">{file.uploader?.username || '—'}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Uploaded</span>
                  <span className="meta-value">
                    {format(new Date(file.createdAt), 'MMM d, yyyy')}
                    <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                      ({formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })})
                    </span>
                  </span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">File size</span>
                  <span className="meta-value meta-value--mono">{formatSize(file.size)}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Type</span>
                  <span className="meta-value meta-value--mono">{file.mimeType}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Views</span>
                  <span className="meta-value meta-value--mono">👁 {file.viewCount}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Downloads</span>
                  <span className="meta-value meta-value--mono">↓ {file.downloadCount || 0}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Visibility</span>
                  <span className={`badge ${file.isPublic ? 'badge-emerald' : 'badge-amber'}`}>
                    {file.isPublic ? '🌐 Public' : '🔒 Private'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileDetailPage;
