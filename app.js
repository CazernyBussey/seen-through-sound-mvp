const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
const MAX_SECONDS = 90;

const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let mediaRecorder;
let chunks = [];
let audioBlob;
let timerInterval;
let elapsedSeconds = 0;
let stream;

const recordButton = document.getElementById("recordButton");
const stopButton = document.getElementById("stopButton");
const resetButton = document.getElementById("resetButton");
const submitButton = document.getElementById("submitButton");
const statusText = document.getElementById("statusText");
const timerText = document.getElementById("timerText");
const previewWrap = document.getElementById("previewWrap");
const previewAudio = document.getElementById("previewAudio");
const form = document.getElementById("submissionForm");

function setStatus(message) {
  statusText.textContent = message;
}

function updateTimer() {
  elapsedSeconds += 1;
  timerText.textContent = `${elapsedSeconds} ${elapsedSeconds === 1 ? "second" : "seconds"}`;
  if (elapsedSeconds >= MAX_SECONDS) stopRecording();
}

function resetRecording() {
  chunks = [];
  audioBlob = null;
  elapsedSeconds = 0;
  timerText.textContent = "0 seconds";
  previewAudio.removeAttribute("src");
  previewWrap.classList.add("hidden");
  submitButton.disabled = true;
  resetButton.disabled = true;
  setStatus("Ready to record.");
}

async function startRecording() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    chunks = [];
    mediaRecorder.addEventListener("dataavailable", event => {
      if (event.data.size > 0) chunks.push(event.data);
    });
    mediaRecorder.addEventListener("stop", () => {
      audioBlob = new Blob(chunks, { type: mediaRecorder.mimeType || "audio/webm" });
      previewAudio.src = URL.createObjectURL(audioBlob);
      previewWrap.classList.remove("hidden");
      submitButton.disabled = false;
      resetButton.disabled = false;
      stream?.getTracks().forEach(track => track.stop());
      setStatus("Recording stopped. Preview your message before submitting.");
    });
    mediaRecorder.start();
    recordButton.disabled = true;
    stopButton.disabled = false;
    resetButton.disabled = true;
    submitButton.disabled = true;
    elapsedSeconds = 0;
    timerText.textContent = "0 seconds";
    timerInterval = setInterval(updateTimer, 1000);
    setStatus("Recording started.");
  } catch (error) {
    console.error(error);
    setStatus("Microphone access failed. Please allow microphone permission and try again.");
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    clearInterval(timerInterval);
    recordButton.disabled = false;
    stopButton.disabled = true;
  }
}

async function submitRecording(event) {
  event.preventDefault();
  if (!audioBlob) {
    setStatus("Please record a message before submitting.");
    return;
  }
  if (!supabaseClient || SUPABASE_URL.includes("YOUR_") || SUPABASE_ANON_KEY.includes("YOUR_")) {
    setStatus("Supabase is not configured yet. Add your Supabase URL and anon key in app.js.");
    return;
  }

  submitButton.disabled = true;
  setStatus("Uploading your message for review.");

  const speakerName = document.getElementById("speakerName").value.trim();
  const speakerEmail = document.getElementById("speakerEmail").value.trim();
  const messageTitle = document.getElementById("messageTitle").value.trim();
  const anonymous = document.getElementById("anonymous").checked;
  const extension = audioBlob.type.includes("webm") ? "webm" : "ogg";
  const filePath = `pending/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabaseClient.storage
    .from("encouragement-audio")
    .upload(filePath, audioBlob, { contentType: audioBlob.type, upsert: false });

  if (uploadError) {
    console.error(uploadError);
    setStatus("Upload failed. Please try again.");
    submitButton.disabled = false;
    return;
  }

  const { data: publicUrlData } = supabaseClient.storage
    .from("encouragement-audio")
    .getPublicUrl(filePath);

  const shareSlug = crypto.randomUUID().slice(0, 12);
  const { error: insertError } = await supabaseClient.from("submissions").insert({
    speaker_name: speakerName || null,
    speaker_email: speakerEmail || null,
    anonymous,
    title: messageTitle || "Encouragement Message",
    original_audio_url: publicUrlData.publicUrl,
    status: "pending",
    share_slug: shareSlug
  });

  if (insertError) {
    console.error(insertError);
    setStatus("Your audio uploaded, but the submission record failed. Please contact the administrator.");
    return;
  }

  form.reset();
  resetRecording();
  setStatus("Submission received. Thank you for sharing encouragement.");
}

recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);
resetButton.addEventListener("click", resetRecording);
form.addEventListener("submit", submitRecording);
