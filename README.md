# PDF Tools 🛠️

Free, privacy-first PDF toolkit. Merge, split, rotate PDFs, convert PDF to Word/PowerPoint/JPG and back — all in your browser or via a lightweight free API. No signup, no watermark, no file storage.

**🔗 Live: https://surajpatel1990.github.io/PDFTool/**

## Features

### Client-side (100% browser, no upload)
- **Merge PDF** — combine multiple PDFs into one
- **Split PDF** — extract specific pages or ranges
- **Rotate PDF** — fix page orientation
- **PDF to JPG** — export pages as images
- **Image to PDF** — convert JPG/PNG to PDF
- **PDF to Text** — extract raw text content

### Server-powered (free API, LibreOffice + Python)
- **PDF to Word (.docx)** — powered by `pdf2docx`
- **PDF to PowerPoint (.pptx)** — powered by LibreOffice
- **Word/PowerPoint/Excel to PDF** — powered by LibreOffice

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | HTML, CSS, vanilla JS |
| Client-side PDF processing | [pdf-lib](https://pdf-lib.js.org/), [pdf.js](https://mozilla.github.io/pdf.js/), [jsPDF](https://github.com/parallax/jsPDF) |
| Backend | Node.js + Express |
| Document conversion | LibreOffice (headless), [pdf2docx](https://github.com/dothinking/pdf2docx) (Python) |
| Hosting (frontend) | GitHub Pages |
| Hosting (backend) | Render (free tier) |

## Project Structure

```
docs/                   → frontend, deployed via GitHub Pages
├── index.html
├── css/style.css
├── js/server-convert.js
├── tools/               → one page per tool
├── robots.txt
└── sitemap.xml

backend/                 → API, deployed via Render
├── server.js
├── Dockerfile            (installs LibreOffice + Python + pdf2docx)
└── package.json
```

## Local Development

**Frontend** — just open `docs/index.html` in a browser, or serve it:
```bash
cd docs
python3 -m http.server 8080
```

**Backend**:
```bash
cd backend
npm install
node server.js
```
Requires LibreOffice (`soffice`) and Python 3 with `pdf2docx` installed locally to test conversions, or just build via Docker:
```bash
docker build -t pdftool-backend .
docker run -p 3000:3000 pdftool-backend
```

## Deployment

### Frontend (GitHub Pages)
Settings → Pages → Source: `main` branch, folder `/docs`.

### Backend (Render)
1. New Web Service → connect this repo → root directory `backend`
2. Render auto-detects the Dockerfile and builds it
3. Free tier spins down when idle — first request after idle takes ~30-50s (cold start)
4. Copy the Render URL into `docs/js/server-convert.js`:
   ```js
   const API_BASE = "https://your-render-url.onrender.com";
   ```

## Known Limitations

- **PDF to Excel** is not supported — arbitrary PDF layouts don't map reliably to tabular data with free/open-source tools, and testing showed LibreOffice crashes on this conversion path.
- Render free tier has ~512MB RAM — very large or complex PDFs may fail server-side conversion.
- Cold starts (~30-50s) on the first request after 15 minutes of inactivity (Render free tier limitation).

## Privacy

- Client-side tools never leave your browser — no upload, no server involved.
- Server-powered tools process files in a temp directory and delete them immediately after the response is sent. Nothing is stored.

## License

Personal project — feel free to fork and adapt.