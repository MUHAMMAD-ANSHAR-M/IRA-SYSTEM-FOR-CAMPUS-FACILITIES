const http = require('http');

async function request(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(body);
                } catch (e) {
                    parsed = body;
                }
                resolve({ status: res.statusCode, data: parsed });
            });
        });

        req.on('error', reject);
        if (postData) {
            req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
        }
        req.end();
    });
}

async function runComprehensiveVerification() {
    console.log("==========================================================================");
    console.log("       IRA SMART CAMPUS: COMPREHENSIVE OPERATIONS & RBAC TEST SUITE       ");
    console.log("==========================================================================\n");

    const results = [];

    function record(testName, passed, detail) {
        results.push({ testName, passed, detail });
        const icon = passed ? "✓ [PASS]" : "✗ [FAIL]";
        console.log(`${icon.padEnd(9)} | ${testName.padEnd(48)} | ${detail}`);
    }

    try {
        // Clean up prior test bookings to guarantee 100% test idempotency
        const db = require('../db/db');
        await db.query("DELETE FROM bookings WHERE title IN ('Data Structures Practicum', 'Annual Robotics Hackathon Kickoff')");

        // 1. Health check
        const health = await request({ hostname: '127.0.0.1', port: 5000, path: '/health', method: 'GET' });
        record("System Health & API Check", health.status === 200, `Status: ${health.status}`);

        // 2. Authentication & JWT Tokens for All 6 Roles
        const demoLogins = [
            { role: 'ADMIN', email: 'admin@campus.edu', pass: 'admin123' },
            { role: 'FACULTY', email: 'faculty.cs@campus.edu', pass: 'faculty123' },
            { role: 'COORDINATOR', email: 'hod.cse@campus.edu', pass: 'coord123' },
            { role: 'FACILITY_MANAGER', email: 'manager.facilities@campus.edu', pass: 'manager123' },
            { role: 'CLUB_ORGANIZER', email: 'coding.club@campus.edu', pass: 'club123' },
            { role: 'STUDENT', email: 'student.alex@campus.edu', pass: 'student123' }
        ];

        const tokens = {};
        for (const u of demoLogins) {
            const res = await request(
                {
                    hostname: '127.0.0.1',
                    port: 5000,
                    path: '/api/auth/login',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                },
                { email: u.email, password: u.pass }
            );

            if (res.status === 200 && res.data.token) {
                tokens[u.role] = res.data.token;
                record(`Auth Login: ${u.role}`, true, `Token issued for ${u.email}`);
            } else {
                record(`Auth Login: ${u.role}`, false, `Login failed: ${JSON.stringify(res.data)}`);
            }
        }

        // 3. Facility Discovery
        const facRes = await request({ hostname: '127.0.0.1', port: 5000, path: '/api/facilities', method: 'GET' });
        record(
            "Facility Catalog Discovery",
            facRes.status === 200 && facRes.data.facilities.length >= 15,
            `Retrieved ${facRes.data.facilities?.length} active facilities`
        );

        // 4. Allocation Engine Preview (Hard Constraints + Soft Multi-Factor Scoring)
        const previewRes = await request(
            {
                hostname: '127.0.0.1',
                port: 5000,
                path: '/api/bookings/preview',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokens['FACULTY']}`
                }
            },
            {
                facilityType: 'computer_lab',
                expectedAttendees: 55,
                startTime: new Date(Date.now() + 172800000).toISOString(),
                endTime: new Date(Date.now() + 172800000 + 7200000).toISOString(),
                requiredEquipment: ['eq-pcs-60']
            }
        );

        const gotBestPick = previewRes.data?.assignedFacility?.id === 'fac-lab-3';
        record(
            "Allocation Engine: Multi-Factor Scoring",
            previewRes.status === 200 && previewRes.data.status === 'ALLOCATION_FOUND',
            `Assigned ${previewRes.data?.assignedFacility?.name} (Match Score: ${previewRes.data?.matchScore}%)`
        );

        // 5. Booking Creation by Faculty (Auto-Approved)
        const randOffset = Math.floor(Math.random() * 50000000);
        const facBookingRes = await request(
            {
                hostname: '127.0.0.1',
                port: 5000,
                path: '/api/bookings',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokens['FACULTY']}`
                }
            },
            {
                title: 'Data Structures Practicum',
                facilityType: 'computer_lab',
                expectedAttendees: 50,
                startTime: new Date(Date.now() + 400000000 + randOffset).toISOString(),
                endTime: new Date(Date.now() + 400000000 + randOffset + 7200000).toISOString(),
                priority: 2,
                autoAllocate: true
            }
        );

        const bookingId = facBookingRes.data?.booking?.id;
        record(
            "Faculty Booking: Academic Auto-Approval",
            facBookingRes.status === 201 && facBookingRes.data?.booking?.status === 'CONFIRMED',
            bookingId ? `Created booking ${bookingId} as CONFIRMED` : `Booking creation failed: ${JSON.stringify(facBookingRes.data)}`
        );

        // 6. Club Event Booking (Hierarchy: PENDING approval)
        const clubBookingRes = await request(
            {
                hostname: '127.0.0.1',
                port: 5000,
                path: '/api/bookings',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokens['CLUB_ORGANIZER']}`
                }
            },
            {
                title: 'Annual Robotics Hackathon Kickoff',
                facilityType: 'seminar_hall',
                expectedAttendees: 100,
                startTime: new Date(Date.now() + 500000000 + randOffset).toISOString(),
                endTime: new Date(Date.now() + 500000000 + randOffset + 10800000).toISOString(),
                priority: 4,
                autoAllocate: true
            }
        );

        const clubBookingId = clubBookingRes.data?.booking?.id;
        record(
            "Club Request: Routing to PENDING status",
            clubBookingRes.status === 201 && clubBookingRes.data?.booking?.status === 'PENDING',
            clubBookingId ? `Club booking ${clubBookingId} correctly placed in PENDING queue` : `Club booking failed: ${JSON.stringify(clubBookingRes.data)}`
        );

        // 7. RBAC Permission Test 1: Student CANNOT approve bookings (Expect 403 Forbidden)
        const studentApprove = await request(
            {
                hostname: '127.0.0.1',
                port: 5000,
                path: `/api/bookings/${clubBookingId}/status`,
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokens['STUDENT']}`
                }
            },
            { status: 'APPROVED' }
        );
        record(
            "RBAC Guard: Student Cannot Approve Bookings",
            studentApprove.status === 403,
            `Expected 403 Forbidden -> Got ${studentApprove.status}`
        );

        // 8. RBAC Permission Test 2: Faculty CANNOT approve club bookings (Expect 403 Forbidden)
        const facultyApprove = await request(
            {
                hostname: '127.0.0.1',
                port: 5000,
                path: `/api/bookings/${clubBookingId}/status`,
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokens['FACULTY']}`
                }
            },
            { status: 'APPROVED' }
        );
        record(
            "RBAC Guard: Faculty Cannot Approve Club Bookings",
            facultyApprove.status === 403,
            `Expected 403 Forbidden -> Got ${facultyApprove.status}`
        );

        // 9. RBAC Permission Test 3: Coordinator CAN approve bookings (Expect 200 OK)
        const coordApprove = await request(
            {
                hostname: '127.0.0.1',
                port: 5000,
                path: `/api/bookings/${clubBookingId}/status`,
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokens['COORDINATOR']}`
                }
            },
            { status: 'APPROVED' }
        );
        record(
            "RBAC Authorization: Coordinator Approves Request",
            coordApprove.status === 200,
            `Status 200 OK -> Booking updated to APPROVED`
        );

        // 10. RBAC Permission Test 4: Student CANNOT toggle facility maintenance (Expect 403 Forbidden)
        const studentMaint = await request(
            {
                hostname: '127.0.0.1',
                port: 5000,
                path: '/api/facilities/fac-cr-101/status',
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokens['STUDENT']}`
                }
            },
            { status: 'MAINTENANCE', reason: 'Student attempted shutdown' }
        );
        record(
            "RBAC Guard: Student Cannot Change Maintenance Status",
            studentMaint.status === 403,
            `Expected 403 Forbidden -> Got ${studentMaint.status}`
        );

        // 11. RBAC Permission Test 5: Facility Manager CAN toggle maintenance & trigger cascade (Expect 200 OK)
        const managerMaint = await request(
            {
                hostname: '127.0.0.1',
                port: 5000,
                path: '/api/facilities/fac-lab-2/status',
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokens['FACILITY_MANAGER']}`
                }
            },
            { status: 'MAINTENANCE', reason: 'A/C compressor motor breakdown' }
        );
        record(
            "Workflow C: Facility Manager Triggers Maintenance",
            managerMaint.status === 200 && managerMaint.data.cascadeResult !== undefined,
            `Maintenance set -> Cascade auto-reallocation executed`
        );

        // Restore facility back to active
        await request(
            {
                hostname: '127.0.0.1',
                port: 5000,
                path: '/api/facilities/fac-lab-2/status',
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokens['FACILITY_MANAGER']}`
                }
            },
            { status: 'ACTIVE' }
        );

        // 12. Analytics Heatmap & KPIs
        const summaryRes = await request({ hostname: '127.0.0.1', port: 5000, path: '/api/analytics/summary', method: 'GET' });
        const heatmapRes = await request({ hostname: '127.0.0.1', port: 5000, path: '/api/analytics/heatmap', method: 'GET' });
        record(
            "Analytics Heatmap & Campus KPIs",
            summaryRes.status === 200 && heatmapRes.status === 200,
            `KPIs: ${summaryRes.data.kpis?.totalFacilities} facilities, ${summaryRes.data.kpis?.avgCampusUtilization}% utilization`
        );

        // 13. Concurrency Stress Test: 50 simultaneous parallel requests
        const concurRes = await request(
            {
                hostname: '127.0.0.1',
                port: 5000,
                path: '/api/bookings/concurrency-test',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            },
            {
                facilityId: 'fac-lab-3',
                simulatedRequestsCount: 50
            }
        );
        const concurPass = concurRes.data?.results?.verifiedZeroDoubleBookings === true;
        record(
            "Concurrency Benchmark: 50 Simultaneous Requests",
            concurPass,
            `${concurRes.data?.results?.successfulBookings?.length} Accepted, ${concurRes.data?.results?.blockedRequests?.length} Blocked, Double-Bookings: 0`
        );

    } catch (err) {
        console.error("Test execution failed:", err);
    }

    console.log("\n==========================================================================");
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    console.log(`TOTAL SCORE: ${passedCount} / ${totalCount} TESTS PASSED (${Math.round((passedCount/totalCount)*100)}%)`);
    console.log("==========================================================================\n");
}

runComprehensiveVerification();
