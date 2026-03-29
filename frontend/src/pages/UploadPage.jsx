import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { uploadFile } from '../store/slices/filesSlice';
import toast from 'react-hot-toast';
import './UploadPage.scss';

const ACCEPTED = {
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  'video/*': ['.mp4', '.webm', '.mov'],
  'audio/*': ['.mp3', '.wav', '.ogg'],
  'application/pdf': ['.pdf'],
};

const UploadPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { uploading } = useSelector((state) => state.files);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', tags: '', isPublic: true });
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length > 0) {
      const err = rejected[0].errors[0];
      toast.error(err.code === 'file-too-large' ? 'File exceeds 50MB limit' : err.message);
      return;
    }
    if (accepted.length === 0) return;

    const f = accepted[0];
    setFile(f);
    setForm(prev => ({ ...prev, name: f.name.replace(/\.[^/.]+$/, '') }));

    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview({ type: 'image', src: e.target.result });
      reader.readAsDataURL(f);
    } else if (f.type.startsWith('video/')) {
      setPreview({ type: 'video', src: URL.createObjectURL(f) });
    } else if (f.type.startsWith('audio/')) {
      setPreview({ type: 'audio', src: URL.createObjectURL(f) });
    } else {
      setPreview({ type: 'pdf', name: f.name });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: 50 * 1024 * 1024,
    multiple: false,
    disabled: uploading,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error('Please select a file'); return; }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', form.name || file.name);
    formData.append('description', form.description);
    formData.append('tags', form.tags);
    formData.append('isPublic', form.isPublic);

    // Simulate progress
    const timer = setInterval(() => {
      setProgress(p => (p < 85 ? p + Math.random() * 10 : p));
    }, 300);

    try {
      await dispatch(uploadFile(formData)).unwrap();
      clearInterval(timer);
      setProgress(100);
      toast.success('File uploaded successfully! 🎉');
      setTimeout(() => navigate('/dashboard'), 800);
    } catch (err) {
      clearInterval(timer);
      setProgress(0);
      toast.error(err || 'Upload failed');
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setProgress(0);
    setForm({ name: '', description: '', tags: '', isPublic: true });
  };

  const formatSize = (bytes) => {
    const mb = bytes / 1024 / 1024;
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div className="upload-page">
      <div className="upload-page__header">
        <h1>Upload File</h1>
        <p>Images, videos, audio, and PDFs up to 50MB</p>
      </div>

      <div className="upload-page__content">
        {/* Drop Zone */}
        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? 'dropzone--active' : ''} ${file ? 'dropzone--filled' : ''}`}
        >
          <input {...getInputProps()} />

          {file ? (
            <div className="dropzone__preview">
              {preview?.type === 'image' && <img src={preview.src} alt="preview" />}
              {preview?.type === 'video' && <video src={preview.src} controls />}
              {preview?.type === 'audio' && (
                <div className="dropzone__audio">
                  <span>🎵</span>
                  <audio src={preview.src} controls />
                </div>
              )}
              {preview?.type === 'pdf' && (
                <div className="dropzone__pdf">
                  <span>📄</span>
                  <p>{preview.name}</p>
                </div>
              )}
              <button className="dropzone__clear btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); clearFile(); }}>
                ✕ Remove
              </button>
            </div>
          ) : (
            <div className="dropzone__idle">
              <div className="dropzone__icon">{isDragActive ? '📥' : '☁'}</div>
              <p className="dropzone__text">
                {isDragActive ? 'Drop it like it\'s hot' : 'Drag & drop your file here'}
              </p>
              <p className="dropzone__subtext">or click to browse</p>
              <div className="dropzone__types">
                {['JPG', 'PNG', 'MP4', 'MP3', 'PDF'].map(t => (
                  <span key={t} className="badge badge-violet">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Form */}
        <form className="upload-form" onSubmit={handleSubmit}>
          {file && (
            <div className="upload-form__file-info">
              <span className="upload-form__file-name">{file.name}</span>
              <span className="badge badge-teal">{formatSize(file.size)}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">Display Name</label>
            <input
              id="name"
              type="text"
              className="input"
              placeholder="Give your file a name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={255}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              className="input upload-form__textarea"
              placeholder="Optional description..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={500}
              rows={3}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
              {form.description.length}/500
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="tags">Tags</label>
            <input
              id="tags"
              type="text"
              className="input"
              placeholder="nature, landscape, travel (comma-separated)"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Helps with search & discovery
            </span>
          </div>

          <div className="upload-form__visibility">
            <label className="toggle-label">
              <span>Public</span>
              <div className={`toggle ${form.isPublic ? 'toggle--on' : ''}`} onClick={() => setForm({ ...form, isPublic: !form.isPublic })}>
                <div className="toggle__thumb" />
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {form.isPublic ? 'Visible to everyone' : 'Only visible to you'}
              </span>
            </label>
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="upload-progress">
              <div className="upload-progress__bar" style={{ width: `${progress}%` }} />
              <span>{Math.round(progress)}%</span>
            </div>
          )}

          <div className="upload-form__actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/dashboard')} disabled={uploading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-lg" disabled={!file || uploading}>
              {uploading
                ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Uploading…</>
                : '↑ Upload to Vault'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadPage;
