require( "./model" );
const express = require( "express" );

const controller = require( "./controller" );

const router = express.Router( );

router.get("/get", controller.getList);
router.post("/getApplication", controller.getApplication);
router.post("/avgDailyInstall", controller.avgDailyInstall);

module.exports = router;
