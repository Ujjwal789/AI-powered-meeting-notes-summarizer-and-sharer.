// Set your backend API base URL here:
const API_BASE = localStorage.getItem("API_BASE") || "http://localhost:8080";

document.getElementById("backendUrl").textContent = API_BASE;

const $ = (id) => document.getElementById(id);

$("btnGenerate").onclick = async () => {
  $("genStatus").textContent = "Generating summary...";
  const file = $("file").files[0];
  const transcript = $("transcript").value;
  const prompt = $("prompt").value;

  const form = new FormData();
  if (file) form.append("file", file);
  if (transcript) form.append("transcript", transcript);
  if (prompt) form.append("prompt", prompt);

  try {
    const resp = await fetch(`${API_BASE}/api/summarize`, {
      method: "POST",
      body: form
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || "Failed to summarize");
    $("summary").value = data.summary || "";
    $("genStatus").textContent = "Done.";
  } catch (e) {
    $("genStatus").textContent = "Error: " + e.message;
  }
};

$("btnSend").onclick = async () => {
  $("sendStatus").textContent = "Sending...";
  const to = $("to").value.trim();
  const subject = $("subject").value.trim();
  const summary = $("summary").value.trim();

  if (!to || !summary) {
    $("sendStatus").textContent = "Recipient and summary are required.";
    return;
  }

  try {
    const resp = await fetch(`${API_BASE}/api/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, summary })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || "Failed to send email");
    $("sendStatus").textContent = "Email sent ✔";
  } catch (e) {
    $("sendStatus").textContent = "Error: " + e.message;
  }
};

// Small helper to let you change backend URL without rebuilding:
(() => {
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "b" && (e.ctrlKey || e.metaKey)) {
      const url = prompt("Set API base URL:", API_BASE);
      if (url) {
        localStorage.setItem("API_BASE", url);
        location.reload();
      }
    }
  });
})();
