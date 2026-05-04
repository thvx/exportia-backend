import "../config.js";
import { initializeTables, seedDefaultUsers, seedSampleData } from "./schema.js";
import { logger } from "../utils/logger.js";

/**
 * Migration runner - call this to set up database on first start
 */

async function migrate() {
  try {
    logger.startup("Running database migrations...");
    await initializeTables();
    await seedDefaultUsers();
    await seedSampleData();
    logger.info("Migrations completed successfully");
    process.exit(0);
  } catch (err) {
    logger.error("Migration failed", err);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate();
}

export { migrate };
