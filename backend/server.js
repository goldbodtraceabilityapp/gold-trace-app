// GOLDBOD GOLD TRACEABILITY APP - Backend SERVER

// 1. Load environment variables
require("dotenv").config();

// 2. Import dependencies
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const authenticate = require('./middleware/authenticate'); // <-- add this line at the top

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

// 6. Public Routes
app.get("/", (req, res) => {
  res.send("Welcome to the GOLDBOD GOLD TRACEABILITY APP!");
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

  // Include role in the JWT payload!
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "10h",
  });
  res.json({ token });
});

// 8. Protected Routes
app.use("/mines", authenticate);
app.use("/batches", authenticate);

// 8.5. User info endpoint (add after authentication routes)
app.get("/user/me", authenticate, async (req, res) => {
  const { data: user, error } = await supabase
    .from("users")
    .select("id, username, role")
    .eq("id", req.user.id)
    .single();

  if (error || !user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// GET /batches (list all batches for this user)
app.get("/batches", async (req, res) => {
  try {
    const { data: batches, error } = await supabase
      .from("batches")
      .select("*")
      .eq("user_id", req.user.id); // only return batches for this user

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json(batches);
  } catch (err) {
    console.error("GET /batches error:", err);
    res.status(500).json({ error: "Server error fetching batches." });
  }
});

// GET /batches/:id (get a single batch by its primary key)
app.get("/batches/:id", authenticate, async (req, res) => {
  try {
    const batchId = req.params.id;
    const { data: batch, error } = await supabase
      .from("batches")
      .select("*, mines(name)")
      .eq("id", batchId)
      .single();

    if (error || !batch) {
      return res.status(404).json({ error: "Batch not found." });
    }
    if (batch.user_id !== req.user.id && req.user.role !== 'dealer') {
      return res.status(403).json({ error: "Not authorized to view this batch." });
    }
    // Attach mine_name for frontend
    batch.mine_name = batch.mines?.name || batch.mine_id;
    delete batch.mines;
    res.json(batch);
  } catch (err) {
    console.error("GET /batches/:id error:", err);
    res.status(500).json({ error: "Server error fetching batch." });
  }
});

// GET /mines (role‐aware: returns only mines the user owns, unless they’re “goldbod”)
app.get("/mines", async (req, res) => {
  try {
    // 1. Fetch current user’s role
    const { data: currentUser, error: userError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", req.user.id)
      .single();

    if (userError || !currentUser) {
      return res.status(404).json({ error: "User not found." });
    }

    // 2. Build base query on "mines"
    let query = supabase
      .from("mines")
      .select(`
        id,
        name,
        type,
        location,
        license_number,
        user_id
      `);

    // 3. If user is NOT goldbod, restrict to their own mines
    if (currentUser.role !== "goldbod") {
      query = query.eq("user_id", req.user.id);
    }

    // 4. Execute
    const { data: mines, error: minesError } = await query;
    if (minesError) {
      return res.status(500).json({ error: minesError.message });
    }
    res.json(mines);
  } catch (err) {
    console.error("GET /mines error:", err);
    res.status(500).json({ error: "Server error fetching mines." });
  }
});

// POST /mines (create a new mine, now requiring name, type, location, license_number)
app.post("/mines", authenticate, async (req, res) => {
  try {
    // Pull all required fields from the request body
    const { name, type, location, license_number } = req.body;

    // All fields are now required
    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Missing name" });
    }
    if (!type || type.trim() === "") {
      return res.status(400).json({ error: "Missing type" });
    }
    if (!location || location.trim() === "") {
      return res.status(400).json({ error: "Missing location" });
    }
    if (!license_number || license_number.trim() === "") {
      return res.status(400).json({ error: "Missing license_number" });
    }

    // Insert new mine, setting user_id = req.user.id
    const { data, error } = await supabase
      .from("mines")
      .insert([
        {
          name: name.trim(),
          type: type.trim(),
          location: location.trim(),
          license_number: license_number.trim(),
          user_id: req.user.id, // associate mine with this user
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }
    res.json(data);
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
      const { data: currentUser, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

      if (userError || !currentUser) {
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
      const { count: existingCount, error: countError } = await supabase
        .from("batches")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      if (countError) {
        console.error("Error counting existing batches:", countError);
        return res.status(500).json({ error: "Database error" });
      }

      const userBatchCount = existingCount || 0;
      const nextNumber = userBatchCount + 1;
      const batch_id = `BATCH-${nextNumber}`;

      // 6️⃣ Upload origin certificate image to Supabase Storage
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
      const { data, error } = await supabase
        .from("batches")
        .insert([
          {
            user_id: userId,
            batch_id,
            mine_id,
            date_collected,
            weight_kg,
            origin_cert_image_url,
            dealer_license_image_url,
          },
        ])
        .select("*")
        .single();

      if (error) {
        console.error("Error inserting new batch:", error);
        return res.status(400).json({ error: error.message });
      }

      // 9️⃣ Return the newly created batch
      return res.json(data);
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
      const { data, error } = await supabase
        .from("batches")
        .update({
          purity_percent: parseFloat(purity_percent),
          assay_report_pdf_url,
          assay_completed_at: new Date().toISOString(),  // new column set here
        })
        .eq("id", batchId)
        .select("*")
        .single();

      if (error) return res.status(400).json({ error: error.message });
      res.json(data);
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
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("role, username")
        .eq("id", req.user.id)
        .single();
      if (userError || !user || user.role !== "dealer") {
        return res.status(403).json({ error: "Only dealers can update this step." });
      }

      // Check invitation exists and is for this dealer
      const { data: invite, error: inviteError } = await supabase
        .from("dealer_invitations")
        .select("*")
        .eq("batch_id", batchId)
        .eq("dealer_username", user.username)
        .single();
      if (inviteError || !invite) {
        return res.status(403).json({ error: "No invitation for this dealer." });
      }

      // --- Your existing update logic below ---
      const { dealer_location, dealer_received_weight, dealer_receipt_id } = req.body;
      const file = req.file;

      // Basic validation
      if (!dealer_location || !dealer_received_weight || !dealer_receipt_id) {
        return res.status(400).json({
          error: "Missing dealer_location, dealer_received_weight, or dealer_receipt_id"
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
      const updateObj = {
        dealer_received_at,
        dealer_location,
        dealer_received_weight: parseFloat(dealer_received_weight),
        dealer_receipt_id,
      };
      if (dealer_license_image_url) updateObj.dealer_license_image_url = dealer_license_image_url;

      // Update the batch row
      const { data, error } = await supabase
        .from("batches")
        .update(updateObj)
        .eq("id", batchId)
        .select("*")
        .single();

      if (error) return res.status(400).json({ error: error.message });
      res.json(data);
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
      transport_destination_location
    } = req.body;

    // Validate required fields
    if (
      !transport_courier ||
      !transport_tracking_number ||
      !transport_origin_location ||
      !transport_destination_location
    ) {
      return res.status(400).json({
        error: "Missing transport_courier, transport_tracking_number, transport_origin_location, or transport_destination_location"
      });
    }

    // Get batch and dealer_received_at
    const { data: batch, error: batchError } = await supabase
      .from("batches")
      .select("dealer_received_at")
      .eq("id", batchId)
      .single();
    if (batchError || !batch) {
      return res.status(404).json({ error: "Batch not found." });
    }

    // Get user role and username
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("role, username")
      .eq("id", req.user.id)
      .single();
    if (userError || !user) {
      return res.status(403).json({ error: "User not found." });
    }

    // If dealer_received_at is null, only ASM can update
    if (!batch.dealer_received_at && user.role !== "asm") {
      return res.status(403).json({ error: "Only ASM can update transport before dealer step." });
    }
    // If dealer_received_at is set, only the invited dealer can update
    if (batch.dealer_received_at && user.role === "dealer") {
      // Check invitation exists and is for this dealer
      const { data: invite, error: inviteError } = await supabase
        .from("dealer_invitations")
        .select("*")
        .eq("batch_id", batchId)
        .eq("dealer_username", user.username)
        .single();
      if (inviteError || !invite) {
        return res.status(403).json({ error: "No invitation for this dealer." });
      }
    } else if (batch.dealer_received_at && user.role !== "dealer") {
      return res.status(403).json({ error: "Only dealer can update transport after dealer step." });
    }

    // Set timestamp
    const transport_shipped_at = new Date().toISOString();

    // Update batch row
    const { data, error } = await supabase
      .from("batches")
      .update({
        transport_shipped_at,
        transport_courier,
        transport_tracking_number,
        transport_origin_location,
        transport_destination_location
      })
      .eq("id", batchId)
      .select("*")
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
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
      goldbod_intake_receipt_id
    } = req.body;

    // Validate
    if (!goldbod_intake_officer || !goldbod_intake_weight || !goldbod_intake_receipt_id) {
      return res.status(400).json({
        error: "Missing goldbod_intake_officer, goldbod_intake_weight, or goldbod_intake_receipt_id"
      });
    }

    // Set timestamp
    const goldbod_intake_at = new Date().toISOString();

    // Update batch row
    const { data, error } = await supabase
      .from("batches")
      .update({
        goldbod_intake_at,
        goldbod_intake_officer,
        goldbod_intake_weight: parseFloat(goldbod_intake_weight),
        goldbod_intake_receipt_id
      })
      .eq("id", batchId)
      .select("*")
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error recording Goldbod intake step." });
  }
});



app.patch(
  "/batches/:id/assay",
  authenticate,
  upload.single("assay_report"),
  async (req, res) => {
    try {
      const batchId = req.params.id;
      const { purity_percent } = req.body;
      const file = req.file;

      if (!purity_percent || !file) {
        return res.status(400).json({ error: "Missing purity_percent or assay_report file" });
      }

      // Upload PDF to Supabase Storage
      const pdfPath = `assay-reports/${batchId}-${file.originalname}`;
      await supabase.storage
        .from("assay-reports")
        .upload(pdfPath, file.buffer, { contentType: file.mimetype });

      // Get public URL
      const { data: pdfData, error: urlError } = supabase.storage
        .from("assay-reports")
        .getPublicUrl(pdfPath);
      if (urlError) throw urlError;
      const assay_report_pdf_url = pdfData.publicUrl;

      // Update batch row
      const { data, error } = await supabase
        .from("batches")
        .update({
          purity_percent: parseFloat(purity_percent),
          assay_report_pdf_url,
          assay_completed_at: new Date().toISOString()
        })
        .eq("id", batchId)
        .select("*")
        .single();

      if (error) return res.status(400).json({ error: error.message });
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Assay upload or database error" });
    }
  }
);



// POST /batches/:id/invite-dealer (ASM only)
app.post("/batches/:id/invite-dealer", authenticate, async (req, res) => {
  try {
    const batchId = req.params.id;
    const { dealer_username } = req.body;

    // Only ASM can invite
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", req.user.id)
      .single();
    if (userError || !user || user.role !== "asm") {
      return res.status(403).json({ error: "Only ASM can invite dealers." });
    }

    // Check if batch exists and belongs to this ASM
    const { data: batch, error: batchError } = await supabase
      .from("batches")
      .select("user_id")
      .eq("id", batchId)
      .single();
    if (batchError || !batch || batch.user_id !== req.user.id) {
      return res.status(403).json({ error: "Not authorized for this batch." });
    }

    // Check if invitation already exists
    const { data: existingInvite } = await supabase
      .from("dealer_invitations")
      .select("*")
      .eq("batch_id", batchId)
      .single();
    if (existingInvite) {
      return res.status(400).json({ error: "Dealer already invited for this batch." });
    }

    // Create invitation
    const { data, error } = await supabase
      .from("dealer_invitations")
      .insert([
        {
          batch_id: batchId,
          invited_by: req.user.id,
          dealer_username,
        },
      ])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "Dealer invited.", invitation: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error inviting dealer." });
  }
});


// Example Express route
app.get('/dealer-invitations', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('dealer_invitations')
    .select('*')
    .eq('dealer_username', req.user.username);
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// GET /user/by-id/:id
app.get('/user/by-id/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('users')
    .select('id, username')
    .eq('id', id)
    .single();
  if (error || !data) return res.status(404).json({ error: 'User not found' });
  res.json(data);
});



// 11. Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
