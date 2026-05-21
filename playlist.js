const SUPABASE_URL = "https://wrczpnhesorptjzwdizd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_cm8re92ds8XLhspfdNSwuw_X74b7kDm";
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const playlist = document.getElementById("playlist");
const playlistStatus = document.getElementById("playlistStatus");

function publicName(item) {
  if (item.anonymous || !item.speaker_name) return "Anonymous";
  return item.speaker_name;
}

function createAudio(src, title) {
  const audio = document.createElement("audio");
  audio.controls = true;
  audio.src = src;
  audio.setAttribute("aria-label", `Play ${title || "encouragement message"}`);
  return audio;
}

async function shareMessage(item, button) {
  const shareUrl = `${window.location.origin}${window.location.pathname}#${item.share_slug}`;
  const title = item.title || "Encouragement Message";
  const text = `Listen to ${title} on Seen Through Sound.`;

  try {
    if (navigator.share) {
      await navigator.share({ title, text, url: shareUrl });
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
    button.textContent = "Share Link Copied";
  } catch (error) {
    console.error(error);
    try {
      await navigator.clipboard.writeText(shareUrl);
      button.textContent = "Share Link Copied";
    } catch {
      button.textContent = "Share Unavailable";
    }
  }
}

async function loadPlaylist() {
  if (!supabaseClient || SUPABASE_URL.includes("YOUR_") || SUPABASE_ANON_KEY.includes("YOUR_")) {
    playlistStatus.textContent = "Playlist is not available right now.";
    return;
  }

  const { data, error } = await supabaseClient
    .from("submissions")
    .select("id,title,speaker_name,anonymous,original_audio_url,processed_audio_url,share_slug,published_at")
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
    const title = item.title || "Encouragement Message";
    const article = document.createElement("article");
    article.className = "submission-item";

    const heading = document.createElement("h3");
    heading.textContent = title;

    const name = document.createElement("p");
    name.textContent = publicName(item);

    const audio = createAudio(item.processed_audio_url || item.original_audio_url, title);

    const share = document.createElement("button");
    share.type = "button";
    share.textContent = "Share Audio";
    share.addEventListener("click", () => shareMessage(item, share));

    article.append(heading, name, audio, share);
    playlist.append(article);
  });
}

loadPlaylist();
