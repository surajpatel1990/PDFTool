const express = require("express");
const multer = require("multer");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { randomUUID } = require("crypto");

const app = express();
const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB cap

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.get("/", (req, res) => res.send("PDF converter API is running."));

const ALLOWED_TARGETS = new Set(["docx", "pptx", "xlsx", "pdf"]);

app.post("/convert", upload.single("file"), async (req, res) => {
  const target = req.body.target;
  if (!req.file || !ALLOWED_TARGETS.has(target)) {
    return res.status(400).send("Invalid request");
  }

  const workDir = path.join(os.tmpdir(), randomUUID());
  fs.mkdirSync(workDir);
  const inputPath = path.join(workDir, req.file.originalname || "input");
  fs.renameSync(req.file.path, inputPath);

  const profileDir = path.join(workDir, "profile");
  fs.mkdirSync(profileDir);

  const FILTER_MAP = {
    docx: "docx:MS Word 2007 XML",
    pptx: "pptx:Impress MS PowerPoint 2007 XML",
    xlsx: "xlsx:Calc MS Excel 2007 XML"
  };
  const convertArg = FILTER_MAP[target] || target;

  execFile(
    "soffice",
    [
      "--headless",
      "--norestore",
      `-env:UserInstallation=file://${profileDir}`,
      "--convert-to", convertArg,
      "--outdir", workDir,
      inputPath
    ],
    { timeout: 90000 },
    (err, stdout, stderr) => {
      console.log("soffice stdout:", stdout);
      console.log("soffice stderr:", stderr);
      if (err) {
        console.log("soffice exec error:", err.message);
        cleanup(workDir);
        return res.status(500).send("Conversion failed");
      }
      const base = path.basename(inputPath, path.extname(inputPath));
      const outputPath = path.join(workDir, `${base}.${target}`);
      if (!fs.existsSync(outputPath)) {
        console.log("Expected output not found at:", outputPath);
        console.log("Files in workDir:", fs.readdirSync(workDir));
        cleanup(workDir);
        return res.status(500).send("Conversion failed - output missing");
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