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

app.get("/diag", (req, res) => {
  const { execFile: ef } = require("child_process");
  ef("sh", ["-c", "whoami && echo --- && df -h /tmp && echo --- && ls -la /tmp && echo --- && soffice --version"], (err, stdout, stderr) => {
    res.type("text/plain").send(`STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}\n\nERR:\n${err ? err.message : "none"}`);
  });
});

app.get("/diagall", (req, res) => {
  const minimalPdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 44>>stream
BT /F1 24 Tf 20 100 Td (Hello Test) Tj ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
trailer<</Size 6/Root 1 0 R>>
startxref
0
%%EOF`;

  const { execFile: ef } = require("child_process");
  let out = [];

  ef("sh", ["-c", "whoami && id && echo --- && df -h /tmp && echo --- && ls -la /tmp && echo --- && soffice --version && echo --- && which soffice && echo --- && dpkg -l | grep -i libreoffice"], (err, stdout, stderr) => {
    out.push(`=== SYSTEM INFO ===\n${stdout}\nSTDERR:${stderr}\nERR:${err ? err.message : "none"}`);

    const formats = ["docx", "odt", "txt", "pdf"];
    function testFormat(i) {
      if (i >= formats.length) {
        return res.type("text/plain").send(out.join("\n\n"));
      }
      const fmt = formats[i];
      const workDir = path.join(os.tmpdir(), randomUUID());
      fs.mkdirSync(workDir, { recursive: true, mode: 0o777 });
      const inputPath = path.join(workDir, "test.pdf");
      fs.writeFileSync(inputPath, minimalPdf);
      const profileDir = path.join(workDir, "profile");
      fs.mkdirSync(profileDir, { recursive: true, mode: 0o777 });

      execFile(
        "soffice",
        ["--headless", "--invisible", "--norestore", `-env:UserInstallation=file://${profileDir}`, "--convert-to", fmt, "--outdir", workDir, inputPath],
        { timeout: 60000, env: { ...process.env, HOME: profileDir } },
        (err2, stdout2, stderr2) => {
          const outputPath = path.join(workDir, `test.${fmt}`);
          const exists = fs.existsSync(outputPath);
          out.push(`=== FORMAT: ${fmt} ===\nSTDOUT:${stdout2}\nSTDERR:${stderr2}\nERR:${err2 ? err2.message : "none"}\nOutput exists: ${exists}`);
          cleanup(workDir);
          testFormat(i + 1);
        }
      );
    }
    testFormat(0);
  });
});

app.get("/diagfinal", (req, res) => {
  const minimalPdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 44>>stream
BT /F1 24 Tf 20 100 Td (Hello Test) Tj ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
trailer<</Size 6/Root 1 0 R>>
startxref
0
%%EOF`;

  const tests = [
    { fmt: "odt", filter: "writer8" },
    { fmt: "docx", filter: "MS Word 2007 XML" },
    { fmt: "pdf", filter: "writer_pdf_Export" }
  ];
  let out = [];

  function run(i) {
    if (i >= tests.length) return res.type("text/plain").send(out.join("\n\n"));
    const { fmt, filter } = tests[i];
    const workDir = path.join(os.tmpdir(), randomUUID());
    fs.mkdirSync(workDir, { recursive: true, mode: 0o777 });
    const inputPath = path.join(workDir, "source.pdf");
    fs.writeFileSync(inputPath, minimalPdf);
    const profileDir = path.join(os.tmpdir(), "profile-" + randomUUID());
    fs.mkdirSync(profileDir, { recursive: true, mode: 0o777 });

    execFile(
      "soffice",
      ["--headless", "--invisible", "--norestore", `-env:UserInstallation=file://${profileDir}`, "--convert-to", `${fmt}:${filter}`, "--outdir", workDir, inputPath],
      { timeout: 60000, env: { ...process.env, HOME: profileDir } },
      (err, stdout, stderr) => {
        const outputPath = path.join(workDir, `source.${fmt}`);
        const exists = fs.existsSync(outputPath);
        const size = exists ? fs.statSync(outputPath).size : 0;
        out.push(`=== ${fmt} (filter: ${filter}) ===\nSTDOUT:${stdout}\nSTDERR:${stderr}\nERR:${err ? err.message : "none"}\nExists:${exists} Size:${size}`);
        cleanup(workDir);
        cleanup(profileDir);
        run(i + 1);
      }
    );
  }
  run(0);
});

app.get("/diagdeep", (req, res) => {
  const minimalPdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 44>>stream
BT /F1 24 Tf 20 100 Td (Hello Test) Tj ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
trailer<</Size 6/Root 1 0 R>>
startxref
0
%%EOF`;
  let out = [];

  function convert(inputPath, workDir, fmt, filter, cb) {
    const profileDir = path.join(os.tmpdir(), "profile-" + randomUUID());
    fs.mkdirSync(profileDir, { recursive: true, mode: 0o777 });
    execFile(
      "soffice",
      ["--headless", "--invisible", "--norestore", `-env:UserInstallation=file://${profileDir}`, "--convert-to", `${fmt}:${filter}`, "--outdir", workDir, inputPath],
      { timeout: 60000, env: { ...process.env, HOME: profileDir } },
      (err, stdout, stderr) => {
        const base = path.basename(inputPath, path.extname(inputPath));
        const outputPath = path.join(workDir, `${base}.${fmt}`);
        const exists = fs.existsSync(outputPath);
        out.push(`--- ${fmt} (${filter}) from ${path.basename(inputPath)} ---\nSTDOUT:${stdout}\nSTDERR:${stderr}\nERR:${err ? err.message : "none"}\nExists:${exists}`);
        cleanup(profileDir);
        cb(exists ? outputPath : null);
      }
    );
  }

  // Test A: direct pdf -> docx
  const wdA = path.join(os.tmpdir(), randomUUID());
  fs.mkdirSync(wdA, { recursive: true, mode: 0o777 });
  const pdfA = path.join(wdA, "a.pdf");
  fs.writeFileSync(pdfA, minimalPdf);

  convert(pdfA, wdA, "docx", "MS Word 2007 XML", (docxDirect) => {
    // Test B: pdf -> odt -> docx (two-step)
    const wdB = path.join(os.tmpdir(), randomUUID());
    fs.mkdirSync(wdB, { recursive: true, mode: 0o777 });
    const pdfB = path.join(wdB, "b.pdf");
    fs.writeFileSync(pdfB, minimalPdf);

    convert(pdfB, wdB, "odt", "writer8", (odtOut) => {
      if (!odtOut) {
        cleanup(wdA); cleanup(wdB);
        return res.type("text/plain").send(out.join("\n\n"));
      }
      convert(odtOut, wdB, "docx", "MS Word 2007 XML", (docxFromOdt) => {
        // Test C: pptx and xlsx direct
        const wdC = path.join(os.tmpdir(), randomUUID());
        fs.mkdirSync(wdC, { recursive: true, mode: 0o777 });
        const pdfC = path.join(wdC, "c.pdf");
        fs.writeFileSync(pdfC, minimalPdf);
        convert(pdfC, wdC, "pptx", "Impress MS PowerPoint 2007 XML", (pptxOut) => {
          convert(pdfC, wdC, "xlsx", "Calc MS Excel 2007 XML", (xlsxOut) => {
            cleanup(wdA); cleanup(wdB); cleanup(wdC);
            res.type("text/plain").send(out.join("\n\n"));
          });
        });
      });
    });
  });
});

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
    // Use pdf2docx (Python) - LibreOffice's DOCX exporter has a bug with
    // PDF-imported content (confirmed via testing: fails even via ODT
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