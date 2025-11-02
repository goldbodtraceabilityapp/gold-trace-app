// GOLDBOD GOLD TRACEABILITY APP - Backend SERVER

// 1. Load environment variables
require("dotenv").config();

// 2. Import dependencies
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { Pool } = require("pg");
const { createClient } = require("@supabase/supabase-js");
const authenticate = require("./middleware/authenticate");
const cookieParser = require("cookie-parser");

// 3. Initialize PostgreSQL client
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 3.5. Initialize Supabase client (for storage only)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Use memory storage so files are available as buffers
const upload = multer({ storage: multer.memoryStorage() });

// 4. Create Express app
const app = express();
//app.use(cors());
app.use(express.json());
app.use(cookieParser());

const corsOptions = {
  origin: process.env.NODE_ENV === "production" ? undefined : "http://localhost:3000",
  credentials: true,
};
app.use(cors(corsOptions));

// 6. Public Routes

// 7. Authentication Routes
app.post("/auth/register", async (req, res) => {
  const { username, password } = req.body;
  const password_hash = await bcrypt.hash(password, 10);

  try {
    await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2)",
      [username, password_hash]
    );
    res.json({ message: "User registered!" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1 LIMIT 1",
      [username]
    );
    const user = result.rows[0];
    if (!user) return res.status(400).json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid password" });

    // Access token: short-lived (e.g. 15m)
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "20h",
      }
    );

    // Refresh token: long-lived (e.g. 7d)  
    const refreshToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true, // only over HTTPS
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      })
      .json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/auth/refresh", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken)
    return res.status(401).json({ error: "Missing refresh token" });

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    // Issue new access token
    const token = jwt.sign(
      { id: payload.id, role: payload.role },
      process.env.JWT_SECRET,
      { expiresIn: "20h" }
    );
    res.json({ token });
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

// 8. Protected Routes
app.use("/mines", authenticate);
app.use("/batches", authenticate);

// 8.5. User info endpoint (add after authentication routes)
app.get("/user/me", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, role FROM users WHERE id = $1",
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /batches (list all batches for this user)
app.get("/batches", authenticate, async (req, res) => {
  try {
    let batches = [];
    if (req.user.role === "dealer") {
      // Dealer: batches where this dealer has accepted the invite
      const invitesResult = await pool.query(
        "SELECT batch_id FROM dealer_invitations WHERE dealer_username = $1 AND accepted = true",
        [req.user.username]
      );
      const batchIds = invitesResult.rows.map((inv) => inv.batch_id);
      if (batchIds.length === 0) return res.json([]);
      const batchesResult = await pool.query(
        `SELECT * FROM batches WHERE id = ANY($1::int[])`,
        [batchIds]
      );
      batches = batchesResult.rows;
    } else if (req.user.role === "goldbod") {
      // Goldbod: batches where this goldbod has accepted the invite
      const invitesResult = await pool.query(
        "SELECT batch_id FROM goldbod_invitations WHERE goldbod_username = $1 AND accepted = true",
        [req.user.username]
      );
      const batchIds = invitesResult.rows.map((inv) => inv.batch_id);
      if (batchIds.length === 0) return res.json([]);
      const batchesResult = await pool.query(
        `SELECT * FROM batches WHERE id = ANY($1::int[])`,
        [batchIds]
      );
      batches = batchesResult.rows;
    } else {
      // ASM: show their own batches
      const batchesResult = await pool.query(
        "SELECT * FROM batches WHERE user_id = $1",
        [req.user.id]
      );
      batches = batchesResult.rows;
    }
    res.json(batches);
  } catch (err) {
    console.error("GET /batches error:", err);
    res.status(500).json({ error: "Server error fetching batches." });
  }
});

// GET /batches/:id (get a single batch by its primary key)
app.get("/batches/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM batches WHERE id = $1", [
      id,
    ]);
    const batch = result.rows[0];
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    // --- ADD THIS BLOCK ---
    if (batch.date_collected && typeof batch.date_collected !== "string") {
      batch.date_collected = batch.date_collected.toISOString().slice(0, 10);
    }
    // --- END BLOCK ---

    res.json(batch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /mines (role‐aware: returns only mines the user owns, unless they’re “goldbod”)
app.get("/mines", authenticate, async (req, res) => {
  try {
    const userResult = await pool.query(
      "SELECT id, role FROM users WHERE id = $1",
      [req.user.id]
    );
    const currentUser = userResult.rows[0];
    if (!currentUser) {
      return res.status(404).json({ error: "User not found." });
    }

    let minesResult;
    if (currentUser.role === "asm") {
      minesResult = await pool.query(
        "SELECT id, name, type, location, license_number, user_id FROM mines WHERE user_id = $1",
        [req.user.id]
      );
    } else {
      minesResult = await pool.query(
        "SELECT id, name, type, location, license_number, user_id FROM mines"
      );
    }
    res.json(minesResult.rows);
  } catch (err) {
    console.error("GET /mines error:", err);
    res.status(500).json({ error: "Server error fetching mines." });
  }
});

// POST /mines (create a new mine, now requiring name, type, location, license_number)
app.post("/mines", authenticate, async (req, res) => {
  try {
    const { name, type, location, license_number } = req.body;
    if (!name || !type || !location || !license_number) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const result = await pool.query(
      "INSERT INTO mines (name, type, location, license_number, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [
        name.trim(),
        type.trim(),
        location.trim(),
        license_number.trim(),
        req.user.id,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("POST /mines error:", err);
    res.status(500).json({ error: "Server error creating mine." });
  }
});

// POST /batches with file uploads
app.post(
  "/batches",
  authenticate,
  upload.fields([
    { name: "origin_cert", maxCount: 1 },
    // dealer_license is now optional, so don't require it
  ]),
  async (req, res) => {
    try {
      const userId = req.user.id;

      // 1️⃣ Fetch this user’s role from “users”:
      const userResult = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [userId]
      );
      const currentUser = userResult.rows[0];
      if (!currentUser) {
        return res.status(404).json({ error: "User not found." });
      }

      // 2️⃣ If role !== "asm", forbid:
      if (currentUser.role !== "asm") {
        return res
          .status(403)
          .json({ error: "Forbidden: Only ASM users can register batches." });
      }

      // 3️⃣ Extract form fields + user_id
      const { mine_id, date_collected, weight_kg } = req.body;
      if (!mine_id || !date_collected || !weight_kg) {
        return res
          .status(400)
          .json({ error: "Missing mine_id, date_collected, or weight_kg" });
      }

      // 4️⃣ Ensure origin_cert file was uploaded
      const originFiles = req.files.origin_cert;
      if (!originFiles || originFiles.length === 0) {
        return res.status(400).json({ error: "Missing origin_cert file" });
      }

      // 5️⃣ Count existing batches for this user to generate batch_id
      const countResult = await pool.query(
        "SELECT COUNT(id) FROM batches WHERE user_id = $1",
        [userId]
      );
      const userBatchCount = parseInt(countResult.rows[0].count, 10) || 0;
      const nextNumber = userBatchCount + 1;
      const batch_id = `BATCH-${nextNumber}`;

      // 6️⃣ Upload origin certificate image to Supabase Storage
      const originFile = originFiles[0];
      const originPath = `origin-certs/${batch_id}-${originFile.originalname}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("origin-certs")
        .upload(originPath, originFile.buffer, {
          contentType: originFile.mimetype,
        });
      const { data: originData, error: originUrlError } = supabase.storage
        .from("origin-certs")
        .getPublicUrl(originPath);
      if (originUrlError) throw originUrlError;
      const origin_cert_image_url = originData.publicUrl;

      // 7️⃣ Dealer license is now optional
      let dealer_license_image_url = null;
      if (req.files.dealer_license && req.files.dealer_license.length > 0) {
        const licenseFile = req.files.dealer_license[0];
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
        dealer_license_image_url = licenseData.publicUrl;
      }

      // 8️⃣ Insert the new batch row
      const insertResult = await pool.query(
        `INSERT INTO batches
          (user_id, batch_id, mine_id, date_collected, weight_kg, origin_cert_image_url, dealer_license_image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          userId,
          batch_id,
          mine_id,
          date_collected,
          weight_kg,
          origin_cert_image_url,
          dealer_license_image_url,
        ]
      );
      const newBatch = insertResult.rows[0];

      // 9️⃣ Return the newly created batch
      return res.json(newBatch);
    } catch (err) {
      console.error("POST /batches error:", err);
      return res.status(500).json({ error: "Upload or database error" });
    }
  }
);

// PATCH /batches/:id/assay — upload purity % and assay PDF
app.patch(
  "/batches/:id/assay",
  authenticate,
  upload.single("assay_report"),
  async (req, res) => {
    try {
      const batchId = req.params.id;
      const { purity_percent } = req.body;
      const file = req.file;

      // 1) Validate inputs
      if (!purity_percent || !file) {
        return res
          .status(400)
          .json({ error: "Missing purity_percent or assay_report file" });
      }

      // 2) Upload the PDF
      const pdfPath = `assay-reports/${batchId}-${file.originalname}`;
      await supabase.storage
        .from("assay-reports")
        .upload(pdfPath, file.buffer, { contentType: file.mimetype });
      const { data: pdfData, error: urlError } = supabase.storage
        .from("assay-reports")
        .getPublicUrl(pdfPath);
      if (urlError) throw urlError;
      const assay_report_pdf_url = pdfData.publicUrl;

      // 3) Update the batch row, including assay_completed_at
      const updateResult = await pool.query(
        `UPDATE batches
         SET purity_percent = $1,
             assay_report_pdf_url = $2,
             assay_completed_at = $3
         WHERE id = $4
         RETURNING *`,
        [
          parseFloat(purity_percent),
          assay_report_pdf_url,
          new Date().toISOString(),
          batchId,
        ]
      );
      const updatedBatch = updateResult.rows[0];
      if (!updatedBatch)
        return res.status(404).json({ error: "Batch not found" });
      res.json(updatedBatch);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Assay upload or database error" });
    }
  }
);

// PATCH /batches/:id/dealer-receive
app.patch(
  "/batches/:id/dealer-receive",
  authenticate,
  upload.single("dealer_license"),
  async (req, res) => {
    try {
      const batchId = req.params.id;

      // Only dealer can update
      const userResult = await pool.query(
        "SELECT role, username FROM users WHERE id = $1",
        [req.user.id]
      );
      const user = userResult.rows[0];
      if (!user || user.role !== "dealer") {
        return res
          .status(403)
          .json({ error: "Only dealers can update this step." });
      }

      // Check invitation exists and is for this dealer
      const inviteResult = await pool.query(
        "SELECT * FROM dealer_invitations WHERE batch_id = $1 AND dealer_username = $2 AND accepted = true",
        [batchId, user.username]
      );
      const invite = inviteResult.rows[0];
      if (!invite) {
        return res
          .status(403)
          .json({ error: "No accepted invitation for this dealer." });
      }

      // --- Your existing update logic below ---
      const { dealer_location, dealer_received_weight, dealer_receipt_id } =
        req.body;
      const file = req.file;

      // Basic validation
      if (!dealer_location || !dealer_received_weight || !dealer_receipt_id) {
        return res.status(400).json({
          error:
            "Missing dealer_location, dealer_received_weight, or dealer_receipt_id",
        });
      }

      // Set timestamp to now()
      const dealer_received_at = new Date().toISOString();

      // If a file is uploaded, upload to Supabase Storage and get public URL
      let dealer_license_image_url = undefined;
      if (file) {
        const licensePath = `dealer-licenses/${batchId}-${file.originalname}`;
        await supabase.storage
          .from("dealer-licenses")
          .upload(licensePath, file.buffer, {
            contentType: file.mimetype,
            upsert: true,
          });
        const { data: licenseData, error: licenseUrlError } = supabase.storage
          .from("dealer-licenses")
          .getPublicUrl(licensePath);
        if (licenseUrlError) throw licenseUrlError;
        dealer_license_image_url = licenseData.publicUrl;
      }

      // Build update object
      let updateFields = [
        dealer_received_at,
        dealer_location,
        parseFloat(dealer_received_weight),
        dealer_receipt_id,
      ];
      let updateQuery = `
        UPDATE batches
        SET dealer_received_at = $1,
            dealer_location = $2,
            dealer_received_weight = $3,
            dealer_receipt_id = $4`;

      if (dealer_license_image_url) {
        updateQuery += `, dealer_license_image_url = $5 WHERE id = $6 RETURNING *`;
        updateFields.push(dealer_license_image_url, batchId);
      } else {
        updateQuery += ` WHERE id = $5 RETURNING *`;
        updateFields.push(batchId);
      }

      const updateResult = await pool.query(updateQuery, updateFields);
      const updatedBatch = updateResult.rows[0];
      if (!updatedBatch)
        return res.status(404).json({ error: "Batch not found" });
      res.json(updatedBatch);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error recording dealer receive step." });
    }
  }
);

// PATCH /batches/:id/transport
app.patch("/batches/:id/transport", authenticate, async (req, res) => {
  try {
    const batchId = req.params.id;
    const {
      transport_courier,
      transport_tracking_number,
      transport_origin_location,
      transport_destination_location,
    } = req.body;

    // Validate required fields
    if (
      !transport_courier ||
      !transport_tracking_number ||
      !transport_origin_location ||
      !transport_destination_location
    ) {
      return res.status(400).json({
        error:
          "Missing transport_courier, transport_tracking_number, transport_origin_location, or transport_destination_location",
      });
    }

    // Get batch and dealer_received_at
    const batchResult = await pool.query(
      "SELECT dealer_received_at FROM batches WHERE id = $1",
      [batchId]
    );
    const batch = batchResult.rows[0];
    if (!batch) {
      return res.status(404).json({ error: "Batch not found." });
    }

    // Get user role and username
    const userResult = await pool.query(
      "SELECT role, username FROM users WHERE id = $1",
      [req.user.id]
    );
    const user = userResult.rows[0];
    if (!user) {
      return res.status(403).json({ error: "User not found." });
    }

    // If dealer_received_at is null, only ASM can update
    if (!batch.dealer_received_at && user.role !== "asm") {
      return res
        .status(403)
        .json({ error: "Only ASM can update transport before dealer step." });
    }
    // If dealer_received_at is set, only the invited dealer can update
    if (batch.dealer_received_at && user.role === "dealer") {
      // Check invitation exists and is for this dealer
      const inviteResult = await pool.query(
        "SELECT * FROM dealer_invitations WHERE batch_id = $1 AND dealer_username = $2 AND accepted = true",
        [batchId, user.username]
      );
      const invite = inviteResult.rows[0];
      if (!invite) {
        return res
          .status(403)
          .json({ error: "No accepted invitation for this dealer." });
      }
    } else if (batch.dealer_received_at && user.role !== "dealer") {
      return res
        .status(403)
        .json({ error: "Only dealer can update transport after dealer step." });
    }

    // Set timestamp
    const transport_shipped_at = new Date().toISOString();

    // Update batch row
    const updateResult = await pool.query(
      `UPDATE batches
       SET transport_shipped_at = $1,
           transport_courier = $2,
           transport_tracking_number = $3,
           transport_origin_location = $4,
           transport_destination_location = $5
       WHERE id = $6
       RETURNING *`,
      [
        transport_shipped_at,
        transport_courier,
        transport_tracking_number,
        transport_origin_location,
        transport_destination_location,
        batchId,
      ]
    );
    const updatedBatch = updateResult.rows[0];
    if (!updatedBatch)
      return res.status(404).json({ error: "Batch not found" });
    res.json(updatedBatch);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error recording transport step." });
  }
});

// PATCH /batches/:id/goldbod-intake
app.patch("/batches/:id/goldbod-intake", authenticate, async (req, res) => {
  try {
    const batchId = req.params.id;
    const {
      goldbod_intake_officer,
      goldbod_intake_weight,
      goldbod_intake_receipt_id,
    } = req.body;

    // Validate
    if (
      !goldbod_intake_officer ||
      !goldbod_intake_weight ||
      !goldbod_intake_receipt_id
    ) {
      return res.status(400).json({
        error:
          "Missing goldbod_intake_officer, goldbod_intake_weight, or goldbod_intake_receipt_id",
      });
    }

    // Set timestamp
    const goldbod_intake_at = new Date().toISOString();

    // Update batch row
    const updateResult = await pool.query(
      `UPDATE batches
       SET goldbod_intake_at = $1,
           goldbod_intake_officer = $2,
           goldbod_intake_weight = $3,
           goldbod_intake_receipt_id = $4
       WHERE id = $5
       RETURNING *`,
      [
        goldbod_intake_at,
        goldbod_intake_officer,
        parseFloat(goldbod_intake_weight),
        goldbod_intake_receipt_id,
        batchId,
      ]
    );
    const updatedBatch = updateResult.rows[0];
    if (!updatedBatch)
      return res.status(404).json({ error: "Batch not found" });
    res.json(updatedBatch);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error recording Goldbod intake step." });
  }
});

// POST /batches/:id/invite-dealer (ASM only)
app.post("/batches/:id/invite-dealer", authenticate, async (req, res) => {
  try {
    const batchId = req.params.id;
    const { dealer_username } = req.body;

    // Only ASM can invite
    const userResult = await pool.query(
      "SELECT role FROM users WHERE id = $1",
      [req.user.id]
    );
    const user = userResult.rows[0];
    if (!user || user.role !== "asm") {
      return res.status(403).json({ error: "Only ASM can invite dealers." });
    }

    // Check if batch exists and belongs to this ASM
    const batchResult = await pool.query(
      "SELECT user_id FROM batches WHERE id = $1",
      [batchId]
    );
    const batch = batchResult.rows[0];
    if (!batch || batch.user_id !== req.user.id) {
      return res.status(403).json({ error: "Not authorized for this batch." });
    }

    // Check if invitation already exists
    const existingInviteResult = await pool.query(
      "SELECT * FROM dealer_invitations WHERE batch_id = $1",
      [batchId]
    );
    const existingInvite = existingInviteResult.rows[0];
    if (existingInvite) {
      return res
        .status(400)
        .json({ error: "Dealer already invited for this batch." });
    }

    // Create invitation
    const insertResult = await pool.query(
      `INSERT INTO dealer_invitations (batch_id, invited_by, dealer_username)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [batchId, req.user.id, dealer_username]
    );
    const invitation = insertResult.rows[0];

    res.json({ message: "Dealer invited.", invitation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error inviting dealer." });
  }
});

// POST /batches/:id/invite-goldbod (Dealer or ASM)
app.post("/batches/:id/invite-goldbod", authenticate, async (req, res) => {
  const batchId = req.params.id;
  const { goldbod_username } = req.body;

  // Allow dealer or asm to invite
  const userResult = await pool.query(
    "SELECT role, username FROM users WHERE id = $1",
    [req.user.id]
  );
  const user = userResult.rows[0];
  if (!user || (user.role !== "dealer" && user.role !== "asm")) {
    return res
      .status(403)
      .json({ error: "Only dealers or ASM can invite goldbod." });
  }

  // Check if batch exists
  const batchResult = await pool.query("SELECT * FROM batches WHERE id = $1", [
    batchId,
  ]);
  const batch = batchResult.rows[0];
  if (!batch) {
    return res.status(404).json({ error: "Batch not found." });
  }

 // 🚩 Only allow ASM to invite goldbod if dealer has NOT updated the batch
if (user.role === "asm" && batch.dealer_received_at) {
  return res.status(403).json({
    error: "ASM cannot invite goldbod after a dealer has updated this batch.",
  });
}

// 🚩 Only allow dealer to invite goldbod if they are the invited/accepted dealer for this batch
if (user.role === "dealer") {
  // Check if this dealer is the accepted dealer for this batch
  const dealerInviteResult = await pool.query(
    "SELECT * FROM dealer_invitations WHERE batch_id = $1 AND dealer_username = $2 AND accepted = true",
    [batchId, user.username]
  );
  const dealerInvite = dealerInviteResult.rows[0];
  if (!dealerInvite) {
    return res.status(403).json({
      error: "Only the accepted dealer for this batch can invite goldbod.",
    });
  }
}

  // Check if the goldbod user exists
  const goldbodUserResult = await pool.query(
    "SELECT username FROM users WHERE username = $1 AND role = $2",
    [goldbod_username, "goldbod"]
  );
  const goldbodUser = goldbodUserResult.rows[0];
  if (!goldbodUser) {
    return res.status(404).json({ error: "User does not exist." });
  }

  // Check if a pending invitation already exists
  const existingInviteResult = await pool.query(
    "SELECT * FROM goldbod_invitations WHERE batch_id = $1 AND goldbod_username = $2",
    [batchId, goldbod_username]
  );
  const existingInvite = existingInviteResult.rows[0];
  if (existingInvite) {
    return res
      .status(400)
      .json({ error: "Goldbod already invited for this batch." });
  }

  // Create invitation
  const insertResult = await pool.query(
    `INSERT INTO goldbod_invitations (batch_id, invited_by, goldbod_username)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [batchId, req.user.id, goldbod_username]
  );
  const invitation = insertResult.rows[0];

  res.json({ message: "Goldbod invited.", invitation });
});

// Example Express route
app.get("/dealer-invitations", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT di.*, u.username AS inviter_username, m.name AS mine_name
       FROM dealer_invitations di
       JOIN users u ON di.invited_by = u.id
       JOIN batches b ON di.batch_id = b.id
       JOIN mines m ON b.mine_id = m.id
       WHERE di.dealer_username = $1 AND di.accepted IS NULL`,
      [req.user.username]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /user/by-id/:id
app.get("/user/by-id/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT id, username FROM users WHERE id = $1",
      [id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PATCH /dealer-invitations/:id/accept
app.patch("/dealer-invitations/:id/accept", authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    // Only the invited dealer can accept
    const inviteResult = await pool.query(
      "SELECT * FROM dealer_invitations WHERE id = $1",
      [id]
    );
    const invite = inviteResult.rows[0];
    if (!invite) return res.status(404).json({ error: "Invite not found" });
    if (invite.dealer_username !== req.user.username)
      return res.status(403).json({ error: "Not your invite" });

    const updateResult = await pool.query(
      "UPDATE dealer_invitations SET accepted = true WHERE id = $1 RETURNING *",
      [id]
    );
    res.json(updateResult.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PATCH /dealer-invitations/:id/reject
app.patch("/dealer-invitations/:id/reject", authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    // Only the invited dealer can reject
    const inviteResult = await pool.query(
      "SELECT * FROM dealer_invitations WHERE id = $1",
      [id]
    );
    const invite = inviteResult.rows[0];
    if (!invite) return res.status(404).json({ error: "Invite not found" });
    if (invite.dealer_username !== req.user.username)
      return res.status(403).json({ error: "Not your invite" });

    const updateResult = await pool.query(
      "UPDATE dealer_invitations SET accepted = false WHERE id = $1 RETURNING *",
      [id]
    );
    res.json(updateResult.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /dealer-invitations/:id
app.delete("/dealer-invitations/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    // Only the invited dealer can delete their invite
    const inviteResult = await pool.query(
      "SELECT * FROM dealer_invitations WHERE id = $1",
      [id]
    );
    const invite = inviteResult.rows[0];
    if (!invite) return res.status(404).json({ error: "Invite not found" });
    if (invite.dealer_username !== req.user.username)
      return res.status(403).json({ error: "Not your invite" });

    await pool.query("DELETE FROM dealer_invitations WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /goldbod-invitations
app.get("/goldbod-invitations", authenticate, async (req, res) => {
  if (req.user.role !== "goldbod") {
    return res
      .status(403)
      .json({ error: "Only goldbod can view these invites." });
  }
  try {
    // Join with users and mines to get inviter username and mine name
    const result = await pool.query(
      `SELECT gi.*, u.username AS inviter_username, m.name AS mine_name
       FROM goldbod_invitations gi
       JOIN users u ON gi.invited_by = u.id
       JOIN batches b ON gi.batch_id = b.id
       JOIN mines m ON b.mine_id = m.id
       WHERE gi.goldbod_username = $1`,
      [req.user.username]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch("/goldbod-invitations/:id/accept", authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    // Only the invited goldbod can accept
    const inviteResult = await pool.query(
      "SELECT * FROM goldbod_invitations WHERE id = $1",
      [id]
    );
    const invite = inviteResult.rows[0];
    if (!invite) return res.status(404).json({ error: "Invite not found" });
    if (invite.goldbod_username !== req.user.username)
      return res.status(403).json({ error: "Not your invite" });

    const updateResult = await pool.query(
      "UPDATE goldbod_invitations SET accepted = true WHERE id = $1 RETURNING *",
      [id]
    );
    res.json(updateResult.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /dealer-for-batch/:batchId
app.get("/dealer-for-batch/:batchId", authenticate, async (req, res) => {
  const { batchId } = req.params;
  try {
    const result = await pool.query(
      "SELECT dealer_username FROM dealer_invitations WHERE batch_id = $1 AND accepted = true LIMIT 1",
      [batchId]
    );
    const dealer = result.rows[0];
    if (!dealer)
      return res.status(404).json({ error: "Dealer not found for this batch" });
    res.json(dealer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/mines/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM mines WHERE id = $1", [id]);
    const mine = result.rows[0];
    if (!mine) return res.status(404).json({ error: "Mine not found" });
    res.json(mine);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /goldbod-invitations/:id
app.delete("/goldbod-invitations/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    // Only the invited goldbod can delete their invite
    const inviteResult = await pool.query(
      "SELECT * FROM goldbod_invitations WHERE id = $1",
      [id]
    );
    const invite = inviteResult.rows[0];
    if (!invite) return res.status(404).json({ error: "Invite not found" });
    if (invite.goldbod_username !== req.user.username)
      return res.status(403).json({ error: "Not your invite" });

    await pool.query("DELETE FROM goldbod_invitations WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /user/by-username/:username
app.get("/user/by-username/:username", authenticate, async (req, res) => {
  const { username } = req.params;
  try {
    const result = await pool.query(
      "SELECT id, username FROM users WHERE username = $1",
      [username]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Basic health endpoint for uptime monitors (returns 200 OK)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});


// Serve static frontend (after all API routes)
const path = require("path");
app.use(express.static(path.join(__dirname, "dist")));

// Use a regex to match all routes except those containing a dot (.)
app.get(/^\/(?!.*\.).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// 11. Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
