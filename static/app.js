const logs = document.getElementById("logs");
const count = document.getElementById("char-count");
const fileInput = document.getElementById("file-input");
const fileName = document.getElementById("file-name");
const analyzeButton = document.getElementById("analyze");
const emptyState = document.getElementById("empty-state");
const loading = document.getElementById("loading");
const errorBox = document.getElementById("error");
const results = document.getElementById("results");
let latestDiagnosis = "";

const samples = {
  docker: `2026-10-20T01:22:10Z Starting web container
2026-10-20T01:22:11Z Error: bind: address already in use
2026-10-20T01:22:11Z Failed to start server on 0.0.0.0:8080
2026-10-20T01:22:11Z Container exited with code 1`,
  k8s: `Warning FailedScheduling pod/api-7b9d4f
0/3 nodes are available: 3 Insufficient memory.
Normal BackOff Back-off restarting failed container api
Warning BackOff Back-off restarting failed container api`,
  linux: `Oct 20 01:20:15 server app[1742]: ERROR: no space left on device
Oct 20 01:20:15 server app[1742]: Failed to write temporary file
Oct 20 01:20:16 server systemd[1]: app.service: Main process exited, code=exited, status=1/FAILURE`
};
logs.addEventListener("input", () => count.textContent = `${logs.value.length.toLocaleString()} chars`);
document.querySelectorAll("[data-sample]").forEach(button => button.addEventListener("click", () => {
  logs.value = samples[button.dataset.sample];
  count.textContent = `${logs.value.length.toLocaleString()} chars`;
}));
fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showError("Please choose a file smaller than 2 MB.");
    fileInput.value = "";
    return;
  }
  logs.value = await file.text();
  count.textContent = `${logs.value.length.toLocaleString()} chars`;
  fileName.textContent = file.name;
});
function showError(message) {
  emptyState.hidden = true; loading.hidden = true; results.hidden = true;
  errorBox.textContent = message; errorBox.hidden = false;
}
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
// Minimal Markdown rendering for model output. HTML is escaped before formatting.
function renderMarkdown(markdown) {
  let html = escapeHtml(markdown);
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);
  html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>").replace(/^## (.*)$/gm, "<h2>$1</h2>").replace(/^# (.*)$/gm, "<h1>$1</h1>");
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/^\s*[-*] (.*)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, match => `<ul>${match}</ul>`);
  html = html.split(/\n{2,}/).map(part => /^(<h[1-3]|<ul>|<pre>)/.test(part.trim()) ? part : `<p>${part.replace(/\n/g,"<br>")}</p>`).join("");
  return html;
}
analyzeButton.addEventListener("click", async () => {
  if (!logs.value.trim()) { showError("Paste logs or upload a text log file first."); return; }
  errorBox.hidden = true; results.hidden = true; emptyState.hidden = true; loading.hidden = false;
  analyzeButton.disabled = true;
  try {
    const response = await fetch("/api/analyze", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({logs: logs.value, task: document.getElementById("task").value})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Analysis failed.");
    latestDiagnosis = data.analysis;
    document.getElementById("signals").innerHTML = data.signals.map(s => `<span class="signal">${escapeHtml(s)}</span>`).join("");
    document.getElementById("analysis").innerHTML = renderMarkdown(data.analysis);
    document.getElementById("model-label").textContent = `MODEL: ${data.model}`;
    loading.hidden = true; results.hidden = false;
  } catch (error) {
    showError(error.message || "Something went wrong.");
  } finally {
    analyzeButton.disabled = false;
  }
});
document.getElementById("copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(latestDiagnosis);
    document.getElementById("copy").textContent = "Copied ✓";
    setTimeout(() => document.getElementById("copy").textContent = "Copy diagnosis", 1600);
  } catch { showError("Clipboard access was blocked. Select and copy the diagnosis manually."); }
});
