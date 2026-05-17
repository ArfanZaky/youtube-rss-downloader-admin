# YouTube RSS Downloader Admin

Admin console prototype for a YouTube downloader with RSS-based automatic download rules.

Current scope:

- Pixel-styled admin shell.
- Login screen with demo credentials and refresh-safe local session.
- Parent-child menu with Administrator containing Users, Roles, Permissions, and Settings.
- Parent-child Channel menu containing Watchlist Channel and List Channel.
- User, role, and permission management views.
- RSS feed table with local create, edit, and delete actions.
- Channel list table with separate local create, edit, and delete actions.
- Download queue with local create, edit, and delete actions.
- Editable downloader settings panels.

Demo login:

- Username: `admin`
- Password: `admin123`

## Run

```bash
npm install
npm run dev -- --port 4177
```

The dev server listens on `0.0.0.0`, so it can be opened from the machine public IP when firewall and provider rules allow the selected port.

## Build

```bash
npm run build
```
