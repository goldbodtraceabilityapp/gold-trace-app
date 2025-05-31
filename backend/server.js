// GOLDBOD GOLD TRACEABILITY APP - Backend Server
// 2. Import dependencies
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
// 1. Load environment variables
require("dotenv").config();

// 3. Initialize Supabase client (using service role key)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Use memory storage so files are available as buffers
const upload = multer({ storage: multer.memoryStorage() });

// 4. Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// 5. Auth middleware (must come before protected routes)
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id };
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// 6. Public Routes
app.get("/", (req, res) => {
  res.send("Welcome to the GOLDBOD GOLD TRACEABILITY APP!");
});
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

// 7. Authentication Routes
app.post("/auth/register", async (req, res) => {
  const { username, password } = req.body;
  const password_hash = await bcrypt.hash(password, 10);
  const { error } = await supabase
    .from("users")
    .insert([{ username, password_hash }]);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: "User registered!" });
});

app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .single();

  if (error || !user) return res.status(400).json({ error: "User not found" });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: "Invalid password" });

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: "8h",
  });
  res.json({ token });
});

// 8. Protected Routes
app.use("/mines", authenticate);
app.use("/batches", authenticate);

// 8.5. User info endpoint (add after authentication routes, before protected routes)
app.get("/user/me", authenticate, async (req, res) => {
  // req.user.id is set by the authenticate middleware
  const { data: user, error } = await supabase
    .from("users")
    .select("id, username") // select only safe fields
    .eq("id", req.user.id)
    .single();

  if (error || !user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// 9. Mines Endpoints
app.get("/mines", async (req, res) => {
  const { data, error } = await supabase.from("mines").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/mines", async (req, res) => {
  const { name, type, location, license_number } = req.body;

  // Insert and ask Supabase to return the inserted row
  const { data, error } = await supabase
    .from("mines")
    .insert([{ name, type, location, license_number }])
    .select() // ← add this
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }
  res.json(data);
});

// POST /batches with file uploads
app.post(
  "/batches",
  authenticate,
  upload.fields([
    { name: "origin_cert", maxCount: 1 },
    { name: "dealer_license", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // 1. Validate required form fields
      const { mine_id, date_collected, weight_kg } = req.body;
      if (!mine_id || !date_collected || !weight_kg) {
        return res
          .status(400)
          .json({ error: "Missing mine_id, date_collected, or weight_kg" });
      }

      // 2. Validate uploaded files
      const originFiles = req.files.origin_cert;
      const licenseFiles = req.files.dealer_license;
      if (!originFiles || originFiles.length === 0) {
        return res.status(400).json({ error: "Missing origin_cert file" });
      }
      if (!licenseFiles || licenseFiles.length === 0) {
        return res.status(400).json({ error: "Missing dealer_license file" });
      }

      const batch_id = `BATCH-${Date.now()}`;

      // 3. Upload origin certificate image
      const originFile = originFiles[0];
      const originPath = `origin-certs/${batch_id}-${originFile.originalname}`;
      await supabase.storage
        .from("origin-certs")
        .upload(originPath, originFile.buffer, {
          contentType: originFile.mimetype,
        });
      const { data: originData, error: originUrlError } = supabase.storage
        .from("origin-certs")
        .getPublicUrl(originPath);
      if (originUrlError) throw originUrlError;
      const origin_cert_image_url = originData.publicUrl;

      // 4. Upload dealer license image
      const licenseFile = licenseFiles[0];
      const licensePath = `dealer-licenses/${batch_id}-${licenseFile.originalname}`;
      await supabase.storage
        .from("dealer-licenses")
        .upload(licensePath, licenseFile.buffer, {
          contentType: licenseFile.mimetype,
        });
      const { data: licenseData, error: licenseUrlError } = supabase.storage
        .from("dealer-licenses")
        .getPublicUrl(licensePath);
      if (licenseUrlError) throw licenseUrlError;
      const dealer_license_image_url = licenseData.publicUrl;

      // 5. Insert batch record (without assay fields)
      const { data, error } = await supabase
        .from("batches")
        .insert([
          {
            batch_id,
            mine_id,
            date_collected,
            weight_kg,
            origin_cert_image_url,
            dealer_license_image_url,
          },
        ])
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      // 6. Return the newly created batch
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Upload or database error" });
    }
  }
);

// PATCH /batches/:id/assay — upload purity % and assay PDF
app.patch(
  '/batches/:id/assay',
  authenticate,
  upload.single('assay_report'),
  async (req, res) => {
    try {
      const batchId = req.params.id;
      const { purity_percent } = req.body;
      const file = req.file;

      // 1) Validate inputs
      if (!purity_percent || !file) {
        return res.status(400).json({ error: 'Missing purity_percent or assay_report file' });
      }

      // 2) Upload the PDF
      const pdfPath = `assay-reports/${batchId}-${file.originalname}`;
      await supabase.storage
        .from('assay-reports')
        .upload(pdfPath, file.buffer, { contentType: file.mimetype });
      const { data: pdfData, error: urlError } = supabase.storage
        .from('assay-reports')
        .getPublicUrl(pdfPath);
      if (urlError) throw urlError;
      const assay_report_pdf_url = pdfData.publicUrl;

      // 3) Update the batch row
      const { data, error } = await supabase
        .from('batches')
        .update({
          purity_percent: parseFloat(purity_percent),
          assay_report_pdf_url
        })
        .eq('id', batchId)
        .select()
        .single();

      if (error) return res.status(400).json({ error: error.message });
      res.json(data);

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Assay upload or database error' });
    }
  }
);


// 11. Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
