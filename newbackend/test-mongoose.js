const mongoose = require('mongoose');

async function checkEvents() {
    const uri = 'mongodb://127.0.0.1:27017/adxwins'; 
    try {
        await mongoose.connect(uri);
        console.log('Connected natively to Mongoose.');
        const db = mongoose.connection.db;
        const count = await db.collection('events').countDocuments({ match_status: { $regex: /inplay/i } });
        console.log(`Live events found using generic collection count: ${count}`);

        const exactCount = await db.collection('events').countDocuments({ match_status: 'Inplay' });
        console.log(`Live events found using exact "Inplay" string: ${exactCount}`);

        const any = await db.collection('events').findOne({});
        console.log('Random event format:', any ? any.match_status : 'Null');
    } catch(err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
checkEvents();
