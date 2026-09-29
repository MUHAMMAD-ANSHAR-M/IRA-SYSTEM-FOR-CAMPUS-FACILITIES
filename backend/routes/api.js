const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const facilityController = require('../controllers/facilityController');
const bookingController = require('../controllers/bookingController');
const analyticsController = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// Public Auth & Demo Routes
router.post('/auth/login', authController.login);
router.get('/auth/demo-users', authController.getDemoUsers);
router.get('/auth/me', authenticate, authController.getCurrentUser);

// Facilities
router.get('/facilities', facilityController.getFacilities);
router.get('/facilities/:id', facilityController.getFacilityById);
router.put('/facilities/:id/status', authenticate, requireRole('ADMIN', 'FACILITY_MANAGER'), facilityController.updateFacilityStatus);
router.get('/equipment', facilityController.getEquipmentList);

// Allocation & Bookings
router.post('/bookings/preview', authenticate, bookingController.previewAllocation);
router.post('/bookings', authenticate, bookingController.createBooking);
router.get('/bookings', bookingController.getBookings);
router.put('/bookings/:id/status', authenticate, requireRole('ADMIN', 'COORDINATOR'), bookingController.updateBookingStatus);
router.post('/bookings/concurrency-test', bookingController.runConcurrencySimulation);

// Analytics & Reports
router.get('/analytics/summary', analyticsController.getDashboardSummary);
router.get('/analytics/heatmap', analyticsController.getUtilizationHeatmap);
router.get('/analytics/forecast', analyticsController.getForecast);
router.get('/analytics/export', analyticsController.exportReport);
router.get('/analytics/report-html', analyticsController.getPrintableReport);

module.exports = router;
