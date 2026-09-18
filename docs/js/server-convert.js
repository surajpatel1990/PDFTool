// Change this to your deployed Render backend URL
const API_BASE = "https://pdftool-4x5t.onrender.com";

async function convertOnServer(file, targetFormat, statusEl, downloadName) {
  statusEl.textContent = "Uploading & converting... (first request may take 30s - server waking up)";
  const formData = new FormData();
  formData.append("file", file);
  formData.append("target", targetFormat);

  const res = await fetch(`${API_BASE}/convert`, {
    method: "POST",
    body: formData
  });

  if (!res.ok) {
    statusEl.textContent = "Conversion failed. Try again.";
    throw new Error("Conversion failed");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = downloadName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  statusEl.textContent = "Done!";
}
