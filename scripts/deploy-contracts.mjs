/**
 * scripts/deploy-contracts.mjs
 *
 * Re-deploys CrowdfundFactory + Campaign contracts on Stellar Testnet
 * using the `stellar` CLI (v25+).
 *
 * Run:  node scripts/deploy-contracts.mjs
 *
 * Reads  : .env.local  (STELLAR_FACTORY_SECRET_KEY)
 * Writes : .env.local  (NEXT_PUBLIC_FACTORY_CONTRACT_ID, NEXT_PUBLIC_CAMPAIGN_CONTRACT_ID)
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── Load .env.local ────────────────────────────────────────────────────────
const envPath = path.join(ROOT, ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const env = Object.fromEntries(
  envContent
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const SECRET_KEY   = env.STELLAR_FACTORY_SECRET_KEY;
const RPC_URL      = env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASS = "Test SDF Network ; September 2015";

const CAMPAIGN_WASM = path.join(ROOT, "contracts/target/wasm32v1-none/release/campaign.wasm");
const FACTORY_WASM  = path.join(ROOT, "contracts/target/wasm32v1-none/release/crowdfund_factory.wasm");

if (!SECRET_KEY) { console.error("❌  STELLAR_FACTORY_SECRET_KEY missing from .env.local"); process.exit(1); }
if (!fs.existsSync(CAMPAIGN_WASM)) { console.error("❌  campaign.wasm not found:", CAMPAIGN_WASM); process.exit(1); }
if (!fs.existsSync(FACTORY_WASM))  { console.error("❌  crowdfund_factory.wasm not found:", FACTORY_WASM); process.exit(1); }

// ── Helper: run stellar CLI ────────────────────────────────────────────────
function cli(args) {
  const cmd = `stellar ${args} --rpc-url "${RPC_URL}" --network-passphrase "${NETWORK_PASS}"`;
  console.log("  $", cmd.replace(SECRET_KEY, "***"));
  try {
    return execSync(cmd, { cwd: ROOT, encoding: "utf8", timeout: 120_000 }).trim();
  } catch (e) {
    const msg = (e.stdout || "") + (e.stderr || "");
    throw new Error(msg || e.message);
  }
}

// ── Update .env.local ──────────────────────────────────────────────────────
function setEnvVar(key, value) {
  let content = fs.readFileSync(envPath, "utf8");
  const re = new RegExp(`^(${key}=).*$`, "m");
  if (re.test(content)) {
    content = content.replace(re, `$1${value}`);
  } else {
    content += `\n${key}=${value}`;
  }
  fs.writeFileSync(envPath, content, "utf8");
}

// ── Main ───────────────────────────────────────────────────────────────────
console.log("🚀  Fundr Contract Deployer (stellar CLI)");
console.log("    WASM  (campaign) :", CAMPAIGN_WASM);
console.log("    WASM  (factory)  :", FACTORY_WASM);
console.log("");

try {
  // ── 1. Upload Campaign WASM ──────────────────────────────────────────────
  console.log("📦  Uploading campaign WASM…");
  const campaignWasmHash = cli(
    `contract upload --wasm "${CAMPAIGN_WASM}" --source-account "${SECRET_KEY}"`
  );
  console.log("  ✓  Campaign WASM hash:", campaignWasmHash);

  // ── 2. Deploy Factory contract ───────────────────────────────────────────
  console.log("\n🏭  Deploying CrowdfundFactory contract…");
  const factoryAddress = cli(
    `contract deploy --wasm "${FACTORY_WASM}" --source-account "${SECRET_KEY}"`
  );
  console.log("  ✓  Factory address:", factoryAddress);

  // ── 3. Initialize Factory with campaign WASM hash ───────────────────────
  console.log("\n⚙️   Initializing factory…");
  cli(
    `contract invoke --id "${factoryAddress}" --source-account "${SECRET_KEY}" -- init --wasm_hash "${campaignWasmHash}"`
  );
  console.log("  ✓  Factory initialized");

  // ── 4. Update .env.local ─────────────────────────────────────────────────
  setEnvVar("NEXT_PUBLIC_FACTORY_CONTRACT_ID", factoryAddress);
  // Store the campaign wasm hash too (useful for future re-inits)
  setEnvVar("CAMPAIGN_WASM_HASH", campaignWasmHash);
  console.log("\n  ✓  .env.local updated");

  console.log("\n✅  Deployment complete!");
  console.log("    Factory contract :", factoryAddress);
  console.log("    Campaign WASM    :", campaignWasmHash);
  console.log("\n    ⚡  Restart dev server:  npm run dev");
} catch (err) {
  console.error("\n❌  Deployment failed:\n", err.message);
  process.exit(1);
}
