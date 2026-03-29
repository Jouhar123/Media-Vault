import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { deleteFile } from '../../store/slices/filesSlice';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import './FileCard.scss';

const TYPE_ICONS = { image: '🖼', video: '🎬', audio: '🎵', pdf: '📄' };
const TYPE_COLORS = { image: 'violet', video: 'teal', audio: 'amber', pdf: 'rose' };

const formatSize = (bytes) => {
  if (!bytes) return '—';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

const FileCard = ({ file, showActions = false }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const isOwner = user?._id === (file.uploader?._id || file.uploader);

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${file.name}"? This cannot be undone.`)) return;
    try {
      await dispatch(deleteFile(file._id)).unwrap();
      toast.success('File deleted');
    } catch (err) {
      toast.error(err || 'Delete failed');
    }
  };

  const renderPreview = () => {
    if (file.thumbnailUrl || (file.fileType === 'image' && file.cloudinaryUrl)) {
      return (
        <img
          src={file.thumbnailUrl || file.cloudinaryUrl}
          alt={file.name}
          loading="lazy"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      );
    }
    return <span className="file-card__placeholder">{TYPE_ICONS[file.fileType]}</span>;
  };

  return (
    <div className="file-card" onClick={() => navigate(`/files/${file._id}`)}>
      <div className={`file-card__preview file-card__preview--${file.fileType}`}>
        {renderPreview()}
        <span className={`file-card__type-badge badge badge-${TYPE_COLORS[file.fileType]}`}>
          {TYPE_ICONS[file.fileType]} {file.fileType}
        </span>
      </div>

      <div className="file-card__body">
        <h3 className="file-card__name" title={file.name}>{file.name}</h3>

        {file.tags?.length > 0 && (
          <div className="file-card__tags">
            {file.tags.slice(0, 3).map(tag => (
              <span key={tag} className="file-card__tag">#{tag}</span>
            ))}
            {file.tags.length > 3 && <span className="file-card__tag">+{file.tags.length - 3}</span>}
          </div>
        )}

        <div className="file-card__meta">
          <span className="file-card__meta-item">
            👁 {file.viewCount || 0}
          </span>
          <span className="file-card__meta-item">
            {formatSize(file.size)}
          </span>
          <span className="file-card__meta-item">
            {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
          </span>
        </div>

        {file.uploader?.username && (
          <p className="file-card__uploader">by {file.uploader.username}</p>
        )}
      </div>

      {showActions && isOwner && (
        <div className="file-card__actions">
          <button
            className="btn btn-ghost btn-sm btn-icon"
            onClick={(e) => { e.stopPropagation(); navigate(`/files/${file._id}`); }}
            title="View"
          >✎</button>
          <button
            className="btn btn-danger btn-sm btn-icon"
            onClick={handleDelete}
            title="Delete"
          >✕</button>
        </div>
      )}
    </div>
  );
};

export default FileCard;
