import express from 'express';
import * as geoController from '#controllers/geoController';
import { authenticateToken } from '#src/middlewares/authMiddleware';

const router = express.Router();

// Provinces routes
router.get('/provinces', authenticateToken, geoController.getAllProvinces);
router.get('/provinces/:idOrCode', authenticateToken, geoController.getProvinceDetails);
router.get('/provinces/:provinceIdOrCode/districts', authenticateToken, geoController.getDistrictsByProvince);

// Districts routes
router.get('/districts/:districtIdOrCode', authenticateToken, geoController.getDistrictDetails);
router.get('/districts/:districtIdOrCode/wards', authenticateToken, geoController.getWardsByDistrict);

// Search route
router.get('/search', authenticateToken, geoController.searchLocations);

export default router;
