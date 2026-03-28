const axios = require('axios');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
const base = 'https://zeero.bet';
const endpoint = 'api/v1/sports/matches?sportsid=4';
const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

async function test() {
    try {
        const url = `${base}${path}`;
        const headers = { 'x-turnkeyxgaming-key': API_KEY, Accept: 'application/json' };
        const config = { headers, timeout: 5000 };
        const response = await axios.get(url, config);
        console.log("SUCCESS length:", JSON.stringify(response.data).length);
    } catch (e) {
        console.error("ERROR", e.message);
        if (e.response) {
            console.error("DATA", e.response.data);
            console.error("STATUS", e.response.status);
        }
    }
}
test();
