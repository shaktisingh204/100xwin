import mongoose from 'mongoose';

async function test() {
  await mongoose.connect('mongodb://127.0.0.1:27017/adxwins'); // Adjust connection string if needed
  const db = mongoose.connection.db;

  try {
    const liveEvents = await db.collection('events').find({
      match_status: { $regex: /inplay/i }
    }).toArray();
    console.log(`Found ${liveEvents.length} live events matching 'inplay'`);
    
    // Check what ANY status looks like
    const anyEvent = await db.collection('events').findOne({});
    console.log('Sample event match_status flag is:', anyEvent?.match_status);
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}
test();
