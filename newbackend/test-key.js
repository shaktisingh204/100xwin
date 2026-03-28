require('dotenv').config({ path: '../.env' }); // or however it's loaded
const key = process.env.SPORTS_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
console.log("KEY LENGTH:", key.length);
console.log("STARTS WITH:", key.substring(0, 5));
console.log("ENDS WITH:", key.substring(key.length - 5));
