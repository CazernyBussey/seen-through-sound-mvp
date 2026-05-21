const SUPABASE_URL = "https://wrczpnhesorptjzwdizd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_cm8re92ds8XLhspfdNSwuw_X74b7kDm";
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const playlist = document.getElementById("playlist");
const playlistStatus = document.getElementById("playlistStatus");

function createAudio(src) {
  const audio = document.createElement("audio");
  audio.controls = true;
  audio.src = src;
  return audio;
}

async function loadPlaylist() {
  if (!supabaseClient || SUPABASE_URL.includes("YOUR_") || SUPABASE_ANON_KEY.includes("YOUR_")) {
    playlistStatus.textContent = "Playlist is not available right now.";
    return;
  }

  const { data, error } = await supabaseClient
    .from("submissions")
    .select("id,title,original_audio_url,processed_audio_url,published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    console.error(error);
    playlistStatus.textContent = "Playlist is not available right now.";
    return;
  }

  playlistStatus.textContent = "";
  playlist.innerHTML = "";

  if (!data || data.length === 0) {
    return;
  }

  data.forEach(item => {
    const article = document.createElement("article");
    article.className = "submission-item";
    const heading = document.createElement("h3");
    heading.textContent = item.title || "Encouragement Message";
    const audio = createAudio(item.processed_audio_url || item.original_audio_url);
    article.append(heading, audio);
    playlist.append(article);
  });
}

loadPlaylist();
