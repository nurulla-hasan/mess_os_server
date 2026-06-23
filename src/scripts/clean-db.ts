import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI or DATABASE_URL is not set in .env');
  process.exit(1);
}

async function cleanDatabase() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI!);
  console.log(`✅ Connected: ${mongoose.connection.host}/${mongoose.connection.name}`);

  const db = mongoose.connection.db!;
  const collections = await db.listCollections().toArray();

  if (collections.length === 0) {
    console.log('📭 Database is already empty. Nothing to clean.');
    await mongoose.disconnect();
    return;
  }

  console.log(`\n📋 Found ${collections.length} collection(s):`);
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`   - ${col.name}: ${count} document(s)`);
  }

  console.log('\n🗑️  Dropping all collections...');
  for (const col of collections) {
    await db.collection(col.name).drop();
    console.log(`   ✅ ${col.name} dropped`);
  }

  console.log('\n✨ Database cleaned successfully!');
  await mongoose.disconnect();
  console.log('🔌 Disconnected.');
}

cleanDatabase().catch((err) => {
  console.error('❌ Error cleaning database:', err);
  process.exit(1);
});
