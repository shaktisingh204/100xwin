const mongoose = require('mongoose');
async function check() {
    const uri = 'mongodb://127.0.0.1:27017/adxwins'; 
    try {
        await mongoose.connect(uri);
        const db = mongoose.connection.db;
        const e1 = await db.collection('events').findOne({ inPlay: true });
        const e2 = await db.collection('events').findOne({ in_play: true });
        const e3 = await db.collection('events').findOne({ is_in_play: true });
        
        console.log("e1 (inPlay):", !!e1);
        console.log("e2 (in_play):", !!e2);
        console.log("e3 (is_in_play):", !!e3);
        
        const m1 = await db.collection('markets').findOne({ inplay: true });
        console.log("m1 (inplay):", !!m1);
        
        const sampleEvent = await db.collection('events').findOne({});
        console.log("Sample event:", Object.keys(sampleEvent || {}));
    } catch(err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
check();
