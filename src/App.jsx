import { useEffect, useMemo, useState } from 'react';

const sessionKey = 'yt-rss-admin.session.v1';
const settingsKey = 'yt-rss-admin.settings.v1';
const feedsKey = 'yt-rss-admin.feeds.v1';

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

const initialFeeds = [
  { id: 1, name: 'Tech Reviews', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC-tech', rule: '1080p mp4', status: 'Watching', lastCheck: '2 min ago' },
  { id: 2, name: 'Podcast Clips', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC-podcast', rule: 'audio mp3', status: 'Paused', lastCheck: '1 hour ago' },
  { id: 3, name: 'Tutorial Archive', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC-course', rule: '720p mp4', status: 'Watching', lastCheck: '9 min ago' }
];

const queue = [
  { id: 'Q-1042', title: 'Building a clean RSS worker', source: 'Tech Reviews', quality: '1080p', status: 'Downloading', progress: 64 },
  { id: 'Q-1041', title: 'Weekly creator news', source: 'Podcast Clips', quality: 'mp3', status: 'Queued', progress: 0 },
  { id: 'Q-1040', title: 'React admin menus from scratch', source: 'Tutorial Archive', quality: '720p', status: 'Done', progress: 100 }
];

const menuGroups = [
  {
    id: 'main',
    label: 'Main',
    children: [
      ['overview', 'Overview'],
      ['downloads', 'Downloads'],
      ['rss', 'RSS Feeds']
    ]
  },
  {
    id: 'administrator',
    label: 'Administrator',
    children: [
      ['users', 'Users'],
      ['roles', 'Roles'],
      ['permissions', 'Permissions'],
      ['settings', 'Settings']
    ]
  }
];

const flatMenu = menuGroups.flatMap((group) => group.children);

const defaultSettings = {
  downloadPath: '/srv/media/youtube',
  defaultQuality: '1080p',
  filenameTemplate: '{channel}/{published_at}-{title}',
  rssPollInterval: '15',
  concurrentDownloads: 2,
  archiveAfterDownload: true,
  skipExisting: true,
  webhookURL: '',
  userAgent: 'YT-RSS-Downloader/0.1'
};

function loadJSON(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function loadArray(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

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

function FeedTable({ feeds }) {
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

function AddFeedForm({ onAdd, onCancel }) {
  const [draft, setDraft] = useState({
    name: '',
    url: '',
    rule: '1080p mp4',
    status: 'Watching'
  });
  const [error, setError] = useState('');

  const update = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError('');
  };

  const submit = (event) => {
    event.preventDefault();
    const name = draft.name.trim();
    const url = draft.url.trim();
    if (!name || !url) {
      setError('Name dan Feed URL wajib diisi.');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('Feed URL harus dimulai dengan http:// atau https://.');
      return;
    }
    onAdd({
      id: Date.now(),
      name,
      url,
      rule: draft.rule,
      status: draft.status,
      lastCheck: 'Not checked yet'
    });
    setDraft({ name: '', url: '', rule: '1080p mp4', status: 'Watching' });
  };

  return (
    <form className="panel form-panel" onSubmit={submit}>
      <div className="panel-head">
        <h2>Add RSS Feed</h2>
        <div className="button-row">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit">Add</button>
        </div>
      </div>
      {error ? <p className="error-line">{error}</p> : null}
      <div className="form-grid">
        <label>
          Name
          <input value={draft.name} onChange={(event) => update('name', event.target.value)} placeholder="Channel or playlist name" />
        </label>
        <label>
          Feed URL
          <input value={draft.url} onChange={(event) => update('url', event.target.value)} placeholder="https://www.youtube.com/feeds/videos.xml?channel_id=..." />
        </label>
        <label>
          Rule
          <select value={draft.rule} onChange={(event) => update('rule', event.target.value)}>
            <option>1080p mp4</option>
            <option>720p mp4</option>
            <option>480p mp4</option>
            <option>audio mp3</option>
          </select>
        </label>
        <label>
          Status
          <select value={draft.status} onChange={(event) => update('status', event.target.value)}>
            <option>Watching</option>
            <option>Paused</option>
          </select>
        </label>
      </div>
    </form>
  );
}

function Overview({ feeds, onOpenAddFeed }) {
  const activeFeedCount = feeds.filter((feed) => feed.status === 'Watching').length;
  return (
    <div className="view-stack">
      <div className="stats-grid">
        <Stat label="Active feeds" value={String(activeFeedCount)} />
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
          <button type="button" onClick={onOpenAddFeed}>
            Add Feed
          </button>
        </div>
        <FeedTable feeds={feeds} />
      </section>
    </div>
  );
}

function RSSFeedsView({ feeds, showAddFeed, onOpenAddFeed, onCancelAddFeed, onAddFeed }) {
  return (
    <div className="view-stack">
      {showAddFeed ? <AddFeedForm onAdd={onAddFeed} onCancel={onCancelAddFeed} /> : null}
      <section className="panel">
        <div className="panel-head">
          <h2>RSS Feeds</h2>
          <button type="button" onClick={onOpenAddFeed}>
            Add Feed
          </button>
        </div>
        <FeedTable feeds={feeds} />
      </section>
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

function Settings({ settings, setSettings }) {
  const [draft, setDraft] = useState(settings);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const update = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setNotice('');
  };

  const save = (event) => {
    event.preventDefault();
    const normalized = {
      ...draft,
      concurrentDownloads: Math.max(1, Math.min(8, Number(draft.concurrentDownloads) || 1))
    };
    setSettings(normalized);
    saveJSON(settingsKey, normalized);
    setNotice('Settings saved.');
  };

  const reset = () => {
    setDraft(defaultSettings);
    setSettings(defaultSettings);
    saveJSON(settingsKey, defaultSettings);
    setNotice('Settings reset.');
  };

  return (
    <form className="panel settings-form" onSubmit={save}>
      <div className="panel-head">
        <h2>Settings</h2>
        <div className="button-row">
          <button type="button" onClick={reset}>
            Reset
          </button>
          <button type="submit">Save</button>
        </div>
      </div>
      {notice ? <p className="notice-line">{notice}</p> : null}
      <div className="settings-grid">
        <section>
          <h3>Downloader</h3>
          <label>
            Download path
            <input value={draft.downloadPath} onChange={(event) => update('downloadPath', event.target.value)} />
          </label>
          <label>
            Default quality
            <select value={draft.defaultQuality} onChange={(event) => update('defaultQuality', event.target.value)}>
              <option>1080p</option>
              <option>720p</option>
              <option>480p</option>
              <option>audio only</option>
            </select>
          </label>
          <label>
            Filename template
            <input value={draft.filenameTemplate} onChange={(event) => update('filenameTemplate', event.target.value)} />
          </label>
        </section>
        <section>
          <h3>RSS Scheduler</h3>
          <label>
            Poll interval
            <select value={draft.rssPollInterval} onChange={(event) => update('rssPollInterval', event.target.value)}>
              <option value="5">5 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">60 minutes</option>
            </select>
          </label>
          <label>
            Concurrent downloads
            <input type="number" value={draft.concurrentDownloads} min="1" max="8" onChange={(event) => update('concurrentDownloads', event.target.value)} />
          </label>
          <label>
            Webhook URL
            <input value={draft.webhookURL} onChange={(event) => update('webhookURL', event.target.value)} placeholder="https://example.com/hook" />
          </label>
        </section>
        <section>
          <h3>Rules</h3>
          <label className="check-row">
            <input type="checkbox" checked={draft.archiveAfterDownload} onChange={(event) => update('archiveAfterDownload', event.target.checked)} />
            Archive video ID after download
          </label>
          <label className="check-row">
            <input type="checkbox" checked={draft.skipExisting} onChange={(event) => update('skipExisting', event.target.checked)} />
            Skip existing files
          </label>
        </section>
        <section>
          <h3>Client</h3>
          <label>
            User agent
            <input value={draft.userAgent} onChange={(event) => update('userAgent', event.target.value)} />
          </label>
        </section>
      </div>
    </form>
  );
}

function usePersistentSession() {
  const [sessionUser, setSessionUser] = useState(() => loadJSON(sessionKey, null));

  const login = (user) => {
    setSessionUser(user);
    saveJSON(sessionKey, user);
  };

  const logout = () => {
    setSessionUser(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(sessionKey);
    }
  };

  return { sessionUser, login, logout };
}

export default function App() {
  const { sessionUser, login, logout } = usePersistentSession();
  const [active, setActive] = useState('overview');
  const [roles, setRoles] = useState(initialRoles);
  const [settings, setSettings] = useState(() => loadJSON(settingsKey, defaultSettings));
  const [feeds, setFeeds] = useState(() => loadArray(feedsKey, initialFeeds));
  const [showAddFeed, setShowAddFeed] = useState(false);

  const activeTitle = useMemo(() => flatMenu.find(([id]) => id === active)?.[1] || 'Overview', [active]);

  const openAddFeed = () => {
    setActive('rss');
    setShowAddFeed(true);
  };

  const addFeed = (feed) => {
    setFeeds((current) => {
      const nextFeeds = [feed, ...current];
      saveJSON(feedsKey, nextFeeds);
      return nextFeeds;
    });
    setShowAddFeed(false);
  };

  if (!sessionUser) {
    return <Login onLogin={login} />;
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
          {menuGroups.map((group) => (
            <div className="nav-group" key={group.id}>
              <p>{group.label}</p>
              {group.children.map(([id, label]) => (
                <button key={id} type="button" className={active === id ? 'active' : ''} onClick={() => setActive(id)}>
                  {label}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <main className="content">
        <header className="topbar">
          <div>
            <h2>{activeTitle}</h2>
            <p>Role: Owner - Permission: Full access</p>
          </div>
          <button type="button" onClick={logout}>
            Logout
          </button>
        </header>
        {active === 'overview' ? <Overview feeds={feeds} onOpenAddFeed={openAddFeed} /> : null}
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
          <RSSFeedsView
            feeds={feeds}
            showAddFeed={showAddFeed}
            onOpenAddFeed={openAddFeed}
            onCancelAddFeed={() => setShowAddFeed(false)}
            onAddFeed={addFeed}
          />
        ) : null}
        {active === 'users' ? <Users roles={roles} /> : null}
        {active === 'roles' ? <Roles roles={roles} /> : null}
        {active === 'permissions' ? <PermissionMatrix roles={roles} setRoles={setRoles} /> : null}
        {active === 'settings' ? <Settings settings={settings} setSettings={setSettings} /> : null}
      </main>
    </div>
  );
}
