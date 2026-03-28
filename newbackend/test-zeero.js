const axios = require('axios');
axios.get('https://zeero.bet/api/v1/sports/matches?sportsid=4', {
    headers: { 'x-turnkeyxgaming-key': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' },
    timeout: 5000
}).then(res => {
    console.log('SUCCESS:', res.data.success, 'LEN:', Object.keys(res.data).length);
    if (!res.data.success) console.log(res.data);
}).catch(e => {
    console.log('ERROR:', e.message);
    if (e.response) console.log('RESP:', e.response.status, e.response.data);
});
