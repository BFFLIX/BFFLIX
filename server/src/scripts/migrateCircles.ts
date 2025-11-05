// Migration script to add moderators field to Circle documents
// Runs this once after deploying the updated Circle model

import mongoose from "mongoose";
import Circle from "../models/Circles/Circle";

async function migrateCircles() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/bfflix");
    
    console.log("Connected to database");
    console.log("Starting circle migration...");
    
    // Update all circles that don't have a moderators field
    const result = await Circle.updateMany(
      { moderators: { $exists: false } },
      { $set: { moderators: [] } }
    );
    
    console.log(`Migration complete!`);
    console.log(`Updated ${result.modifiedCount} circles`);
    
    // Close connection
    await mongoose.connection.close();
    console.log("Database connection closed");
    
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrateCircles();

// To run this script:
// Run: npx ts-node server/src/scripts/migrateCircles.ts
