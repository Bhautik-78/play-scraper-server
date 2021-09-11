require( "./src/app/category/model" );
require( "./src/app/users/model" );
require( "./src/app/daily/model" );
const express = require("express");
const bodyParser = require("body-parser");

const cors = require("cors");
const path = require("path");
const config = require("./src/config");
const customResponses = require("./src/middlewares/customResponses");

const {getListForCronJob} = require("./src/cronJobFunction/index");
const {getApplicationForCronJob} = require("./src/cronJobFunction/index");
const {getDailyApplicationForCronJob} = require("./src/cronJobFunction/index");

const logger = require("./src/utilities/logger");
const app = express();

const port = process.env.PORT || config.port;
const ENV = process.env.NODE_ENV || config.env;

const CronJob = require("cron").CronJob;

const job = new CronJob("*/20 * * * *", (async () => {
    await getListForCronJob()
    await getApplicationForCronJob()
    await getDailyApplicationForCronJob()
}))

job.start()

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/src/views'));

const urlencodedParser = bodyParser.urlencoded({ extended: false });
app.use(urlencodedParser);
app.use(bodyParser.json());

app.set("env", ENV);

app.use(bodyParser.json());
app.use(customResponses);
app.use(cors());

app.use(express.static(__dirname + '/'));

require("./src/config/mongoose")(app);
require("./src/app")(app);

app.use((req, res) => {
    res.notFound()
});

app.use((err, req, res, next) => {
    logger.error(err.stack);
    next(err);
});

// Don't remove next !!!!
app.use((err, req, res, next) => {
    res.status(503).json({
        success: false,
        error: "server_error",
    });
});

app.use(function (req, res, next) {

//to allow cross domain requests to send cookie information.
    res.header('Access-Control-Allow-Credentials', true);

// origin can not be '*' when crendentials are enabled. so need to set it to the request origin
    res.header('Access-Control-Allow-Origin', req.headers.origin);

// list of methods that are supported by the server
    res.header('Access-Control-Allow-Methods', 'OPTIONS,GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, X-XSRF-TOKEN');

    next();
});

app.listen(port, () => {
    logger.info(`Listening on port ${port}`);
});
