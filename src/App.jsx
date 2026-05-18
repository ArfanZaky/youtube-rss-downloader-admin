import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Download,
  Eye,
  FolderDown,
  Gauge,
  KeyRound,
  ListVideo,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  RotateCcw,
  Rss,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
  Trash2,
  UserPlus,
  UsersRound,
  X
} from 'lucide-react';

const sessionKey = 'yt-rss-admin.session.v1';
const settingsKey = 'yt-rss-admin.settings.v1';
const legacyFeedsKey = 'yt-rss-admin.feeds.v1';
const rssFeedsKey = 'yt-rss-admin.rss-feeds.v1';
const channelsKey = 'yt-rss-admin.channels.v1';
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

const initialRSSFeeds = [
  { id: 1, name: 'Sleepybloke RSS', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCk-lkg3YUJFOCreDf5C998w', rule: '1080p mp4', status: 'Watching', lastCheck: 'Not checked yet' },
  { id: 2, name: 'Podcast Clips RSS', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC-podcast', rule: 'audio mp3', status: 'Paused', lastCheck: 'Not checked yet' }
];

const initialChannels = [
  { id: 1, name: 'Sleepybloke', url: 'https://www.youtube.com/@Sleepybloke', rule: '1080p mp4', status: 'Watching', lastCheck: '2 min ago' },
  { id: 2, name: 'Podcast Clips', url: 'https://www.youtube.com/@podcastclips', rule: 'audio mp3', status: 'Paused', lastCheck: '1 hour ago' },
  { id: 3, name: 'Tutorial Archive', url: 'https://www.youtube.com/@tutorialarchive', rule: '720p mp4', status: 'Watching', lastCheck: '9 min ago' }
];

const initialDownloads = [
  { id: 'Q-1042', title: 'Building a clean RSS worker', source: 'Tech Reviews', quality: '1080p', status: 'Downloading', progress: 64, path: '/srv/media/youtube/building-a-clean-rss-worker.mp4' },
  { id: 'Q-1041', title: 'Weekly creator news', source: 'Podcast Clips', quality: 'mp3', status: 'Queued', progress: 0, path: '/srv/media/youtube/weekly-creator-news.mp3' },
  { id: 'Q-1040', title: 'React admin menus from scratch', source: 'Tutorial Archive', quality: '720p', status: 'Done', progress: 100, path: '/srv/media/youtube/react-admin-menus-from-scratch.mp4' }
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
      ['overview', 'Overview', Gauge],
      ['downloads', 'Downloads', Download],
      ['rss', 'RSS Feeds', Rss]
    ]
  },
  {
    id: 'channel',
    label: 'Channel',
    children: [
      ['channel-watchlist', 'Watchlist Channel', Eye],
      ['channel-list', 'List Channel', ListVideo]
    ]
  },
  {
    id: 'administrator',
    label: 'Administrator',
    children: [
      ['users', 'Users', UsersRound],
      ['roles', 'Roles', ShieldCheck],
      ['permissions', 'Permissions', KeyRound],
      ['settings', 'Settings', SettingsIcon]
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

async function loadDBValue(key) {
  const response = await fetch(`/api/store?key=${encodeURIComponent(key)}`);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || `Failed to load ${key}.`);
  return payload;
}

function saveDBValue(key, value) {
  fetch(`/api/store?key=${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(value)
  }).catch(() => {});
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

function hasStoredValue(key) {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(key) !== null;
}

function isRSSFeedURL(row) {
  return String(row?.url || '').includes('/feeds/videos.xml');
}

function safeFilename(value) {
  return String(value || 'download').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'download';
}

function buildDownloadPath(settings, item) {
  const basePath = String(settings?.downloadPath || defaultSettings.downloadPath).replace(/\/+$/, '');
  const extension = String(item?.quality || '').toLowerCase().includes('mp3') ? 'mp3' : 'mp4';
  return `${basePath}/${safeFilename(item?.title)}.${extension}`;
}

function normalizeChannelRows(rows) {
  return rows.map((row) => {
    const url = String(row.url || '');
    const channelID = url.match(/[?&]channel_id=([^&]+)/)?.[1];
    if (!channelID) return row;
    return { ...row, url: `https://www.youtube.com/channel/${channelID}` };
  });
}

function loadRSSFeeds() {
  if (hasStoredValue(rssFeedsKey)) return loadArray(rssFeedsKey, initialRSSFeeds);
  const legacyRSSRows = loadArray(legacyFeedsKey, []).filter(isRSSFeedURL);
  const rows = legacyRSSRows.length > 0 ? legacyRSSRows : initialRSSFeeds;
  saveJSON(rssFeedsKey, rows);
  return rows;
}

function loadChannels() {
  if (hasStoredValue(channelsKey)) return normalizeChannelRows(loadArray(channelsKey, initialChannels));
  const legacyChannelRows = loadArray(legacyFeedsKey, []).filter((row) => !isRSSFeedURL(row));
  const rows = legacyChannelRows.length > 0 ? normalizeChannelRows(legacyChannelRows) : initialChannels;
  saveJSON(channelsKey, rows);
  return rows;
}

function loadDownloads() {
  if (hasStoredValue(downloadsKey)) return loadArray(downloadsKey, initialDownloads);
  saveJSON(downloadsKey, initialDownloads);
  return initialDownloads;
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

function IconLabel({ icon: IconComponent, children }) {
  return (
    <>
      <IconComponent className="ui-icon" size={16} strokeWidth={2} aria-hidden="true" />
      <span>{children}</span>
    </>
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
          <button type="submit">
            <IconLabel icon={LogIn}>Login</IconLabel>
          </button>
        </form>
      </section>
    </main>
  );
}

function Stat({ label, value, icon }) {
  return (
    <div className="stat">
      <span className="stat-label">
        <IconLabel icon={icon}>{label}</IconLabel>
      </span>
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
            <th>Path</th>
            <th>Error</th>
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
              <td className="mono-cell">{item.path || '-'}</td>
              <td className="mono-cell">{item.error || '-'}</td>
              <td>
                <div className="table-actions">
                  <button type="button" onClick={() => onEdit(item)}>
                    <IconLabel icon={Pencil}>Edit</IconLabel>
                  </button>
                  <button type="button" onClick={() => onDelete(item.id)}>
                    <IconLabel icon={Trash2}>Delete</IconLabel>
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

function FeedTable({ feeds, onEdit, onDelete, urlLabel = 'Channel URL' }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>{urlLabel}</th>
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
                    <IconLabel icon={Pencil}>Edit</IconLabel>
                  </button>
                  <button type="button" onClick={() => onDelete(feed.id)}>
                    <IconLabel icon={Trash2}>Delete</IconLabel>
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
      quality: '1080p'
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
      quality: draft.quality
    });
  };

  return (
    <form className="panel form-panel" onSubmit={submit}>
      <div className="panel-head">
        <h2>{initialDownload ? 'Edit Download' : 'Add Download'}</h2>
        <div className="button-row">
          <button type="button" onClick={onCancel}>
            <IconLabel icon={X}>Cancel</IconLabel>
          </button>
          <button type="submit">
            <IconLabel icon={Save}>Save</IconLabel>
          </button>
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
      </div>
    </form>
  );
}

function FeedForm({ initialFeed, onSave, onCancel, title = 'Channel', urlLabel = 'Channel URL', urlPlaceholder = 'https://www.youtube.com/@Sleepybloke' }) {
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
      setError(`Name dan ${urlLabel} wajib diisi.`);
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError(`${urlLabel} harus dimulai dengan http:// atau https://.`);
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
        <h2>{initialFeed ? `Edit ${title}` : `Add ${title}`}</h2>
        <div className="button-row">
          <button type="button" onClick={onCancel}>
            <IconLabel icon={X}>Cancel</IconLabel>
          </button>
          <button type="submit">
            <IconLabel icon={Save}>Save</IconLabel>
          </button>
        </div>
      </div>
      {error ? <p className="error-line">{error}</p> : null}
      <div className="form-grid">
        <label>
          Name
          <input value={draft.name} onChange={(event) => update('name', event.target.value)} placeholder="Channel or playlist name" />
        </label>
        <label>
          {urlLabel}
          <input value={draft.url} onChange={(event) => update('url', event.target.value)} placeholder={urlPlaceholder} />
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

function Overview({ downloads, rssFeeds, onOpenAddDownload, onEditDownload, onDeleteDownload, onOpenAddRSSFeed, onEditRSSFeed, onDeleteRSSFeed }) {
  const activeFeedCount = rssFeeds.filter((feed) => feed.status === 'Watching').length;
  return (
    <div className="view-stack">
      <div className="stats-grid">
        <Stat label="Active feeds" value={String(activeFeedCount)} icon={Rss} />
        <Stat label="Queue items" value={String(downloads.length)} icon={Download} />
        <Stat label="Storage used" value="284 GB" icon={FolderDown} />
        <Stat label="Worker state" value="Online" icon={Activity} />
      </div>
      <section className="panel">
        <div className="panel-head">
          <h2>Download Queue</h2>
          <button type="button" onClick={onOpenAddDownload}>
            <IconLabel icon={Plus}>Add URL</IconLabel>
          </button>
        </div>
        <QueueTable downloads={downloads} onEdit={onEditDownload} onDelete={onDeleteDownload} />
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>RSS Watchlist</h2>
          <button type="button" onClick={onOpenAddRSSFeed}>
            <IconLabel icon={Plus}>Add Feed</IconLabel>
          </button>
        </div>
        <FeedTable feeds={rssFeeds} onEdit={onEditRSSFeed} onDelete={onDeleteRSSFeed} urlLabel="RSS Feed URL" />
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
            <IconLabel icon={Plus}>Add URL</IconLabel>
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
      {showForm ? (
        <FeedForm
          title="RSS Feed"
          urlLabel="RSS Feed URL"
          urlPlaceholder="https://www.youtube.com/feeds/videos.xml?channel_id=..."
          initialFeed={editingFeed}
          onSave={onSaveFeed}
          onCancel={onCancelFeed}
        />
      ) : null}
      <section className="panel">
        <div className="panel-head">
          <h2>RSS Feeds</h2>
          <button type="button" onClick={onOpenAddFeed}>
            <IconLabel icon={Plus}>Add Feed</IconLabel>
          </button>
        </div>
        <FeedTable feeds={feeds} onEdit={onEditFeed} onDelete={onDeleteFeed} urlLabel="RSS Feed URL" />
      </section>
    </div>
  );
}

function WatchlistChannelView({ feeds, onOpenAddFeed, onAddToDownload }) {
  const watchedFeeds = feeds.filter((feed) => feed.status === 'Watching');
  const [selectedFeedID, setSelectedFeedID] = useState(watchedFeeds[0]?.id || '');
  const [selectedURLType, setSelectedURLType] = useState('videos');
  const [videoRows, setVideoRows] = useState([]);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState('');
  const selectedFeed = watchedFeeds.find((feed) => String(feed.id) === String(selectedFeedID)) || watchedFeeds[0] || null;
  const selectedType = channelURLTypes.find((type) => type.id === selectedURLType) || channelURLTypes[0];

  useEffect(() => {
    if (!selectedFeed && watchedFeeds[0]) {
      setSelectedFeedID(watchedFeeds[0].id);
    }
  }, [selectedFeed, watchedFeeds]);

  useEffect(() => {
    if (!selectedFeed) {
      setVideoRows([]);
      return undefined;
    }
    const controller = new AbortController();
    setVideoRows([]);
    setVideoLoading(true);
    setVideoError('');
    fetch(`/api/channel-urls?url=${encodeURIComponent(selectedFeed.url)}&type=${encodeURIComponent(selectedType.id)}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'Failed to load channel URLs.');
        setVideoRows(Array.isArray(payload.rows) ? payload.rows : []);
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setVideoRows([]);
        setVideoError(String(error?.message || error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setVideoLoading(false);
      });
    return () => controller.abort();
  }, [selectedFeed?.url, selectedType.id]);

  return (
    <div className="view-stack">
      <section className="panel">
        <div className="panel-head">
          <h2>Watchlist Channel</h2>
          <button type="button" onClick={onOpenAddFeed}>
            <IconLabel icon={Plus}>Add Channel</IconLabel>
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
            <span className="panel-note">{videoLoading ? 'Loading...' : `${videoRows.length} URLs`}</span>
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
                {videoError ? (
                  <tr>
                    <td colSpan="6" className="error-line">{videoError}</td>
                  </tr>
                ) : null}
                {!videoError && !videoLoading && videoRows.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="mono-cell">No URLs found for this channel/type.</td>
                  </tr>
                ) : null}
                {videoRows.map((row) => (
                  <tr key={row.id}>
                    <td>{selectedFeed.name}</td>
                    <td>{selectedType.label}</td>
                    <td>{row.title}</td>
                    <td className="mono-cell">{row.url}</td>
                    <td>{selectedFeed.rule}</td>
                    <td>
                      <button type="button" onClick={() => onAddToDownload(selectedFeed, row.url, selectedType, row.title)}>
                        <IconLabel icon={Download}>Add to Download</IconLabel>
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
      {showForm ? (
        <FeedForm
          title="Channel"
          urlLabel="Channel URL"
          urlPlaceholder="https://www.youtube.com/@Sleepybloke"
          initialFeed={editingFeed}
          onSave={onSaveFeed}
          onCancel={onCancelFeed}
        />
      ) : null}
      <section className="panel">
        <div className="panel-head">
          <h2>List Channel</h2>
          <button type="button" onClick={onOpenAddFeed}>
            <IconLabel icon={Plus}>Add Channel</IconLabel>
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
        <button type="button">
          <IconLabel icon={UserPlus}>Invite User</IconLabel>
        </button>
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
        <button type="button">
          <IconLabel icon={Plus}>Create Role</IconLabel>
        </button>
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
        <button type="button">
          <IconLabel icon={Save}>Save Matrix</IconLabel>
        </button>
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

function Settings({ settings, setSettings, onPersistSettings }) {
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
    onPersistSettings(normalized);
    setNotice('Settings saved.');
  };

  const reset = () => {
    setDraft(defaultSettings);
    setSettings(defaultSettings);
    saveJSON(settingsKey, defaultSettings);
    onPersistSettings(defaultSettings);
    setNotice('Settings reset.');
  };

  return (
    <form className="panel settings-form" onSubmit={save}>
      <div className="panel-head">
        <h2>Settings</h2>
        <div className="button-row">
          <button type="button" onClick={reset}>
            <IconLabel icon={RotateCcw}>Reset</IconLabel>
          </button>
          <button type="submit">
            <IconLabel icon={Save}>Save</IconLabel>
          </button>
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
  const [downloads, setDownloads] = useState(loadDownloads);
  const [rssFeeds, setRSSFeeds] = useState(loadRSSFeeds);
  const [channels, setChannels] = useState(loadChannels);
  const [showDownloadForm, setShowDownloadForm] = useState(false);
  const [editingDownload, setEditingDownload] = useState(null);
  const [showRSSFeedForm, setShowRSSFeedForm] = useState(false);
  const [editingRSSFeed, setEditingRSSFeed] = useState(null);
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);

  const activeTitle = useMemo(() => flatMenu.find(([id]) => id === active)?.[1] || 'Overview', [active]);

  useEffect(() => {
    let cancelled = false;
    const syncDataset = async ({ dbKey, localKey, value, setter }) => {
      const payload = await loadDBValue(dbKey);
      if (cancelled) return;
      if (payload.exists) {
        setter(payload.value);
        saveJSON(localKey, payload.value);
        return;
      }
      saveDBValue(dbKey, value);
    };

    Promise.all([
      syncDataset({ dbKey: 'settings', localKey: settingsKey, value: settings, setter: setSettings }),
      syncDataset({ dbKey: 'downloads', localKey: downloadsKey, value: downloads, setter: setDownloads }),
      syncDataset({ dbKey: 'rssFeeds', localKey: rssFeedsKey, value: rssFeeds, setter: setRSSFeeds }),
      syncDataset({ dbKey: 'channels', localKey: channelsKey, value: channels, setter: setChannels })
    ]).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const saveDownloads = (nextDownloads) => {
    setDownloads(nextDownloads);
    saveJSON(downloadsKey, nextDownloads);
    saveDBValue('downloads', nextDownloads);
  };

  useEffect(() => {
    const timer = window.setInterval(async () => {
      try {
        const payload = await loadDBValue('downloads');
        if (payload.exists && Array.isArray(payload.value)) {
          setDownloads(payload.value);
          saveJSON(downloadsKey, payload.value);
        }
      } catch {
      }
    }, 2000);
    return () => window.clearInterval(timer);
  }, []);

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
    const existing = downloads.find((item) => item.id === download.id);
    const nextDownload = {
      ...existing,
      ...download,
      status: existing?.status || 'Queued',
      progress: existing?.progress ?? 0
    };
    nextDownload.path = buildDownloadPath(settings, nextDownload);
    const nextDownloads = existing ? downloads.map((item) => (item.id === download.id ? nextDownload : item)) : [nextDownload, ...downloads];
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
      quality
    });
    setActive('downloads');
  };

  const saveRSSFeeds = (nextFeeds) => {
    setRSSFeeds(nextFeeds);
    saveJSON(rssFeedsKey, nextFeeds);
    saveDBValue('rssFeeds', nextFeeds);
  };

  const openAddRSSFeed = () => {
    setActive('rss');
    setEditingRSSFeed(null);
    setShowRSSFeedForm(true);
  };

  const editRSSFeed = (feed) => {
    setActive('rss');
    setEditingRSSFeed(feed);
    setShowRSSFeedForm(true);
  };

  const saveRSSFeed = (feed) => {
    const exists = rssFeeds.some((item) => item.id === feed.id);
    const nextFeeds = exists ? rssFeeds.map((item) => (item.id === feed.id ? feed : item)) : [feed, ...rssFeeds];
    saveRSSFeeds(nextFeeds);
    setEditingRSSFeed(null);
    setShowRSSFeedForm(false);
  };

  const deleteRSSFeed = (feedID) => {
    saveRSSFeeds(rssFeeds.filter((feed) => feed.id !== feedID));
  };

  const saveChannels = (nextChannels) => {
    setChannels(nextChannels);
    saveJSON(channelsKey, nextChannels);
    saveDBValue('channels', nextChannels);
  };

  const openAddChannel = () => {
    setActive('channel-list');
    setEditingChannel(null);
    setShowChannelForm(true);
  };

  const editChannel = (feed) => {
    setActive('channel-list');
    setEditingChannel(feed);
    setShowChannelForm(true);
  };

  const saveChannel = (feed) => {
    const exists = channels.some((item) => item.id === feed.id);
    const nextChannels = exists ? channels.map((item) => (item.id === feed.id ? feed : item)) : [feed, ...channels];
    saveChannels(nextChannels);
    setEditingChannel(null);
    setShowChannelForm(false);
  };

  const deleteChannel = (feedID) => {
    saveChannels(channels.filter((feed) => feed.id !== feedID));
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
              {group.children.map(([id, label, IconComponent]) => (
                <button key={id} type="button" className={active === id ? 'active' : ''} onClick={() => setActive(id)}>
                  <IconLabel icon={IconComponent}>{label}</IconLabel>
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
            <IconLabel icon={LogOut}>Logout</IconLabel>
          </button>
        </header>
        {active === 'overview' ? (
          <Overview
            downloads={downloads}
            rssFeeds={rssFeeds}
            onOpenAddDownload={openAddDownload}
            onEditDownload={editDownload}
            onDeleteDownload={deleteDownload}
            onOpenAddRSSFeed={openAddRSSFeed}
            onEditRSSFeed={editRSSFeed}
            onDeleteRSSFeed={deleteRSSFeed}
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
            feeds={rssFeeds}
            showForm={showRSSFeedForm}
            editingFeed={editingRSSFeed}
            onOpenAddFeed={openAddRSSFeed}
            onCancelFeed={() => {
              setEditingRSSFeed(null);
              setShowRSSFeedForm(false);
            }}
            onSaveFeed={saveRSSFeed}
            onEditFeed={editRSSFeed}
            onDeleteFeed={deleteRSSFeed}
          />
        ) : null}
        {active === 'channel-watchlist' ? (
          <WatchlistChannelView feeds={channels} onOpenAddFeed={openAddChannel} onAddToDownload={addFeedToDownload} />
        ) : null}
        {active === 'channel-list' ? (
          <ChannelListView
            feeds={channels}
            showForm={showChannelForm}
            editingFeed={editingChannel}
            onOpenAddFeed={openAddChannel}
            onCancelFeed={() => {
              setEditingChannel(null);
              setShowChannelForm(false);
            }}
            onSaveFeed={saveChannel}
            onEditFeed={editChannel}
            onDeleteFeed={deleteChannel}
          />
        ) : null}
        {active === 'users' ? <Users roles={roles} /> : null}
        {active === 'roles' ? <Roles roles={roles} /> : null}
        {active === 'permissions' ? <PermissionMatrix roles={roles} setRoles={setRoles} /> : null}
        {active === 'settings' ? <Settings settings={settings} setSettings={setSettings} onPersistSettings={(nextSettings) => saveDBValue('settings', nextSettings)} /> : null}
      </main>
    </div>
  );
}
