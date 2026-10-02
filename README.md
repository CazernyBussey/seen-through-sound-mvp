# Talk to ETIB

Separate public prototype: https://talk-to-etib.onrender.com/

Launcher test: https://talk-to-etib.onrender.com/launcher-demo

Integration guide: https://talk-to-etib.onrender.com/integration

The source is on the isolated `talk-to-etib-prototype` branch of the existing Seen Through Sound repository. Do not merge this standalone branch into the Seen Through Sound production branch: its root is a separate application. `main`, WordPress, ElevenLabs, Zapier, and the directory services were not modified.

## Architecture

Python standard library backend; semantic HTML, CSS and JavaScript frontend. No database creation, paid model provider, new API key, or account sign-in is needed. Public source adapters refresh on demand with a five-minute cache. Anonymous conversational state is kept only in the current page. Conversation requests are not written to application logs. Platform infrastructure logs may still exist. Optional device speech may contact the browser vendor’s speech service. Spotify is loaded only when an episode is requested. Media streams directly from the official provider.

Registry fields include name, aliases, owner, description, URL, category, action type, external status and verification metadata. Update `registry.json` for destinations. Public content and media adapters are in `server.py`. Provider output and third-party content are treated as data, never executable commands. URL actions are allowlisted. Payments, forms, email, account changes and deletion are not executed by this prototype.

## Sources

- Current public ETIB WordPress API: site 244196168; published pages and posts only. The current events page is page 80. This supersedes the obsolete public Notion link.
- Experience podcast: public RSS discovered through the official Apple podcast record, https://anchor.fm/s/1046548ac/podcast/rss.
- Radio Podcast: official Spotify show 6302Iby2KZMf4MWYq2sr16. Public episode metadata and previews; official Spotify embedded player and full-episode links. Native Spotify controls handle play/pause/resume; the global Stop control unloads the embed. The third-party control API was tested and rejected because it required unsafe-eval under the current provider script, so the app keeps its stricter policy.
- ETIB Radio: Zeno station stream discovered from its official station page, https://stream.zeno.fm/qvlhys2h2odvv.
- Seen Through Sound: existing public published messages API and approved public audio URLs. No schema or permission changes were made.

Current authoritative WordPress links identify Radio Podcast YouTube playlist PLGg6X4j2zFkk and Experience playlist PLq11DKhUJUuaDFPjBjNZSu5e96Dx2hRu7. Earlier handoff knowledge swapped those associations.

## Verified checks

- Separate free Render instance deployed; live deployment and public health endpoint verified.
- Anonymous page opens and typed requests return labeled, clickable results.
- Current WordPress articles and events retrieved live, including the October 1 Dear Fathers post and October 17/24 and December 2–6 events.
- Historical accessibility article search and Angela Harris episode search return authoritative source results.
- Official ETIB and Cazerny social destination routing; show and navigation intents distinguished.
- Chromium browser: ETIB Radio decoded and played with advancing playback time; pause and resume tested; stop releases the source.
- Chromium browser: latest full Experience episode decoded and played with advancing playback time; current episode was Sayyida Victoria Hillard, September 30, 2026.
- Chromium browser: published Seen Through Sound message decoded and completed.
- Chromium browser: standard Radio Podcast embed rendered accessible provider controls and was labeled Preview by Spotify; full playback is not claimed. Its Play/Pause provider state advanced, and global Stop unloaded the embed.
- Chromium browser: explicit navigation reached Cazerny’s official page.
- Chromium browser: launcher opens with focus in question input; keyboard Tab operates inside modal; Escape and explicit Close return focus to launcher.
- Backend: expired dates filtered; unavailable live events source produces an accessible fallback instead of claiming saved events are current; unsafe URL requests do not execute.
- Snapshot and live API tests cover intent routing and media selection. Backend request validation, same-origin POST enforcement, global throttling and bounded concurrent chat requests are implemented.

## Release gaps and limits

- Real iPhone/Safari VoiceOver, physical microphone input, speech denial, and speech synthesis need device testing. No actual iPhone hardware is accessible in this execution environment. No claim of full accessibility certification is made. Core voice recognition and speech output are implemented with typed fallback, but real-device operation is not yet verified.
- WordPress.com simple hosting may remove custom scripts. The concrete zero-upgrade integration is an ordinary `Talk to ETIB` button/link near the start of approved pages. The modal script is supplied for environments that support scripts. Production WordPress integration has not been performed.
- Radio Podcast retrieval currently indexes the episodes exposed in the public Spotify show response. A stable full public RSS feed has not been found. Spotify player availability is provider/browser dependent; the anonymous embed was explicitly labeled Preview during browser QA; explicit preview and full-episode link fallbacks remain available. No preview is labeled as a full episode.
- This is a deterministic ETIB command/retrieval assistant. Broader generative conversation opens the existing ETIB AI chat; no new model service was enabled.
- Free Render instances sleep after idle time and can take roughly a minute to wake. Existing workspace bandwidth and build allowances still apply; no paid instance or upgrade was enabled, and existing workspace billing/spend limits were not changed. Do not treat free compute as unlimited no-overage hosting.
- WordPress retrieval is bounded at 5,000 published items; the present published corpus had 34 pages/posts. Spotify archives are bounded by public provider responses. Retrieval failures use dated saved snapshots, with a clear warning. Events require a live source to claim currentness.

## Run

Python 3.13: `python server.py`, binding `0.0.0.0` and the `PORT` environment variable. There are no pip packages to install. Render build: `python -m py_compile server.py`; start: `python server.py`; free instance.

Test: `python tests/test_backend.py` from the repository root. Tests use dated public-source fixtures and do not alter connected systems. Refresh a source or registry entry after a provider or URL changes. Never add private connector credentials to client code or publish private ETIB operational data.

## Voice correction, October 2, 2026

Microphone requests now expose starting/listening/heard/error states and run after recognition ends. Speak is disabled while a request is pending. Cancel discards a partial command. Browser permission, microphone, speech-service/network, no-speech, and unsupported-browser failures have distinct guidance. Keyboard dictation requires Send. A Hear greeting button and Read last answer button start speech directly from a user activation; spoken replies remain optional and off by default. Synthesis keeps the utterance alive, selects an available English voice, resumes the engine, and reports failures or no-start. Greeting does not autoplay or compete with VoiceOver on page load. Existing ElevenLabs assistant remains an optional link; its configuration is unchanged.

Run `node tests/test_voice.cjs` for microphone lifecycle/dispatch/cancellation/error regression checks and `python tests/test_backend.py` for routing/source checks. These simulated input checks do not verify physical microphone transcription, actual speaker output, or iPhone VoiceOver.

The greeting uses a static MP3 generated with the installed FFmpeg/Flite slt voice, served by this app. This works independently of browser speech synthesis and makes no per-visit synthesis calls. ElevenLabs was estimated only (156.312 credits, approximately $0.0261); no generation was run or charged. Read last answer and optional automatic replies still require a working browser speech engine.


## Voice player update, October 2, 2026

The main screen has no text entry, Send button, or conversation history. Speak now handles one command, clears the transient recognized request, and returns ready after completion. New results replace prior results. Player controls remain available; no focus is moved to a response heading for successful playback. Direct media automatically attempts playback; radio and pause/resume/stop are handled locally when possible. Audio is primed silently during the initial Speak user gesture, but browser restrictions can still require one Play tap. Radio Podcast commands automatically play the explicitly labeled Spotify preview when available; the full episode link remains available. Full Radio Podcast automatic playback requires a full direct-audio feed, which is not currently configured. Source discovery is on demand with a five-minute cache, not a duplicate upload pipeline. Real iPhone microphone, VoiceOver, and post-recognition playback remain unverified until device testing.

Validation: `node tests/test_voice.cjs` and `node tests/test_player.cjs`. Player checks simulate recognized commands and media promises; they do not establish physical browser playback. This voice-player section supersedes earlier descriptions of text entry, Send, and conversation history.

## Microphone lifecycle repair, October 2, 2026, 09:34 EDT

The previous implementation still set navigator.audioSession.type to auto and suspended a Web Audio cue context during recording. Both paths have been removed. A brief static WAV cue acknowledges the Speak now activation; speech-recognition start separately updates Listening. A fresh recognizer per activation prevents old end/error events from affecting the next request. Stable interim text triggers after 650 ms; repeated identical interim events do not keep extending capture. Final text, speechend, or Done speaking requests stop. Capture is limited to eight seconds after start, with 500 ms recovery if end is omitted. Done speaking submits captured text instead of discarding it. No-text failures return to Speak now and leave suggestions available. These browser-event regressions are simulated, not a physical iPhone certification.

Three visible suggestions are restored for ETIB Radio, ETIB Experience Podcast, and ETIB Radio Podcast; each button runs its command without microphone access. Play Experience without the word episode now also requests podcast playback. Frontend assets have content hashes so deployment revisions use distinct URLs.
