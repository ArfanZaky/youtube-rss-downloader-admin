import { useEffect, useMemo, useState } from 'react';

const sessionKey = 'yt-rss-admin.session.v1';
const settingsKey = 'yt-rss-admin.settings.v1';
const feedsKey = 'yt-rss-admin.feeds.v1';
const downloadsKey = 'yt-rss-admin.downloads.v1';

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
  { id: 1, name: 'Tech Reviews', url: 'https://www.youtube.com/@techreviews', rule: '1080p mp4', status: 'Watching', lastCheck: '2 min ago' },
  { id: 2, name: 'Podcast Clips', url: 'https://www.youtube.com/@podcastclips', rule: 'audio mp3', status: 'Paused', lastCheck: '1 hour ago' },
  { id: 3, name: 'Tutorial Archive', url: 'https://www.youtube.com/@tutorialarchive', rule: '720p mp4', status: 'Watching', lastCheck: '9 min ago' }
];

const initialDownloads = [
  { id: 'Q-1042', title: 'Building a clean RSS worker', source: 'Tech Reviews', quality: '1080p', status: 'Downloading', progress: 64 },
  { id: 'Q-1041', title: 'Weekly creator news', source: 'Podcast Clips', quality: 'mp3', status: 'Queued', progress: 0 },
  { id: 'Q-1040', title: 'React admin menus from scratch', source: 'Tutorial Archive', quality: '720p', status: 'Done', progress: 100 }
];

const channelURLTypes = [
  { id: 'videos', label: 'Videos', path: 'videos' },
  { id: 'shorts', label: 'Shorts', path: 'shorts' },
  { id: 'live', label: 'Live', path: 'streams' }
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
    id: 'channel',
    label: 'Channel',
    children: [
      ['channel-watchlist', 'Watchlist Channel'],
      ['channel-list', 'List Channel']
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

function normalizeChannelRows(rows) {
  return rows.map((row) => {
    const url = String(row.url || '');
    const channelID = url.match(/[?&]channel_id=([^&]+)/)?.[1];
    if (!channelID) return row;
    return { ...row, url: `https://www.youtube.com/channel/${channelID}` };
  });
}

function slugify(value) {
  return String(value || 'channel').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 10) || 'channel';
}

function buildChannelVideoRows(feed, typeID) {
  const type = channelURLTypes.find((item) => item.id === typeID) || channelURLTypes[0];
  const slug = slugify(feed?.name);
  const prefix = type.id === 'shorts' ? 'shorts' : 'watch';
  const rows = type.id === 'live' ? [1] : [1, 2, 3];

  return rows.map((index) => {
    const videoID = `${slug}${type.id}${index}`;
    const url = prefix === 'shorts' ? `https://www.youtube.com/shorts/${videoID}` : `https://www.youtube.com/watch?v=${videoID}`;
    return {
      id: `${feed?.id || 'channel'}-${type.id}-${index}`,
      title: `${feed?.name || 'Channel'} ${type.label} ${index}`,
      url,
      type
    };
  });
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

function QueueTable({ downloads, onEdit, onDelete }) {
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
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {downloads.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.title}</td>
              <td>{item.source}</td>
              <td>{item.quality}</td>
              <td>{item.status}</td>
              <td>
                <ProgressBar value={item.progress} />
              </td>
              <td>
                <div className="table-actions">
                  <button type="button" onClick={() => onEdit(item)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => onDelete(item.id)}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeedTable({ feeds, onEdit, onDelete }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Channel URL</th>
            <th>Rule</th>
            <th>Status</th>
            <th>Last Check</th>
            <th>Actions</th>
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
              <td>
                <div className="table-actions">
                  <button type="button" onClick={() => onEdit(feed)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => onDelete(feed.id)}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DownloadForm({ initialDownload, onSave, onCancel }) {
  const [draft, setDraft] = useState(
    initialDownload || {
      title: '',
      source: '',
      quality: '1080p',
      status: 'Queued',
      progress: 0
    }
  );
  const [error, setError] = useState('');

  const update = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError('');
  };

  const submit = (event) => {
    event.preventDefault();
    const title = String(draft.title || '').trim();
    const source = String(draft.source || '').trim();
    if (!title || !source) {
      setError('Title dan Source wajib diisi.');
      return;
    }
    onSave({
      id: initialDownload?.id || `Q-${Date.now()}`,
      title,
      source,
      quality: draft.quality,
      status: draft.status,
      progress: Math.max(0, Math.min(100, Number(draft.progress) || 0))
    });
  };

  return (
    <form className="panel form-panel" onSubmit={submit}>
      <div className="panel-head">
        <h2>{initialDownload ? 'Edit Download' : 'Add Download'}</h2>
        <div className="button-row">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit">Save</button>
        </div>
      </div>
      {error ? <p className="error-line">{error}</p> : null}
      <div className="form-grid">
        <label>
          Title
          <input value={draft.title} onChange={(event) => update('title', event.target.value)} placeholder="Video title or URL label" />
        </label>
        <label>
          Source
          <input value={draft.source} onChange={(event) => update('source', event.target.value)} placeholder="Channel, feed, or manual URL" />
        </label>
        <label>
          Quality
          <select value={draft.quality} onChange={(event) => update('quality', event.target.value)}>
            <option>1080p</option>
            <option>720p</option>
            <option>480p</option>
            <option>mp3</option>
          </select>
        </label>
        <label>
          Status
          <select value={draft.status} onChange={(event) => update('status', event.target.value)}>
            <option>Queued</option>
            <option>Downloading</option>
            <option>Done</option>
            <option>Failed</option>
          </select>
        </label>
        <label>
          Progress
          <input type="number" min="0" max="100" value={draft.progress} onChange={(event) => update('progress', event.target.value)} />
        </label>
      </div>
    </form>
  );
}

function FeedForm({ initialFeed, onSave, onCancel }) {
  const [draft, setDraft] = useState({
    name: initialFeed?.name || '',
    url: initialFeed?.url || '',
    rule: initialFeed?.rule || '1080p mp4',
    status: initialFeed?.status || 'Watching'
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
      setError('Name dan Channel URL wajib diisi.');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('Channel URL harus dimulai dengan http:// atau https://.');
      return;
    }
    onSave({
      id: initialFeed?.id || Date.now(),
      name,
      url,
      rule: draft.rule,
      status: draft.status,
      lastCheck: initialFeed?.lastCheck || 'Not checked yet'
    });
  };

  return (
    <form className="panel form-panel" onSubmit={submit}>
      <div className="panel-head">
        <h2>{initialFeed ? 'Edit RSS Feed' : 'Add RSS Feed'}</h2>
        <div className="button-row">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit">Save</button>
        </div>
      </div>
      {error ? <p className="error-line">{error}</p> : null}
      <div className="form-grid">
        <label>
          Name
          <input value={draft.name} onChange={(event) => update('name', event.target.value)} placeholder="Channel or playlist name" />
        </label>
        <label>
          Channel URL
          <input value={draft.url} onChange={(event) => update('url', event.target.value)} placeholder="https://www.youtube.com/@Sleepybloke" />
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

function Overview({ downloads, feeds, onOpenAddDownload, onEditDownload, onDeleteDownload, onOpenAddFeed, onEditFeed, onDeleteFeed }) {
  const activeFeedCount = feeds.filter((feed) => feed.status === 'Watching').length;
  return (
    <div className="view-stack">
      <div className="stats-grid">
        <Stat label="Active feeds" value={String(activeFeedCount)} />
        <Stat label="Queue items" value={String(downloads.length)} />
        <Stat label="Storage used" value="284 GB" />
        <Stat label="Worker state" value="Online" />
      </div>
      <section className="panel">
        <div className="panel-head">
          <h2>Download Queue</h2>
          <button type="button" onClick={onOpenAddDownload}>
            Add URL
          </button>
        </div>
        <QueueTable downloads={downloads} onEdit={onEditDownload} onDelete={onDeleteDownload} />
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>RSS Watchlist</h2>
          <button type="button" onClick={onOpenAddFeed}>
            Add Feed
          </button>
        </div>
        <FeedTable feeds={feeds} onEdit={onEditFeed} onDelete={onDeleteFeed} />
      </section>
    </div>
  );
}

function DownloadsView({ downloads, showForm, editingDownload, onOpenAdd, onCancel, onSave, onEdit, onDelete }) {
  return (
    <div className="view-stack">
      {showForm ? <DownloadForm initialDownload={editingDownload} onSave={onSave} onCancel={onCancel} /> : null}
      <section className="panel">
        <div className="panel-head">
          <h2>Downloads</h2>
          <button type="button" onClick={onOpenAdd}>
            Add URL
          </button>
        </div>
        <QueueTable downloads={downloads} onEdit={onEdit} onDelete={onDelete} />
      </section>
    </div>
  );
}

function RSSFeedsView({ feeds, showForm, editingFeed, onOpenAddFeed, onCancelFeed, onSaveFeed, onEditFeed, onDeleteFeed }) {
  return (
    <div className="view-stack">
      {showForm ? <FeedForm initialFeed={editingFeed} onSave={onSaveFeed} onCancel={onCancelFeed} /> : null}
      <section className="panel">
        <div className="panel-head">
          <h2>RSS Feeds</h2>
          <button type="button" onClick={onOpenAddFeed}>
            Add Feed
          </button>
        </div>
        <FeedTable feeds={feeds} onEdit={onEditFeed} onDelete={onDeleteFeed} />
      </section>
    </div>
  );
}

function WatchlistChannelView({ feeds, onOpenAddFeed, onAddToDownload }) {
  const watchedFeeds = feeds.filter((feed) => feed.status === 'Watching');
  const [selectedFeedID, setSelectedFeedID] = useState(watchedFeeds[0]?.id || '');
  const [selectedURLType, setSelectedURLType] = useState('videos');
  const selectedFeed = watchedFeeds.find((feed) => String(feed.id) === String(selectedFeedID)) || watchedFeeds[0] || null;
  const selectedType = channelURLTypes.find((type) => type.id === selectedURLType) || channelURLTypes[0];
  const selectedVideoRows = selectedFeed ? buildChannelVideoRows(selectedFeed, selectedType.id) : [];

  useEffect(() => {
    if (!selectedFeed && watchedFeeds[0]) {
      setSelectedFeedID(watchedFeeds[0].id);
    }
  }, [selectedFeed, watchedFeeds]);

  return (
    <div className="view-stack">
      <section className="panel">
        <div className="panel-head">
          <h2>Watchlist Channel</h2>
          <button type="button" onClick={onOpenAddFeed}>
            Add Channel
          </button>
        </div>
        {watchedFeeds.length === 0 ? (
          <p className="empty-line">No watched channel yet.</p>
        ) : (
          <div className="radio-grid">
            {watchedFeeds.map((feed) => (
              <label className="radio-card" key={feed.id}>
                <input type="radio" name="watchlist-channel" checked={String(selectedFeed?.id) === String(feed.id)} onChange={() => setSelectedFeedID(feed.id)} />
                <span>
                  <strong>{feed.name}</strong>
                  <small>{feed.rule}</small>
                </span>
              </label>
            ))}
          </div>
        )}
      </section>
      {selectedFeed ? (
        <section className="panel">
          <div className="panel-head">
            <h2>Channel URLs</h2>
            <span className="panel-note">{selectedVideoRows.length} URLs</span>
          </div>
          <div className="radio-grid compact-radio-grid">
            {channelURLTypes.map((type) => (
              <label className="radio-card" key={type.id}>
                <input type="radio" name="channel-url-type" checked={selectedType.id === type.id} onChange={() => setSelectedURLType(type.id)} />
                <span>
                  <strong>{type.label}</strong>
                  <small>{type.path}</small>
                </span>
              </label>
            ))}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>Type</th>
                  <th>Title</th>
                  <th>URL</th>
                  <th>Rule</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {selectedVideoRows.map((row) => (
                  <tr key={row.id}>
                    <td>{selectedFeed.name}</td>
                    <td>{row.type.label}</td>
                    <td>{row.title}</td>
                    <td className="mono-cell">{row.url}</td>
                    <td>{selectedFeed.rule}</td>
                    <td>
                      <button type="button" onClick={() => onAddToDownload(selectedFeed, row.url, row.type, row.title)}>
                        Add to Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ChannelListView({ feeds, showForm, editingFeed, onOpenAddFeed, onCancelFeed, onSaveFeed, onEditFeed, onDeleteFeed }) {
  return (
    <div className="view-stack">
      {showForm ? <FeedForm initialFeed={editingFeed} onSave={onSaveFeed} onCancel={onCancelFeed} /> : null}
      <section className="panel">
        <div className="panel-head">
          <h2>List Channel</h2>
          <button type="button" onClick={onOpenAddFeed}>
            Add Channel
          </button>
        </div>
        <FeedTable feeds={feeds} onEdit={onEditFeed} onDelete={onDeleteFeed} />
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
  const [downloads, setDownloads] = useState(() => loadArray(downloadsKey, initialDownloads));
  const [feeds, setFeeds] = useState(() => normalizeChannelRows(loadArray(feedsKey, initialFeeds)));
  const [showDownloadForm, setShowDownloadForm] = useState(false);
  const [editingDownload, setEditingDownload] = useState(null);
  const [showFeedForm, setShowFeedForm] = useState(false);
  const [editingFeed, setEditingFeed] = useState(null);

  const activeTitle = useMemo(() => flatMenu.find(([id]) => id === active)?.[1] || 'Overview', [active]);

  const saveDownloads = (nextDownloads) => {
    setDownloads(nextDownloads);
    saveJSON(downloadsKey, nextDownloads);
  };

  const openAddDownload = () => {
    setActive('downloads');
    setEditingDownload(null);
    setShowDownloadForm(true);
  };

  const editDownload = (download) => {
    setActive('downloads');
    setEditingDownload(download);
    setShowDownloadForm(true);
  };

  const saveDownload = (download) => {
    const exists = downloads.some((item) => item.id === download.id);
    const nextDownloads = exists ? downloads.map((item) => (item.id === download.id ? download : item)) : [download, ...downloads];
    saveDownloads(nextDownloads);
    setEditingDownload(null);
    setShowDownloadForm(false);
  };

  const deleteDownload = (downloadID) => {
    saveDownloads(downloads.filter((item) => item.id !== downloadID));
  };

  const addFeedToDownload = (feed, sourceURL = feed.url, type = channelURLTypes[0], title = '') => {
    const quality = String(feed.rule || '1080p mp4').includes('audio') ? 'mp3' : String(feed.rule || '1080p').split(' ')[0];
    saveDownload({
      id: `Q-${Date.now()}`,
      title: title || `${feed.name} - ${type.label}`,
      source: sourceURL,
      quality,
      status: 'Queued',
      progress: 0
    });
    setActive('downloads');
  };

  const saveFeeds = (nextFeeds) => {
    setFeeds(nextFeeds);
    saveJSON(feedsKey, nextFeeds);
  };

  const openAddFeed = () => {
    setActive('channel-list');
    setEditingFeed(null);
    setShowFeedForm(true);
  };

  const editFeed = (feed) => {
    setActive('channel-list');
    setEditingFeed(feed);
    setShowFeedForm(true);
  };

  const saveFeed = (feed) => {
    const exists = feeds.some((item) => item.id === feed.id);
    const nextFeeds = exists ? feeds.map((item) => (item.id === feed.id ? feed : item)) : [feed, ...feeds];
    saveFeeds(nextFeeds);
    setEditingFeed(null);
    setShowFeedForm(false);
  };

  const deleteFeed = (feedID) => {
    saveFeeds(feeds.filter((feed) => feed.id !== feedID));
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
        {active === 'overview' ? (
          <Overview
            downloads={downloads}
            feeds={feeds}
            onOpenAddDownload={openAddDownload}
            onEditDownload={editDownload}
            onDeleteDownload={deleteDownload}
            onOpenAddFeed={openAddFeed}
            onEditFeed={editFeed}
            onDeleteFeed={deleteFeed}
          />
        ) : null}
        {active === 'downloads' ? (
          <DownloadsView
            downloads={downloads}
            showForm={showDownloadForm}
            editingDownload={editingDownload}
            onOpenAdd={openAddDownload}
            onCancel={() => {
              setEditingDownload(null);
              setShowDownloadForm(false);
            }}
            onSave={saveDownload}
            onEdit={editDownload}
            onDelete={deleteDownload}
          />
        ) : null}
        {active === 'rss' ? (
          <RSSFeedsView
            feeds={feeds}
            showForm={showFeedForm}
            editingFeed={editingFeed}
            onOpenAddFeed={openAddFeed}
            onCancelFeed={() => {
              setEditingFeed(null);
              setShowFeedForm(false);
            }}
            onSaveFeed={saveFeed}
            onEditFeed={editFeed}
            onDeleteFeed={deleteFeed}
          />
        ) : null}
        {active === 'channel-watchlist' ? (
          <WatchlistChannelView feeds={feeds} onOpenAddFeed={openAddFeed} onAddToDownload={addFeedToDownload} />
        ) : null}
        {active === 'channel-list' ? (
          <ChannelListView
            feeds={feeds}
            showForm={showFeedForm}
            editingFeed={editingFeed}
            onOpenAddFeed={openAddFeed}
            onCancelFeed={() => {
              setEditingFeed(null);
              setShowFeedForm(false);
            }}
            onSaveFeed={saveFeed}
            onEditFeed={editFeed}
            onDeleteFeed={deleteFeed}
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
