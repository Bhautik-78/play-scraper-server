require( "./model" );
const express = require( "express" );

const controller = require( "./controller" );

const router = express.Router( );

router.post("/fetchData", controller.getApplication);
router.post("/fetchCategoryData", controller.getCategoryData);
router.post("/fetchCriteriaData", controller.getCriteriaData);
router.post("/fetchCompareData", controller.unListData);

module.exports = router;
