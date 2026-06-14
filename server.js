const express = require("express");
const cors    = require("cors");
const Database = require("better-sqlite3");
const path    = require("path");

const app  = express();
const PORT = process.env.PORT || 3001;
const db   = new Database(path.join(__dirname, "community.db"));

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Create tables ─────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS residents (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName   TEXT    NOT NULL,
    lastName    TEXT    NOT NULL,
    age         INTEGER NOT NULL,
    gender      TEXT    NOT NULL,
    address     TEXT    NOT NULL,
    district    TEXT    NOT NULL,
    household   INTEGER NOT NULL,
    employment  TEXT    NOT NULL,
    occupation  TEXT,
    contact     TEXT    NOT NULL,
    status      TEXT    DEFAULT 'Active',
    income      TEXT,
    registered  TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS businesses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    bizName     TEXT    NOT NULL,
    ownerFirst  TEXT    NOT NULL,
    ownerLast   TEXT    NOT NULL,
    category    TEXT    NOT NULL,
    address     TEXT    NOT NULL,
    district    TEXT    NOT NULL,
    contact     TEXT    NOT NULL,
    permit      TEXT,
    years       INTEGER DEFAULT 1,
    employees   INTEGER DEFAULT 1,
    status      TEXT    DEFAULT 'Active',
    verified    INTEGER DEFAULT 0,
    registered  TEXT    NOT NULL
  );
`);

// ── Seed starter data if tables are empty ────────────────────────────────────
const resCount = db.prepare("SELECT COUNT(*) as n FROM residents").get();
if (resCount.n === 0) {
  const insertRes = db.prepare(`
    INSERT INTO residents (firstName,lastName,age,gender,address,district,household,employment,occupation,contact,status,income,registered)
    VALUES (@firstName,@lastName,@age,@gender,@address,@district,@household,@employment,@occupation,@contact,@status,@income,@registered)
  `);
  [
    { firstName:"Maria",  lastName:"Santos",   age:67, gender:"Female", address:"12 Mabini St.",      district:"District 1", household:4, employment:"Retired",       occupation:"Former Teacher",  contact:"09171234567", status:"Active", income:"₱20,000–40,000", registered:"2025-01-10" },
    { firstName:"Jose",   lastName:"Reyes",    age:52, gender:"Male",   address:"88 Rizal Ave.",       district:"District 2", household:6, employment:"Self-Employed", occupation:"Vendor",         contact:"09281234567", status:"Active", income:"₱10,000–20,000", registered:"2025-02-14" },
    { firstName:"Ana",    lastName:"Cruz",     age:22, gender:"Female", address:"5 Sampaguita Lane",   district:"District 1", household:2, employment:"Student",       occupation:"College Student", contact:"09391234567", status:"Active", income:"Below ₱10,000",  registered:"2025-03-05" },
    { firstName:"Ramon",  lastName:"Bautista", age:61, gender:"Male",   address:"33 Aguinaldo Blvd.", district:"District 3", household:3, employment:"Retired",       occupation:"Former Engineer", contact:"09451234567", status:"Active", income:"₱20,000–40,000", registered:"2025-04-01" },
  ].forEach(r => insertRes.run(r));
}

const bizCount = db.prepare("SELECT COUNT(*) as n FROM businesses").get();
if (bizCount.n === 0) {
  const insertBiz = db.prepare(`
    INSERT INTO businesses (bizName,ownerFirst,ownerLast,category,address,district,contact,permit,years,employees,status,verified,registered)
    VALUES (@bizName,@ownerFirst,@ownerLast,@category,@address,@district,@contact,@permit,@years,@employees,@status,@verified,@registered)
  `);
  [
    { bizName:"Dela Cruz Electrical Works", ownerFirst:"Pedro", ownerLast:"Dela Cruz", category:"Electrical Services", address:"22 Burgos St.",  district:"District 2", contact:"09123456789", permit:"BP-2025-0012", years:8,  employees:5,  status:"Active", verified:1, registered:"2025-01-15" },
    { bizName:"Santos Food Hub",            ownerFirst:"Lina",  ownerLast:"Santos",    category:"Food & Beverage",     address:"7 Rizal Ave.",   district:"Poblacion",  contact:"09234567890", permit:"BP-2025-0034", years:3,  employees:12, status:"Active", verified:1, registered:"2025-02-20" },
    { bizName:"Fix-It Plumbing Services",   ownerFirst:"Carlo", ownerLast:"Mendez",    category:"Plumbing & Pipework", address:"45 Mabini St.",  district:"District 1", contact:"09345678901", permit:"BP-2025-0051", years:5,  employees:3,  status:"Active", verified:0, registered:"2025-03-10" },
  ].forEach(b => insertBiz.run(b));
}

// ── Helper ────────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];

// ════════════════════════════════════════════════════════════════════════════════
// RESIDENT ROUTES
// ════════════════════════════════════════════════════════════════════════════════
app.get("/api/residents", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM residents ORDER BY id DESC").all();
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/residents/:id", (req, res) => {
  try {
    const row = db.prepare("SELECT * FROM residents WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/residents", (req, res) => {
  try {
    const { firstName, lastName, age, gender, address, district, household, employment, occupation, contact, status, income } = req.body;
    if (!firstName || !lastName || !age || !gender || !address || !district || !household || !employment || !contact)
      return res.status(400).json({ error: "Missing required fields" });
    const result = db.prepare(`
      INSERT INTO residents (firstName,lastName,age,gender,address,district,household,employment,occupation,contact,status,income,registered)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(firstName, lastName, Number(age), gender, address, district, Number(household), employment, occupation||"", contact, status||"Active", income||"", today());
    const created = db.prepare("SELECT * FROM residents WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/residents/:id", (req, res) => {
  try {
    const { firstName, lastName, age, gender, address, district, household, employment, occupation, contact, status, income } = req.body;
    db.prepare(`
      UPDATE residents SET firstName=?,lastName=?,age=?,gender=?,address=?,district=?,
      household=?,employment=?,occupation=?,contact=?,status=?,income=? WHERE id=?
    `).run(firstName, lastName, Number(age), gender, address, district, Number(household), employment, occupation||"", contact, status, income||"", req.params.id);
    const updated = db.prepare("SELECT * FROM residents WHERE id = ?").get(req.params.id);
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/residents/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM residents WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════════
// BUSINESS ROUTES
// ════════════════════════════════════════════════════════════════════════════════
app.get("/api/businesses", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM businesses ORDER BY id DESC").all();
    res.json(rows.map(b => ({ ...b, verified: !!b.verified })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/businesses/:id", (req, res) => {
  try {
    const row = db.prepare("SELECT * FROM businesses WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ ...row, verified: !!row.verified });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/businesses", (req, res) => {
  try {
    const { bizName, ownerFirst, ownerLast, category, address, district, contact, permit, years, employees, status, verified } = req.body;
    if (!bizName || !ownerFirst || !ownerLast || !category || !address || !district || !contact)
      return res.status(400).json({ error: "Missing required fields" });
    const result = db.prepare(`
      INSERT INTO businesses (bizName,ownerFirst,ownerLast,category,address,district,contact,permit,years,employees,status,verified,registered)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(bizName, ownerFirst, ownerLast, category, address, district, contact, permit||"", Number(years)||1, Number(employees)||1, status||"Active", verified?1:0, today());
    const created = db.prepare("SELECT * FROM businesses WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json({ ...created, verified: !!created.verified });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/businesses/:id", (req, res) => {
  try {
    const { bizName, ownerFirst, ownerLast, category, address, district, contact, permit, years, employees, status, verified } = req.body;
    db.prepare(`
      UPDATE businesses SET bizName=?,ownerFirst=?,ownerLast=?,category=?,address=?,district=?,
      contact=?,permit=?,years=?,employees=?,status=?,verified=? WHERE id=?
    `).run(bizName, ownerFirst, ownerLast, category, address, district, contact, permit||"", Number(years), Number(employees), status, verified?1:0, req.params.id);
    const updated = db.prepare("SELECT * FROM businesses WHERE id = ?").get(req.params.id);
    res.json({ ...updated, verified: !!updated.verified });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/businesses/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM businesses WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Stats endpoint ─────────────────────────────────────────────────────────────
app.get("/api/stats", (req, res) => {
  try {
    const total      = db.prepare("SELECT COUNT(*) as n FROM residents").get().n;
    const active     = db.prepare("SELECT COUNT(*) as n FROM residents WHERE status='Active'").get().n;
    const employed   = db.prepare("SELECT COUNT(*) as n FROM residents WHERE employment IN ('Employed','Self-Employed')").get().n;
    const seniors    = db.prepare("SELECT COUNT(*) as n FROM residents WHERE age >= 60").get().n;
    const bizTotal   = db.prepare("SELECT COUNT(*) as n FROM businesses").get().n;
    const bizActive  = db.prepare("SELECT COUNT(*) as n FROM businesses WHERE status='Active'").get().n;
    const districtRows = db.prepare("SELECT district, COUNT(*) as count FROM residents GROUP BY district").all();
    const catRows    = db.prepare("SELECT category, COUNT(*) as count FROM businesses GROUP BY category").all();
    res.json({ total, active, employed, seniors, bizTotal, bizActive, byDistrict: districtRows, byCategory: catRows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.listen(PORT, () => console.log(`✅  Server running on http://localhost:${PORT}`));
