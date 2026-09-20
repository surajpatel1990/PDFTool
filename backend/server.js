const express = require("express");
const multer = require("multer");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { randomUUID } = require("crypto");

const app = express();
const upload = multer({ dest: os.tmpdir() }); // no size cap

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.get("/", (req, res) => res.send("PDF converter API is running."));

const ALLOWED_TARGETS = new Set(["docx", "pptx", "pdf"]);

app.post("/convert", upload.single("file"), async (req, res) => {
  const target = req.body.target;
  if (!req.file || !ALLOWED_TARGETS.has(target)) {
    return res.status(400).send("Invalid or unsupported target format");
  }

  const workDir = path.join(os.tmpdir(), randomUUID());
  fs.mkdirSync(workDir, { recursive: true, mode: 0o777 });
  const inputPath = path.join(workDir, req.file.originalname || "input");
  fs.renameSync(req.file.path, inputPath);
  const base = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(workDir, `${base}.${target}`);

  if (target === "docx") {
    // pdf2docx (Python) - LibreOffice's DOCX exporter has a bug with
    // PDF-imported content, confirmed via testing (fails even via ODT
    // intermediate, while ODT/PPTX exports work fine)
    execFile(
      "python3",
      ["-c",
        `from pdf2docx import Converter; cv = Converter("${inputPath}"); cv.convert("${outputPath}"); cv.close()`
      ],
      { timeout: 90000 },
      (err, stdout, stderr) => {
        if (err || !fs.existsSync(outputPath)) {
          console.log("pdf2docx error:", err ? err.message : "output missing", stderr);
          cleanup(workDir);
          return res.status(500).send("Conversion failed");
        }
        res.download(outputPath, "converted.docx", () => cleanup(workDir));
      }
    );
    return;
  }

  // pptx and pdf (office-to-pdf) use LibreOffice - these work reliably
  const profileDir = path.join(workDir, "profile");
  fs.mkdirSync(profileDir, { recursive: true, mode: 0o777 });

  const FILTER_MAP = {
    pptx: "pptx:Impress MS PowerPoint 2007 XML"
  };
  const convertArg = FILTER_MAP[target] || target;

  execFile(
    "soffice",
    [
      "--headless",
      "--invisible",
      "--nocrashreport",
      "--nodefault",
      "--norestore",
      "--nolockcheck",
      "--nologo",
      "--nofirststartwizard",
      `-env:UserInstallation=file://${profileDir}`,
      "--convert-to", convertArg,
      "--outdir", workDir,
      inputPath
    ],
    { timeout: 90000, env: { ...process.env, HOME: profileDir } },
    (err, stdout, stderr) => {
      if (err || !fs.existsSync(outputPath)) {
        console.log("soffice error:", err ? err.message : "output missing", stderr);
        cleanup(workDir);
        return res.status(500).send("Conversion failed");
      }
      res.download(outputPath, `converted.${target}`, () => cleanup(workDir));
    }
  );
});

function cleanup(dir) {
  fs.rm(dir, { recursive: true, force: true }, () => {});
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));