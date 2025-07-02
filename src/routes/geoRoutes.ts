import express from 'express';
import * as geoController from '#controllers/geoController';
import { authenticateToken } from '#src/middlewares/authMiddleware';

const router = express.Router();

/** Provinces routes */
// Public routes
router.get('/provinces', geoController.getAllProvinces);
router.get('/provinces/:idOrCode', geoController.getProvinceDetails);
router.get('/provinces/:provinceIdOrCode/districts', geoController.getDistrictsByProvince);

// Private routes

/** Districts routes */
// Public routes
router.get('/districts/:districtIdOrCode', geoController.getDistrictDetails);
router.get('/districts/:districtIdOrCode/wards', geoController.getWardsByDistrict);

// Private routes

/** Search routes */
// Public route
router.get('/search', geoController.searchLocations);

// Private routes

export default router;
