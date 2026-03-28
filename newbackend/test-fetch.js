const url = "https://zeero.bet/api/v1/sports/matches?sportsid=4";
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";

fetch(url, {
    method: 'GET',
    headers: { 'x-turnkeyxgaming-key': token, 'Accept': 'application/json' }
})
.then(async res => {
    console.log("STATUS:", res.status);
    console.log("TEXT START:", (await res.text()).substring(0, 100));
})
.catch(err => {
    console.log("FETCH ERROR:", err);
});
