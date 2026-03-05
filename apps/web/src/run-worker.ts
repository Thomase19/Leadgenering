const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { CrmWorker } = require("./lib/crm-worker");

console.log("LeadBot CRM worker running. Waiting for jobs...");
process.on("SIGTERM", () => CrmWorker.close());
