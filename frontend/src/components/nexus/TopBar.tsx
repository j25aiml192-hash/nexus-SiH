import React, { useState } from 'react';
import { Search, Bell, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  onSearch?: (query: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onSearch }) => {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      if (onSearch) {
        onSearch(searchValue);
      } else {
        navigate(`/complaints?search=${encodeURIComponent(searchValue.trim())}`);
      }
    }
  };

  return (
    <header className="nexus-topbar">
      <div className="nexus-topbar-left">
        <form onSubmit={handleSearchSubmit} className="nexus-topbar-search-form">
          <div className="nexus-topbar-search-wrapper">
            <Search size={16} className="nexus-search-icon" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search complaint ID, account ID or officer..."
              className="nexus-topbar-search-input"
            />
            <div className="nexus-search-shortcut">
              <span>⌘</span> K
            </div>
          </div>
        </form>
      </div>

      <div className="nexus-topbar-right">
        {/* Notifications */}
        <button
          className="nexus-topbar-icon-btn"
          title="5 unread notifications"
          onClick={() => navigate('/alerts')}
        >
          <Bell size={18} />
          <span className="nexus-notif-badge">5</span>
        </button>

        {/* User Profile */}
        <div className="nexus-user-pill">
          <div className="nexus-user-avatar">TN</div>
          <div className="nexus-user-info">
            <span className="nexus-user-name">Tanya Mishra</span>
            <span className="nexus-user-role">Analyst</span>
          </div>
          <ChevronDown size={14} className="nexus-user-chevron" />
        </div>
      </div>
    </header>
  );
};
