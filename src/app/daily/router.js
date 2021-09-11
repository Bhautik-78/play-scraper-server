require( "./model" );
const express = require( "express" );

const controller = require( "./controller" );

const router = express.Router( );

router.post("/fetchData", controller.getApplication);
router.post("/loadData", controller.loadApplication);
router.post("/avgDailyInstall", controller.avgDailyInstall);

module.exports = router;
