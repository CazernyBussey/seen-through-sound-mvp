# Seen Through Sound MVP

**Seen Through Sound**  
**An Even Though I’m Blind Voices Project**

Tagline: **Encouragement does not have to be seen to be felt.**

Mission statement:

> Seen Through Sound is a voice-powered encouragement platform created by Even Though I’m Blind, Inc. to help people speak life, hope, and strength into one another. Rooted in the perspective of the blind community and shared with the world, it turns simple audio messages into meaningful moments of connection, reminding every listener that encouragement does not have to be seen to be felt.

## What this MVP does

- Lets a visitor record a short encouragement message.
- Lets them stop, preview, reset, and submit.
- Stores audio in Supabase Storage.
- Stores submission records in Supabase Database.
- Keeps messages pending until reviewed.
- Gives admins a review queue.
- Lets admins approve/publish or reject.
- Shows approved messages in a public playlist.
- Plays intro + message + outro as a sequence to avoid heavy free-tier audio processing.

## Files

- `index.html` — public recording page.
- `app.js` — microphone recording and Supabase upload.
- `playlist.html` — public playlist page.
- `playlist.js` — loads published messages.
- `admin.html` — admin sign-in, brand audio settings, and moderation queue.
- `admin.js` — Supabase auth, settings, approve/reject actions.
- `styles.css` — accessible, high-contrast visual design.
-
-
- ## Setup and configuration

This project relies on a Supabase backend for storing audio files and submission metadata. To make the application fully functional, create a free Supabase account and a new project:

1. Sign up at [supabase.com](https://supabase.com/) and create a new project.
2. In the project's storage settings, create a bucket named **encouragement-audio**.
3. In the project's database, run the SQL schema from **supabase‑schema.sql** to create the tables and settings expected by the frontend.
4. From the Supabase dashboard, copy your project's URL and anon/public API key.

Update the configuration constants in the following JavaScript files:

- `app.js` – set `SUPABASE_URL` and `SUPABASE_ANON_KEY` near the top of the file.
- `playlist.js` – set `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
- `admin.js` – set `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

Without these values the site still loads, but submission, playlist and admin functions will indicate that Supabase is not configured.

## Running locally

For local development you can serve the static files from this repository using any simple HTTP server. For example, with [Node.js](https://nodejs.org) installed run:

```
np    npx http-server .

or    python3 -m http.server

python3 -m http.server
```

Then open the printed `http://localhost:8080` or `http://localhost:8000` address in your browser to test the site.

## Deployment

This repository is configured for GitHub Pages (see **Settings → Pages**). To deploy updates:

1. Commit your changes to the `main` branch.
2. Wait a few minutes for GitHub Pages to rebuild.
3. Visit `https://<username>.github.io/<repository-name>/` to view the latest version.
`supabase-schema.sql` — database, storage, and security policies.
- `netlify.toml` — Netlify deploy config.

## Free-first setup

### 1. Create a Supabase project

Create a free Supabase project.

Then open the Supabase SQL Editor and run the full contents of:

`supabase-schema.sql`

After running it, add your admin email:

```sql
insert into public.admin_users (email, role)
values ('your-email@example.com', 'owner');
```

### 2. Add intro and outro audio

Upload your branded intro and outro files to the `encouragement-audio` storage bucket.

Copy their public URLs.

Open `admin.html`, sign in with your admin email, and save the intro and outro URLs.

### 3. Add Supabase keys to JavaScript

In these files:

- `app.js`
- `playlist.js`
- `admin.js`

Replace:

```js
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

with your actual Supabase project URL and anon public key.

These are safe to use in a browser when Row Level Security is configured correctly.

### 4. Deploy free on Netlify

Drag this folder into Netlify, or connect it to GitHub and deploy.

The included `netlify.toml` publishes the root folder.

## Moderation policy

Seen Through Sound is a space for encouragement, hope, and respectful community expression. Submissions may be rejected if they include hate speech, threats, harassment, explicit content, personal attacks, private information, copyrighted background music, or anything that does not align with the purpose of uplifting others.

## Accessibility notes

This MVP includes:

- Skip link.
- Clear button labels.
- Keyboard-focus states.
- Live screen-reader status updates.
- Text recording status.
- Text timer.
- Native accessible audio controls.
- Consent checkbox.
- High-contrast design.

## Recommended next upgrades

1. Add automatic approval/rejection emails with Resend.
2. Add a single share page for each message.
3. Add true audio merging with FFmpeg after approval.
4. Add admin rejection notes.
5. Add spam protection.
6. Add transcript support for every audio message.
7. Add analytics for listens and shares.

## Important MVP note

This first version avoids permanent audio merging. Instead, the playlist plays intro, message, and outro as a sequence. That gives the public a branded listening experience while keeping the build simple and free-first.
