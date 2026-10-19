# Install Kukoos on a tablet

Kukoos lives at **https://avyayae.github.io/Kukoos/**. It deploys automatically from `main` (see `.github/workflows/pages.yml`). Once installed, it opens full-screen from the home screen and works without internet. All progress stays on the device.

The same steps are in the app: **Grown-ups → Install on a tablet**.

## iPad / iPhone (Safari)
1. Open https://avyayae.github.io/Kukoos/ in **Safari**. Other iOS browsers can't install web apps.
2. Tap **Share** (the square with an arrow), then **Add to Home Screen**.
3. Keep the name "Kukoos" and tap **Add**.
4. Open Kukoos from the home screen once while online, so it saves itself for offline play.

## Android (Chrome) or a Windows/Chromebook laptop (Chrome or Edge)
1. Open https://avyayae.github.io/Kukoos/.
2. Tap **Grown-ups → Install on a tablet → Install app**. Or use the browser menu (⋮), then **Install app** / **Add to Home screen**.
3. Open Kukoos from the home screen or app list.

## First run
1. Create your explorer (name and look). Up to 4 kids can share the tablet. Switch kids with "Who's playing?".
2. Open **Grown-ups** and set a 4-digit PIN. If you forget it, "Forgot PIN?" asks a grown-up multiplication question.
3. In Grown-ups, check **Daily time** (goal 10 min, limit 60 min by default), **Sound & voice** (pick the best voice), and the **starting point**.
4. Check the storage line in Grown-ups. If it says "The browser may clear this, so back up!", install the app first: Safari can clear data for sites that haven't been opened in a while.

## Updates and backups
- New versions install themselves the next time the app opens online.
- **Grown-ups → Download a backup** saves a JSON file. Do this before changing tablets or clearing the browser. **Restore from a file** loads it back.
- Data never leaves the device: there's no server, no account and no analytics.

## One-time GitHub setup (maintainer)
Pages must use **GitHub Actions** as its source (Settings → Pages → Build and deployment → Source: GitHub Actions). After that, every merge to `main` deploys. You can also run "Deploy to GitHub Pages" by hand from the Actions tab.
