const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginForm = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");
const settingsForm = document.getElementById("settingsForm");
const settingsStatus = document.getElementById("settingsStatus");
const refreshButton = document.getElementById("refreshButton");
const queueStatus = document.getElementById("queueStatus");
const queue = document.getElementById("queue");

function configured() {
  return supabaseClient && !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!configured()) {
    loginStatus.textContent = "Supabase is not configured yet. Add your Supabase URL and anon key in admin.js.";
    return;
  }
  const email = document.getElementById("adminEmail").value.trim();
  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.href }
  });
  loginStatus.textContent = error ? `Sign-in failed: ${error.message}` : "Check your email for the admin sign-in link.";
});

settingsForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!configured()) {
    settingsStatus.textContent = "Supabase is not configured yet.";
    return;
  }
  const intro = document.getElementById("introUrl").value.trim() || null;
  const outro = document.getElementById("outroUrl").value.trim() || null;
  const { error } = await supabaseClient.from("settings").upsert({
    id: 1,
    intro_audio_url: intro,
    outro_audio_url: outro,
    organization_name: "Even Though I’m Blind, Inc.",
    max_recording_seconds: 90
  });
  settingsStatus.textContent = error ? `Settings failed: ${error.message}` : "Intro and outro URLs saved.";
});

function itemLabel(item) {
  const name = item.anonymous || !item.speaker_name ? "Anonymous" : item.speaker_name;
  return `${item.title || "Encouragement Message"} from ${name}`;
}

async function updateStatus(id, status) {
  const patch = { status };
  if (status === "published") {
    patch.approved_at = new Date().toISOString();
    patch.published_at = new Date().toISOString();
  }
  const { error } = await supabaseClient.from("submissions").update(patch).eq("id", id);
  if (error) {
    queueStatus.textContent = `Update failed: ${error.message}`;
    return;
  }
  await loadQueue();
}

async function loadQueue() {
  if (!configured()) {
    queueStatus.textContent = "Supabase is not configured yet. Add your Supabase URL and anon key in admin.js.";
    return;
  }

  const { data: sessionData } = await supabaseClient.auth.getSession();
  if (!sessionData.session) {
    queueStatus.textContent = "Sign in to review submissions.";
    return;
  }

  const { data, error } = await supabaseClient
    .from("submissions")
    .select("id,title,speaker_name,speaker_email,anonymous,original_audio_url,status,created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    queueStatus.textContent = `Queue failed: ${error.message}`;
    return;
  }

  queue.innerHTML = "";
  if (!data || data.length === 0) {
    queueStatus.textContent = "No pending submissions.";
    return;
  }
  queueStatus.textContent = `${data.length} pending submission${data.length === 1 ? "" : "s"}.`;

  data.forEach(item => {
    const article = document.createElement("article");
    article.className = "submission-item";
    const h3 = document.createElement("h3");
    h3.textContent = itemLabel(item);
    const meta = document.createElement("p");
    meta.textContent = `Email: ${item.speaker_email || "not provided"}. Submitted: ${new Date(item.created_at).toLocaleString()}.`;
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = item.original_audio_url;
    const actions = document.createElement("div");
    actions.className = "controls";
    const approve = document.createElement("button");
    approve.type = "button";
    approve.className = "success";
    approve.textContent = "Approve and Publish";
    approve.addEventListener("click", () => updateStatus(item.id, "published"));
    const reject = document.createElement("button");
    reject.type = "button";
    reject.className = "danger";
    reject.textContent = "Reject";
    reject.addEventListener("click", () => updateStatus(item.id, "rejected"));
    actions.append(approve, reject);
    article.append(h3, meta, audio, actions);
    queue.append(article);
  });
}

refreshButton.addEventListener("click", loadQueue);
window.addEventListener("load", loadQueue);
