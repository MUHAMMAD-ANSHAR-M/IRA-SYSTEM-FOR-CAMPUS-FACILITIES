const http = require('http');
const config = require('../config/config');

class AIClient {
    constructor() {
        this.baseUrl = config.AI_SERVICE_URL;
    }

    async postJson(endpoint, data) {
        return new Promise((resolve, reject) => {
            const url = new URL(endpoint, this.baseUrl);
            const postData = JSON.stringify(data);

            const options = {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: 3000
            };

            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(body);
                        resolve(parsed);
                    } catch (e) {
                        resolve(null);
                    }
                });
            });

            req.on('error', (err) => {
                // Graceful fallback if AI microservice is not running
                resolve(null);
            });

            req.on('timeout', () => {
                req.destroy();
                resolve(null);
            });

            req.write(postData);
            req.end();
        });
    }

    async getJson(endpoint) {
        return new Promise((resolve) => {
            const url = new URL(endpoint, this.baseUrl);
            const req = http.get(url, { timeout: 3000 }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        resolve(null);
                    }
                });
            });

            req.on('error', () => resolve(null));
            req.on('timeout', () => {
                req.destroy();
                resolve(null);
            });
        });
    }

    /**
     * Demand forecasting for slot
     */
    async predictDemand(dayOfWeek, hour, facilityType, expectedAttendees) {
        const payload = {
            day_of_week: dayOfWeek,
            hour,
            facility_type: facilityType || 'classroom',
            department: 'CSE',
            duration_hours: 2,
            facility_capacity: 60,
            expected_attendees: expectedAttendees || 40
        };

        const res = await this.postJson('/predict/demand', payload);
        if (res && res.demand_score !== undefined) {
            return res;
        }

        // Rule-based heuristic fallback if AI microservice offline
        const isPeak = hour >= 9 && hour <= 15;
        const score = isPeak ? 78.5 : 32.0;
        return {
            demand_score: score,
            intensity: isPeak ? 'HIGH' : 'LOW',
            recommendation: isPeak ? 'Peak demand slot. Higher contention expected.' : 'Normal operational traffic.',
            is_fallback: true
        };
    }

    /**
     * No-show likelihood
     */
    async predictNoShow(booking) {
        const res = await this.postJson('/predict/no-show', {
            day_of_week: new Date(booking.start_time).getDay(),
            hour: new Date(booking.start_time).getHours(),
            facility_type: booking.facility_type || 'computer_lab',
            facility_capacity: booking.capacity || 60,
            expected_attendees: booking.expected_attendees || 45,
            lead_time_days: 5
        });

        if (res) return res;

        return {
            no_show_probability: 0.12,
            risk_level: 'LOW',
            recommended_action: 'Standard auto-confirm',
            is_fallback: true
        };
    }

    /**
     * Underutilization & overdemand clustering analysis
     */
    async analyzeUnderutilization(facilitiesMetrics) {
        const res = await this.postJson('/analytics/underutilization', { facilities: facilitiesMetrics });
        if (res) return res;

        // Fallback calculations
        const under = [];
        const over = [];
        const breakdown = facilitiesMetrics.map(f => {
            const util = Math.round((f.booked_hours / Math.max(f.available_hours || 40, 1)) * 100);
            let cat = 'BALANCED';
            if (util < 30) { cat = 'UNDERUTILIZED'; under.push(f.name); }
            else if (util > 75) { cat = 'OVERDEMANDED'; over.push(f.name); }
            return { ...f, utilization_rate: util, classification: cat };
        });

        return {
            summary: {
                total_analyzed: facilitiesMetrics.length,
                underutilized_count: under.length,
                balanced_count: facilitiesMetrics.length - under.length - over.length,
                overdemanded_count: over.length,
                avg_campus_utilization: Math.round(breakdown.reduce((acc, b) => acc + b.utilization_rate, 0) / (breakdown.length || 1))
            },
            facility_breakdown: breakdown,
            actionable_recommendations: [
                { facility: "Computer Lab 5", type: "CONSOLIDATE", severity: "MEDIUM", message: "Lab 5 has under 20% utilization for 3 weeks. Consider consolidating." },
                { facility: "Seminar Hall B", type: "RELIEVE_CONGESTION", severity: "HIGH", message: "Seminar Hall B is at 94% utilization on Fridays. Consider shifting events to Hall C." }
            ],
            is_fallback: true
        };
    }
}

module.exports = new AIClient();
