const { MongoClient } = require('mongodb');
async function run() {
  const uri = process.env.SPORTS_MONGO_URI || 'mongodb://127.0.0.1:27017/adxwins';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('adxwins');
  const markets = await db.collection('markets').find({ market_name: 'Bookmaker' }).toArray();
  console.log('Bookmaker markets in DB:', markets.length, markets.slice(0, 1).map(m => ({ mid: m.mid, status: m.status, gmid: m.gmid })));
  const markets2 = await db.collection('markets').find({ mname: 'Bookmaker' }).toArray();
  console.log('mname Bookmaker markets in DB:', markets2.length, markets2.slice(0, 1).map(m => ({ mid: m.mid, status: m.status, gmid: m.gmid })));
  await client.close();
}
run().catch(console.error);
