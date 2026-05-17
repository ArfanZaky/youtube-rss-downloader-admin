import { useMemo, useState } from 'react';

const permissions = [
  { id: 'dashboard.read', label: 'Dashboard', group: 'Core' },
  { id: 'downloads.manage', label: 'Downloads', group: 'Downloader' },
  { id: 'rss.manage', label: 'RSS Feeds', group: 'Automation' },
  { id: 'users.manage', label: 'Users', group: 'Access' },
  { id: 'roles.manage', label: 'Roles', group: 'Access' },
  { id: 'settings.manage', label: 'Settings', group: 'System' }
];

const initialRoles = [
  { id: 'owner', name: 'Owner', description: 'Full system access', permissions: permissions.map((item) => item.id) },
  { id: 'operator', name: 'Operator', description: 'Run downloader and manage RSS', permissions: ['dashboard.read', 'downloads.manage', 'rss.manage'] },
  { id: 'viewer', name: 'Viewer', description: 'Read-only access', permissions: ['dashboard.read'] }
];

const initialUsers = [
  { id: 1, username: 'admin', name: 'Admin', role: 'owner', status: 'Active', lastLogin: '2026-05-17 08:12' },
  { id: 2, username: 'editor', name: 'Feed Editor', role: 'operator', status: 'Active', lastLogin: '2026-05-16 19:40' },
  { id: 3, username: 'viewer', name: 'Read Only', role: 'viewer', status: 'Invited', lastLogin: '-' }
];

const feeds = [
  { id: 1, name: 'Tech Reviews', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC-tech', rule: '1080p mp4', status: 'Watching', lastCheck: '2 min ago' },
  { id: 2, name: 'Podcast Clips', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC-podcast', rule: 'audio mp3', status: 'Paused', lastCheck: '1 hour ago' },
  { id: 3, name: 'Tutorial Archive', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC-course', rule: '720p mp4', status: 'Watching', lastCheck: '9 min ago' }
];

const queue = [
  { id: 'Q-1042', title: 'Building a clean RSS worker', source: 'Tech Reviews', quality: '1080p', status: 'Downloading', progress: 64 },
  { id: 'Q-1041', title: 'Weekly creator news', source: 'Podcast Clips', quality: 'mp3', status: 'Queued', progress: 0 },
  { id: 'Q-1040', title: 'React admin menus from scratch', source: 'Tutorial Archive', quality: '720p', status: 'Done', progress: 100 }
];

const menu = [
  ['overview', 'Overview'],
  ['downloads', 'Downloads'],
  ['rss', 'RSS Feeds'],
  ['users', 'Users'],
  ['roles', 'Roles'],
  ['permissions', 'Permissions'],
  ['settings', 'Settings']
];

function PixelMark() {
  return (
    <div className="pixel-mark" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

function Login({ onLogin }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    if (username === 'admin' && password === 'admin123') {
      onLogin(initialUsers[0]);
      return;
    }
    setError('Username atau password salah.');
  };

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand-row">
          <PixelMark />
          <div>
            <h1>YT RSS Admin</h1>
            <p>Downloader console</p>
          </div>
        </div>
        <form onSubmit={submit} className="login-form">
          <label>
            Username
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
          </label>
          <label>
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
          </label>
          {error ? <p className="error-line">{error}</p> : null}
          <button type="submit">Login</button>
        </form>
      </section>
    </main>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProgressBar({ value }) {
  return (
    <div className="progress" aria-label={`${value}%`}>
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

function Overview() {
  return (
    <div className="view-stack">
      <div className="stats-grid">
        <Stat label="Active feeds" value="2" />
        <Stat label="Queue items" value="3" />
        <Stat label="Storage used" value="284 GB" />
        <Stat label="Worker state" value="Online" />
      </div>
      <section className="panel">
        <div className="panel-head">
          <h2>Download Queue</h2>
          <button type="button">Add URL</button>
        </div>
        <QueueTable />
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>RSS Watchlist</h2>
          <button type="button">Add Feed</button>
        </div>
        <FeedTable />
      </section>
    </div>
  );
}

function QueueTable() {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Source</th>
            <th>Quality</th>
            <th>Status</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
          {queue.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.title}</td>
              <td>{item.source}</td>
              <td>{item.quality}</td>
              <td>{item.status}</td>
              <td>
                <ProgressBar value={item.progress} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeedTable() {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Feed URL</th>
            <th>Rule</th>
            <th>Status</th>
            <th>Last Check</th>
          </tr>
        </thead>
        <tbody>
          {feeds.map((feed) => (
            <tr key={feed.id}>
              <td>{feed.name}</td>
              <td className="mono-cell">{feed.url}</td>
              <td>{feed.rule}</td>
              <td>{feed.status}</td>
              <td>{feed.lastCheck}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Users({ roles }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Users</h2>
        <button type="button">Invite User</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
            </tr>
          </thead>
          <tbody>
            {initialUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.name}</td>
                <td>{roles.find((role) => role.id === user.role)?.name || user.role}</td>
                <td>{user.status}</td>
                <td>{user.lastLogin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Roles({ roles }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Roles</h2>
        <button type="button">Create Role</button>
      </div>
      <div className="role-grid">
        {roles.map((role) => (
          <article className="role-card" key={role.id}>
            <h3>{role.name}</h3>
            <p>{role.description}</p>
            <div className="permission-list">
              {role.permissions.map((permissionID) => (
                <span key={permissionID}>{permissions.find((item) => item.id === permissionID)?.label || permissionID}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PermissionMatrix({ roles, setRoles }) {
  const togglePermission = (roleID, permissionID) => {
    setRoles((current) =>
      current.map((role) => {
        if (role.id !== roleID) return role;
        const hasPermission = role.permissions.includes(permissionID);
        return {
          ...role,
          permissions: hasPermission ? role.permissions.filter((item) => item !== permissionID) : [...role.permissions, permissionID]
        };
      })
    );
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Permissions</h2>
        <button type="button">Save Matrix</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Permission</th>
              <th>Group</th>
              {roles.map((role) => (
                <th key={role.id}>{role.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((permission) => (
              <tr key={permission.id}>
                <td>{permission.label}</td>
                <td>{permission.group}</td>
                {roles.map((role) => (
                  <td key={`${role.id}-${permission.id}`}>
                    <input
                      type="checkbox"
                      checked={role.permissions.includes(permission.id)}
                      onChange={() => togglePermission(role.id, permission.id)}
                      aria-label={`${role.name} ${permission.label}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Settings() {
  return (
    <section className="panel settings-grid">
      <div>
        <h2>Downloader Settings</h2>
        <label>
          Download path
          <input defaultValue="/srv/media/youtube" />
        </label>
        <label>
          Default quality
          <select defaultValue="1080p">
            <option>1080p</option>
            <option>720p</option>
            <option>audio only</option>
          </select>
        </label>
      </div>
      <div>
        <h2>RSS Scheduler</h2>
        <label>
          Poll interval
          <select defaultValue="15">
            <option value="5">5 minutes</option>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
          </select>
        </label>
        <label>
          Concurrent downloads
          <input type="number" defaultValue="2" min="1" max="8" />
        </label>
      </div>
    </section>
  );
}

export default function App() {
  const [sessionUser, setSessionUser] = useState(null);
  const [active, setActive] = useState('overview');
  const [roles, setRoles] = useState(initialRoles);

  const activeTitle = useMemo(() => menu.find(([id]) => id === active)?.[1] || 'Overview', [active]);

  if (!sessionUser) {
    return <Login onLogin={setSessionUser} />;
  }

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <PixelMark />
          <div>
            <h1>YT RSS Admin</h1>
            <p>{sessionUser.name}</p>
          </div>
        </div>
        <nav>
          {menu.map(([id, label]) => (
            <button key={id} type="button" className={active === id ? 'active' : ''} onClick={() => setActive(id)}>
              {label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="content">
        <header className="topbar">
          <div>
            <h2>{activeTitle}</h2>
            <p>Role: Owner · Permission: Full access</p>
          </div>
          <button type="button" onClick={() => setSessionUser(null)}>
            Logout
          </button>
        </header>
        {active === 'overview' ? <Overview /> : null}
        {active === 'downloads' ? (
          <section className="panel">
            <div className="panel-head">
              <h2>Downloads</h2>
              <button type="button">Queue URL</button>
            </div>
            <QueueTable />
          </section>
        ) : null}
        {active === 'rss' ? (
          <section className="panel">
            <div className="panel-head">
              <h2>RSS Feeds</h2>
              <button type="button">Add Feed</button>
            </div>
            <FeedTable />
          </section>
        ) : null}
        {active === 'users' ? <Users roles={roles} /> : null}
        {active === 'roles' ? <Roles roles={roles} /> : null}
        {active === 'permissions' ? <PermissionMatrix roles={roles} setRoles={setRoles} /> : null}
        {active === 'settings' ? <Settings /> : null}
      </main>
    </div>
  );
}
