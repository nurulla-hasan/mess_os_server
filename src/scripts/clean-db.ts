import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI or DATABASE_URL is not set in .env');
  process.exit(1);
}

// Collections to KEEP (transactional data will be deleted)
const KEEP_COLLECTIONS = new Set([
  'users',
  'messes',
  'messmembers',
  'subscriptionplans',
]);

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
  const toDrop: string[] = [];
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    const status = KEEP_COLLECTIONS.has(col.name) ? '🔒 KEEP' : '🗑️  DROP';
    console.log(`   ${status} - ${col.name}: ${count} document(s)`);
    if (!KEEP_COLLECTIONS.has(col.name)) {
      toDrop.push(col.name);
    }
  }

  if (toDrop.length === 0) {
    console.log('\n✨ Nothing to drop. All collections are in the keep list.');
    await mongoose.disconnect();
    return;
  }

  console.log(`\n🗑️  Dropping ${toDrop.length} collection(s)...`);
  for (const name of toDrop) {
    await db.collection(name).drop();
    console.log(`   ✅ ${name} dropped`);
  }

  console.log('\n✨ Transactional data cleaned successfully!');
  console.log('🔒 Kept collections: users, messes, messmembers, subscriptionplans');
  await mongoose.disconnect();
  console.log('🔌 Disconnected.');
}

cleanDatabase().catch((err) => {
  console.error('❌ Error cleaning database:', err);
  process.exit(1);
});
