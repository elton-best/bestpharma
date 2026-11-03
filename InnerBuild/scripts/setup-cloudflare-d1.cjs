const fs = require("fs");

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;

if (!token) {
  console.error("Missing CLOUDFLARE_API_TOKEN");
  process.exit(1);
}

if (!accountId) {
  console.error("Missing CLOUDFLARE_ACCOUNT_ID");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

async function main() {
  console.log("Checking Cloudflare D1 databases for account:", accountId);

  // 1. List existing databases
  const listRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database`,
    { headers }
  );
  const listData = await listRes.json();

  if (!listData.success) {
    console.error("D1 API Error:", listData.errors);
    return;
  }

  let db = listData.result?.find((d) => d.name === "ai-factory-db");

  // 2. Create if not exists
  if (!db) {
    console.log("Creating D1 database 'ai-factory-db'...");
    const createRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "ai-factory-db" }),
      }
    );
    const createData = await createRes.json();
    if (!createData.success) {
      console.error("Failed to create D1 database:", createData.errors);
      return;
    }
    db = createData.result;
    console.log("Created D1 database successfully! ID:", db.uuid);
  } else {
    console.log("D1 database 'ai-factory-db' already exists! ID:", db.uuid);
  }

  const databaseId = db.uuid;

  // 3. Save databaseId to .env
  let envContent = fs.readFileSync(".env", "utf8");
  if (!envContent.includes("CLOUDFLARE_D1_DATABASE_ID")) {
    envContent += `\nCLOUDFLARE_D1_DATABASE_ID=${databaseId}\n`;
    fs.writeFileSync(".env", envContent, "utf8");
    console.log("Saved CLOUDFLARE_D1_DATABASE_ID to .env");
  }

  // 4. Initialize SQLite Schema
  console.log("Applying SQLite schema to D1 database...");
  const schemaSql = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'learner',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      avatar_url TEXT,
      access_status TEXT DEFAULT 'free',
      onboarded INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS skill_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      status TEXT DEFAULT 'in_progress',
      score INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, skill_id)
    );

    CREATE TABLE IF NOT EXISTS course_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      percentage INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS file_metadata (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      r2_key TEXT NOT NULL,
      public_url TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS challenge_submissions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      challenge_id TEXT NOT NULL,
      repo_url TEXT,
      demo_url TEXT,
      r2_file_url TEXT,
      score INTEGER,
      feedback TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const queryRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ sql: schemaSql }),
    }
  );
  const queryData = await queryRes.json();
  if (queryData.success) {
    console.log("Schema successfully initialized in Cloudflare D1!");
  } else {
    console.error("Error creating schema:", queryData.errors);
  }
}

main().catch(console.error);
