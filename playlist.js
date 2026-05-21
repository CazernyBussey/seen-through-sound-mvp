const SUPABASE_URL = "https://wrczpnhesorptjzwdizd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_cm8re92ds8XLhspfdNSwuw_X74b7kDm";
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const playlist = document.getElementById("playlist");
const playlistStatus = document.getElementById("playlistStatus");

function publicName(item) {
  if (item.anonymous || !item.speaker_name) return "Anonymous";
  return item.speaker_name;
}

function createAudio(label, src) {
  const wrap = document.createElement("div");
  const text = document.createElement("p");
  text.textContent = label;
  const audio = document.createElement("audio");
  audio.controls = true;
  audio.src = src;
  wrap.append(text, audio);
  return wrap;
}

async function loadPlaylist() {
  if (!supabaseClient || SUPABASE_URL.includes("YOUR_") || SUPABASE_ANON_KEY.includes("YOUR_")) {
    playlistStatus.textContent = "Supabase is not configured yet. Add your Supabase URL and anon key in playlist.js.";
    return;
  }

  const { data: settings } = await supabaseClient
    .from("settings")
    .select("intro_audio_url,outro_audio_url")
    .eq("id", 1)
    .maybeSingle();

  const { data, error } = await supabaseClient
    .from("submissions")
    .select("id,title,speaker_name,anonymous,original_audio_url,processed_audio_url,share_slug,published_at,approved_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    console.error(error);
    playlistStatus.textContent = "Could not load the playlist.";
    return;
  }

  if (!data || data.length === 0) {
    playlistStatus.textContent = "No approved messages are published yet.";
    return;
  }

  playlistStatus.textContent = `${data.length} approved message${data.length === 1 ? "" : "s"} available.`;
  playlist.innerHTML = "";

  data.forEach(item => {
    const article = document.createElement("article");
    article.className = "submission-item";
    const heading = document.createElement("h3");
    heading.textContent = item.title || "Encouragement Message";
    const meta = document.createElement("p");
    meta.textContent = `Shared by ${publicName(item)}.`;
    const sequence = document.createElement("div");
    sequence.className = "audio-sequence";

    if (item.processed_audio_url) {
      sequence.append(createAudio("Full encouragement message", item.processed_audio_url));
    } else {
      if (settings?.intro_audio_url) sequence.append(createAudio("Intro", settings.intro_audio_url));
      sequence.append(createAudio("Encouragement message", item.original_audio_url));
      if (settings?.outro_audio_url) sequence.append(createAudio("Outro", settings.outro_audio_url));
    }

    const share = document.createElement("button");
    share.type = "button";
    share.textContent = "Copy Share Link";
    share.addEventListener("click", async () => {
      const url = `${window.location.origin}${window.location.pathname}#${item.share_slug}`;
      await navigator.clipboard.writeText(url);
      share.textContent = "Share Link Copied";
    });

    article.append(heading, meta, sequence, share);
    playlist.append(article);
  });
}

loadPlaylist();
