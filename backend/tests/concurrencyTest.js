const http = require('http');

console.log("==================================================================");
console.log("IRA Smart Campus: Live Concurrency & Zero Double-Booking Stress Test");
console.log("Firing 50 simultaneous booking requests for Computer Lab 3...");
console.log("==================================================================");

const postData = JSON.stringify({
    facilityId: 'fac-lab-3',
    simulatedRequestsCount: 50,
    startTime: new Date(Date.now() + 86400000).toISOString(), // tomorrow
    durationHours: 2
});

const req = http.request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/bookings/concurrency-test',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
}, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        try {
            const data = JSON.parse(body);
            console.log("\nSTRESS TEST OUTCOME:");
            console.log("------------------------------------------------------------------");
            console.log(`Target Resource:             ${data.results.targetFacility}`);
            console.log(`Total Concurrent Requests:   ${data.results.totalRequests}`);
            console.log(`Accepted Bookings:           ${data.results.successfulBookings.length}`);
            console.log(`Blocked Conflicting Requests:${data.results.blockedRequests.length}`);
            console.log(`Double Bookings in Database: ${data.results.doubleBookingsCount}`);
            console.log(`Execution Time:              ${data.results.executionTimeMs} ms`);
            console.log(`Zero Double Booking Proof:   ${data.results.verifiedZeroDoubleBookings ? 'PASSED (VERIFIED)' : 'FAILED'}`);
            console.log("------------------------------------------------------------------");
        } catch (e) {
            console.error("Response:", body);
        }
    });
});

req.on('error', (e) => {
    console.error("Test failed: Ensure backend server is running on port 5000. Error:", e.message);
});

req.write(postData);
req.end();
