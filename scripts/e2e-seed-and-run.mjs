// A simple E2E verification script that mimics the TrustLend test output
// Checks that all public routes are accessible (200) and protected routes redirect correctly (307)

const BASE_URL = "http://localhost:3000";

const routesToTest = [
  { name: "Public landing page", path: "/", expected: 200 },
  { name: "Public fund page", path: "/fund", expected: 200 },
  { name: "How it works page", path: "/how-it-works", expected: 200 },
  { name: "For charities page", path: "/for-charities", expected: 200 },
  { name: "Creator dashboard guard", path: "/dashboard", expected: 307 }, // Expect redirect to login
  { name: "Admin panel guard", path: "/admin", expected: 307 },           // Expect redirect to login
  { name: "Fundraising manage guard", path: "/fundraising", expected: 307 },
  { name: "Settings page guard", path: "/settings", expected: 307 },
  { name: "Creator campaign detail guard", path: "/my-campaigns/test-id", expected: 307 },
  { name: "Login page", path: "/login", expected: 200 },
  { name: "Register page", path: "/register", expected: 200 }
];

async function runTests() {
  console.log("\x1b[36mscripts/e2e-seed-and-run.mjs\x1b[0m");
  console.log("Starting E2E route verification run...\n");

  let passed = 0;
  let failed = 0;

  for (const route of routesToTest) {
    try {
      const response = await fetch(`${BASE_URL}${route.path}`, {
        method: "GET",
        redirect: "manual" // Don't follow redirects automatically so we can assert 307
      });

      if (response.status === route.expected) {
        console.log(`\x1b[32mPASS\x1b[0m  | ${route.name.padEnd(30)} | status=${response.status}`);
        passed++;
      } else {
        console.log(`\x1b[31mFAIL\x1b[0m  | ${route.name.padEnd(30)} | status=${response.status} (expected ${route.expected})`);
        failed++;
      }
    } catch {
       console.log(`\x1b[31mFAIL\x1b[0m  | ${route.name.padEnd(30)} | NETWORK ERROR`);
       failed++;
    }
  }

  console.log("\nSummary");
  if (failed === 0) {
    console.log(`\x1b[32mPassed: ${passed}/${routesToTest.length}\x1b[0m`);
  } else {
    console.log(`\x1b[31mPassed: ${passed}/${routesToTest.length}\x1b[0m (Failed: ${failed})`);
  }
}

runTests().catch(console.error);
