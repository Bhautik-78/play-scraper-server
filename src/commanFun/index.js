const moment = require("moment");

const dateFormat = 'YYYY-MM-DD';

exports.getFormatDate = (date) => {
    return moment(date).format(dateFormat)
};
