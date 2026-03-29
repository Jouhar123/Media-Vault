import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import toast from 'react-hot-toast';
import './Layout.scss';

const NAV_ITEMS = [
  { to: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { to: '/search',    icon: '⌕', label: 'Search' },
  { to: '/upload',    icon: '↑', label: 'Upload' },
  { to: '/my-files',  icon: '◫', label: 'My Files' },
];

const Layout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const notifications = useSelector((state) => state.ui.notifications);

  const handleLogout = async () => {
    await dispatch(logout());
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__logo">⬡</span>
          <span className="sidebar__name">MediaVault</span>
        </div>

        <nav className="sidebar__nav">
          {NAV_ITEMS.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
            >
              <span className="sidebar__link-icon">{icon}</span>
              <span className="sidebar__link-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        {notifications.length > 0 && (
          <div className="sidebar__notifications">
            <p className="sidebar__section-title">Recent Activity</p>
            {notifications.slice(0, 3).map(n => (
              <div key={n.id} className="sidebar__notif">
                <span>{n.type === 'success' ? '✓' : '•'}</span>
                <span>{n.message}</span>
              </div>
            ))}
          </div>
        )}

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__avatar">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="sidebar__user-info">
              <p className="sidebar__user-name">{user?.username}</p>
              <p className="sidebar__user-email">{user?.email}</p>
            </div>
          </div>
          <button className="sidebar__logout btn btn-ghost btn-sm" onClick={handleLogout}>
            ⏻
          </button>
        </div>
      </aside>

      <main className="layout__main">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
