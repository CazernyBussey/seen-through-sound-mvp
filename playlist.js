const SUPABASE_URL = "https://wrczpnhesorptjzwdizd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_cm8re92ds8XLhspfdNSwuw_X74b7kDm";
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const audioPlayer = document.getElementById("audioPlayer");
const playButton = document.getElementById("playButton");
const previousButton = document.getElementById("previousButton");
const nextButton = document.getElementById("nextButton");
const audioSearch = document.getElementById("audioSearch");
const audioLibrary = document.getElementById("audioLibrary");
const currentTitle = document.getElementById("currentTitle");
const currentSpeaker = document.getElementById("currentSpeaker");
const playerStatus = document.getElementById("playerStatus");
const playbackStatus = document.getElementById("playbackStatus");
const resultCount = document.getElementById("resultCount");

let messages = [];
let filteredMessages = [];
let currentIndex = -1;

function publicName(item) {
  return item.anonymous || !item.speaker_name ? "Anonymous" : item.speaker_name;
}

function setStatus(message) {
  playerStatus.textContent = message;
}

function selectMessage(index, announce = true) {
  if (!messages[index]) return;
  currentIndex = index;
  const item = messages[index];
  currentTitle.textContent = item.title || "Encouragement Message";
  currentSpeaker.textContent = `Shared by ${publicName(item)}`;
  audioPlayer.src = item.processed_audio_url || item.original_audio_url;
  audioPlayer.load();
  playButton.textContent = "Play";
  playButton.setAttribute("aria-label", `Play ${item.title || "encouragement message"}`);
  playbackStatus.textContent = announce ? `Selected: ${item.title || "Encouragement Message"}.` : "Ready to play.";
  renderLibrary();
}

function togglePlay() {
  if (currentIndex < 0 && messages.length) selectMessage(0);
  if (audioPlayer.paused) audioPlayer.play().catch(() => {
    playbackStatus.textContent = "This message could not be played. Please try again.";
  });
  else audioPlayer.pause();
}

function move(step) {
  if (!messages.length) return;
  const nextIndex = currentIndex < 0 ? 0 : (currentIndex + step + messages.length) % messages.length;
  selectMessage(nextIndex);
  audioPlayer.play().catch(() => {});
}

function renderLibrary() {
  const query = audioSearch.value.trim().toLowerCase();
  filteredMessages = messages.filter(item =>
    [item.title, publicName(item)].some(value => (value || "").toLowerCase().includes(query))
  );
  audioLibrary.innerHTML = "";
  resultCount.textContent = `${filteredMessages.length} ${filteredMessages.length === 1 ? "message" : "messages"} found.`;
  filteredMessages.forEach(item => {
    const index = messages.indexOf(item);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "library-item";
    button.setAttribute("aria-pressed", String(index === currentIndex));
    const title = document.createElement("strong");
    title.textContent = item.title || "Encouragement Message";
    const speaker = document.createElement("span");
    speaker.textContent = `Shared by ${publicName(item)}`;
    button.append(title, speaker);
    button.addEventListener("click", () => {
      selectMessage(index);
      document.getElementById("now-playing-heading").focus?.();
    });
    audioLibrary.append(button);
  });
}

async function loadPlaylist() {
  if (!supabaseClient) { setStatus("Playlist is not available right now."); return; }
  const { data, error } = await supabaseClient.from("submissions")
    .select("id,title,speaker_name,anonymous,original_audio_url,processed_audio_url,published_at")
    .eq("status", "published").order("published_at", { ascending: false });
  if (error) { console.error(error); setStatus("Playlist is not available right now."); return; }
  messages = data || [];
  if (!messages.length) { setStatus("There are no published messages yet."); renderLibrary(); return; }
  setStatus(`${messages.length} published messages available.`);
  renderLibrary();
  selectMessage(0, false);
}

playButton.addEventListener("click", togglePlay);
previousButton.addEventListener("click", () => move(-1));
nextButton.addEventListener("click", () => move(1));
audioSearch.addEventListener("input", renderLibrary);
audioPlayer.addEventListener("play", () => { playButton.textContent = "Pause"; playbackStatus.textContent = `Playing: ${currentTitle.textContent}.`; });
audioPlayer.addEventListener("pause", () => { if (!audioPlayer.ended) { playButton.textContent = "Play"; playbackStatus.textContent = "Paused."; } });
audioPlayer.addEventListener("ended", () => { playButton.textContent = "Play"; playbackStatus.textContent = "Message complete."; });
loadPlaylist();
