import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/users', label: 'Users', icon: '👥' },
  { to: '/sms', label: 'SMS Tasks', icon: '📱' },
  { to: '/sms/logs', label: 'SMS Logs', icon: '📋' },
  { to: '/withdrawals', label: 'Withdrawals', icon: '💰' },
  { to: '/devices', label: 'Devices', icon: '📲' },
  { to: '/transactions', label: 'Transactions', icon: '💳' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col min-h-screen">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-indigo-400">SMSPaisa</h1>
        <p className="text-xs text-slate-400 mt-1">Admin Panel</p>
      </div>
      <nav className="flex-1 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
