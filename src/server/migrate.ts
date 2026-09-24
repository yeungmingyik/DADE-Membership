import { databasePath, migrateDatabase, openDatabase } from "./database";

const database = openDatabase(databasePath());

try {
  migrateDatabase(database);
  process.stdout.write("DATABASE_MIGRATION_COMPLETE\n");
} finally {
  database.close();
}
