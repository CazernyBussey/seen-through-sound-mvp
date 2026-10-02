# Talk to ETIB

Separate public prototype: https://talk-to-etib.onrender.com/

Launcher test: https://talk-to-etib.onrender.com/launcher-demo

Integration guide: https://talk-to-etib.onrender.com/integration

The source is on the isolated `talk-to-etib-prototype` branch of the existing Seen Through Sound repository. Do not merge this standalone branch into the Seen Through Sound production branch: its root is a separate application. `main`, WordPress, the original ElevenLabs agent, Zapier, and the directory services were not modified.

## Architecture

Python standard library backend; semantic HTML, CSS and JavaScript frontend. No database creation, new API key, or account sign-in is needed. Managed microphone recognition uses the connected ElevenLabs account. Public source adapters refresh on demand with a five-minute cache. Anonymous conversational state is kept only in the current page. Conversation requests are not written to application logs. Platform infrastructure logs may still exist. Microphone requests are processed by ElevenLabs. Spotify is loaded only when an episode is requested. Media streams directly from the official provider.

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


Playback update, October 2, 2026: The main screen has exactly two suggestions: Play Even Though I’m Blind Radio and Play Even Though I’m Blind Experience. Both Spotify show links are inside Help; the selected player has one official link. Speak now activates the same native audio element used for media. Prepared latest episodes avoid request latency for generic podcast names, with a five-minute freshness limit. Experience prefers the RSS full MP3, matches a Spotify episode preview by title, and falls back to that preview after media failure. Spotify previews also serve as fallback when the Experience RSS feed is unavailable. Microphone and autoplay behavior on physical iPhone remain a device-specific verification limit. Run `node tests/test_player.cjs` in addition to the existing voice and backend checks.

Radio Podcast full-episode update: Radio Podcast play requests now open the official Spotify episode page instead of its public preview file. Generic Play episode defaults to the newest Radio Podcast episode when there is no podcast context; Experience context retains full native playback. Explicit preview requests remain available. Public RSS/full-audio source for Radio Podcast has not been verified, so full playback inside this standalone player is not claimed.


## Radio Podcast RSS playback, October 2, 2026

Radio Podcast RSS distribution was enabled in Spotify for Creators. Its public feed is https://anchor.fm/s/11630f9b4/podcast/rss. This supersedes the earlier Radio preview and Spotify-redirect behavior: Radio Podcast requests now load the newest full RSS enclosure in the same native audio player as Experience. Play it, Play, Pause, Resume and Stop stay on the page. Generic Play episode defaults to Radio Podcast without a podcast context, while Experience context remains Experience. Feed refresh uses the existing five-minute cache and dated saved full-audio snapshot during source failure. No Radio preview is used as a full-audio fallback. Explicit Spotify navigation remains available when requested.

The main screen still has exactly two suggestions. Physical iPhone microphone and VoiceOver playback remain unverified; backend and player regression checks cover the changed routing, full enclosures and playback controls.


## Continuous Seen Through Sound playback, October 2, 2026

Play Seen Through Sound now queues the playable published messages returned by the existing public source, newest first (up to its existing 100-message limit). The same native audio player advances automatically when a message ends, skips a failed message when another is available, and finishes after the last message without looping. Pause/Resume preserve the queue; Stop or selecting other audio clears it. The microphone listening cue does not advance the playlist. The main page retains two suggestions. Source permissions, publishing status and the original Seen Through Sound website are unchanged.

Regression checks cover queue filtering, automatic advancement, microphone cue isolation, pause/resume, failed-message handling, Stop, switching sources and final completion. Actual iPhone automatic playback remains a device-test limitation.

Voice recovery update: Empty speech-end events no longer stop capture before a transcript exists. Final text is accepted after audio-end or an empty service-end within a bounded 1.5-second window. Mixed final/interim segments wait for the unfinished segment; capture-start-only browsers receive the same timeout/reset behavior. The shared listening cue pauses when capture starts. Hidden pages and restored pages release stale recognition, and background requests cancel. A still-releasing speech service gets one 150ms InvalidStateError retry. Voice, player, and lifecycle regression checks cover these paths. Physical iPhone microphone verification remains unavailable in this remote browser.


## Microphone/media separation, October 2, 2026

Remove the HTML audio cue from the Speak now handoff: no audio source replacement, play, or pause runs after recognition starts. Existing audio is paused before capture; WebKit gets a bounded 400ms handoff when audio was playing. Player Pause/Stop release recognition before touching media. Idle greeting/synthesis are no longer unnecessarily paused/canceled. A permission sheet's temporary visibility change does not abort a request; pagehide, persisted pageshow and the bounded recognition timeout still clean up. This addresses the overlap described in WebKit issue 321436 (https://bugs.webkit.org/show_bug.cgi?id=321436), without claiming that unit checks prove a physical iPhone fix.

Help and options now includes a labeled request field and Send request, supporting the iPhone keyboard's Dictation if browser recognition fails. It routes through the same player and backend; the main screen keeps exactly two suggestions. No new speech service, credentials, stored recordings or transcript logging. Regression checks now run the actual voice controller together with the player, enforcing that audio operations cannot occur during capture and covering repeated commands and the fallback form. Physical iPhone voice verification remains unavailable.


## Start tone and prompt dispatch, October 2, 2026

Speak now arms a Web Audio context in the user gesture. Recognition start plays one sine tone at 740Hz, peak gain 0.4, 170ms long with an attack and fade. No end tone, HTML audio cue, podcast source replacement or audio-session setting. Cancellation invalidates delayed tone work. The tone indicates recognition started, not that a transcript or microphone volume was measured.

Final recognition results dispatch immediately after releasing capture, without waiting for audioend/end or the 1.5-second recovery timer. Stable interim text and manual Done speaking also dispatch directly. Empty capture resets after six seconds; recognized speech retains the eight-second ceiling and delayed-result handling. Startup now says Starting microphone until listening begins. Tests cover cue count/timing/cancellation and the actual voice-to-player handoff. Physical iPhone microphone and tone audibility remain unverified.

## Managed microphone capture

Speak now uses the pinned ElevenLabs JavaScript SDK and the isolated Talk to ETIB microphone agent. It opens one WebSocket session, plays one start tone after capture is ready, and releases capture before routing the final transcript to the existing player. Agent audio is muted. Empty requests and connection attempts time out after ten seconds; canceled and stale callbacks cannot submit requests. Self-hosted worklets and resampling WASM are bundled with the app. Rebuild with `npm ci && npm run build:speech`. Voice processing uses the connected account quota; recording is disabled and retention is configured to zero days. The original ETIB agent is unchanged.

`tests/check_live_speech.py` is an explicit real-service check using synthetic public commands. Set ETIB_RUN_SPEECH_CHECK=1 only for a verification deployment, then set it back to 0; normal starts do not run paid speech checks. SDK lifecycle/player tests use deterministic callbacks and do not claim to verify an iPhone microphone.

## Community Connect discovery

Directory requests use the existing public `/api/listings` catalog, including all pages and the directory’s media grouping. `directory-snapshot.json` supplies the 13 published profiles while startup or refresh runs in the background. The source refreshes every five minutes on use; saved results state their check date if the live source cannot load. Individual podcast and business names link to the existing accessible directory profile, and result cards include the listed website. Generic podcast-directory requests open the existing directory with its media tab and podcast search selected. Existing ETIB podcast playback retains priority. The main page still has exactly two suggestions; capture and the start tone are unchanged.

Run `python tests/test_directory.py` for profile/category routing, pagination, stale source handling, and unknown-name checks, plus the existing backend and player suites for playback regressions.

## WordPress widget
The `wordpress/talk-to-etib-widget` plugin adds prominent top and fixed bottom buttons across the public site, loading a single shared Talk to ETIB iframe on first use. Minimize cancels microphone capture while leaving selected audio playing in the mounted frame; Close stops audio. Bottom Pause audio and Stop audio controls target the same player. The panel is nonmodal so visitors can navigate the surrounding page. It does not persist audio across a full page reload or navigation to a different document. The plugin requires WordPress.com paid hosting features to be activated. No voice recording, credentials, extra subscriptions, or changes to directory publishing are introduced. Run `node tests/test_widget.cjs` and the existing managed player suite before release.
