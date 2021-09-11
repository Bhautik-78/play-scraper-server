const usersRouter = require("./users/router");
const categoryRouter = require("./category/router");
const dailyRouter = require("./daily/router");

module.exports = (app) => {
    app.use("/users", usersRouter);
    app.use("/category", categoryRouter);
    app.use("/daily", dailyRouter);
};
