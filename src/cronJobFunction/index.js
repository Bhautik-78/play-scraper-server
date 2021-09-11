const mongoose = require("mongoose");
const Users = mongoose.model("users");
const Category = mongoose.model("countrycategories");
const Daily = mongoose.model("dailyapps");
const _ = require("lodash");
const axios = require("axios");
const moment = require("moment");
const iso3311a2 = require('iso-3166-1-alpha-2');

const getDate = date => moment(date).format("YYYY-MM-DD")
const todayDate = new Date()

const myLoggers = require('log4js');

myLoggers.configure({
    appenders: { mylogger: { type:"file", filename: "mylogger.log" } },
    categories: { default: { appenders:["mylogger"], level:"ALL" } }
});

const logger = myLoggers.getLogger("default");

exports.getListForCronJob = async () => {
    try {
        const promiseBuilder = {
            updateAppPromise: (payload) => new Promise(async (resolve) => {

                const yesterday = moment(new Date(new Date().setDate(new Date().getDate() - 1))).format("YYYY-MM-DD")
                const yesterDayData = await Users.findOne({appId : payload.appId, CreatedDate : yesterday})
                const dailyInstall = (payload.maxInstalls) - ((yesterDayData && yesterDayData.maxInstalls) || 0) || payload && payload.maxInstalls

                payload.CreatedDate = getDate(todayDate)
                payload.dailyInstall = dailyInstall
                const isUpdate = await Users.create(payload)
                if (isUpdate && isUpdate._id) {
                    return resolve({success: true})
                }else {
                    return resolve({success: false})
                }
            })
        }
        const allPromises = []
        const filterList = []

        console.log("start app")
        const record = await Users.find({})
        const currentDateRecord = record.filter(item => item.CreatedDate === getDate(todayDate))
        if(!currentDateRecord.length){
            const response = await axios.get(`http://localhost:3000/api/apps/?fullDetail=true`)
            Object.keys(response.data).forEach(item => {
                if(item === "results"){
                    const result = response.data[item]
                    filterList.push(...result)
                }
            })
            if (filterList && filterList.length > 0) {
                filterList.forEach(payload => {
                    allPromises.push(promiseBuilder.updateAppPromise(payload))
                })
                console.log("allPromises",allPromises.length)
                await Promise.all(allPromises).then(async (values) => {
                    if (values.some(value => value.success)) {
                        logger.info('Successfully created');
                        console.log("Successfully created")
                    } else {
                        logger.info('something went wrong.');
                        console.log("false")
                    }
                })
            } else {
                logger.info('No Data Found');
                console.log("No Data Found")
            }
        }else {
            logger.info('Current Date Data Already Exist.');
            console.log("Current Date Data Already Exist.")
        }
    } catch (err) {
        logger.error("Some error occurred while retrieving login.");
        console.log("Some error occurred while retrieving login.")
    }
};

exports.getApplicationForCronJob = async () => {
    try {
        const promiseBuilder = {
            updateAppPromise: (payload, appCategory, appCollection, item) => new Promise(async (resolve) => {
                try {
                    const response = await axios.get(`http://localhost:3000/api/apps/${payload.appId}/`)
                    if (response.status === 200) {
                        if (response && response.data) {
                            const result = response.data
                            const Country = iso3311a2.getCountry(item)

                            const yesterday = moment(new Date(new Date().setDate(new Date().getDate() - 1))).format("YYYY-MM-DD")
                            const yesterDayData = await Category.findOne({appId : payload.appId, Country: Country, CreatedDate : yesterday})
                            const dailyInstall = ((result && result.maxInstalls) - ((yesterDayData && yesterDayData.maxInstalls) || 0)) || result && result.maxInstalls

                            result.CreatedDate = getDate(todayDate)
                            result.appCategory = (appCategory === "NONE") ? "MixAll" : appCategory
                            result.appCollection = appCollection
                            result.Country = Country
                            result.dailyInstall = dailyInstall
                            const isUpdate = await Category.create(result)
                            if (isUpdate && isUpdate._id) {
                                return resolve({success: true})
                            } else {
                                return resolve({success: false})
                            }
                        } else {
                            return resolve({success: false})
                        }
                    } else {
                        return resolve({success: false})
                    }
                } catch (e) {
                    return resolve({success: false})
                }
            })
        }

        console.log("start country app")
        const appCategory = "NONE"
        const appCollection = "topselling_new_free"
        const country = ["AU", "CA", "IN", "US", "SA"]

        for (const item of country) {
            console.log("item",item)
            const Country = iso3311a2.getCountry(item)
            const allPromises = []
            const filterList = []
            const record = await Category.find({})
            const currentDateRecord = record.filter(item => item.CreatedDate === getDate(todayDate) && item.Country === Country)
            if (!currentDateRecord.length) {
                if (appCategory === "NONE") {
                    const response = await axios.get(`http://localhost:3000/api/apps/?collection=${appCollection}&country=${item}`)
                    if (response) {
                        Object.keys(response.data).forEach(item => {
                            if (item === "results") {
                                const result = response.data[item]
                                filterList.push(...result)
                            }
                        })
                    }
                } else {
                    const response = await axios.get(`http://localhost:3000/api/apps/?collection=${appCollection}&category=${appCategory}&country=${item}`)
                    if (response) {
                        Object.keys(response.data).forEach(item => {
                            if (item === "results") {
                                const result = response.data[item]
                                filterList.push(...result)
                            }
                        })
                    }
                }
                if (filterList && filterList.length > 0) {
                    filterList && filterList.forEach(payload => {
                        allPromises.push(promiseBuilder.updateAppPromise(payload, appCategory, appCollection, item))
                    })
                    console.log("allPromises",allPromises.length)
                    await Promise.all(allPromises).then(async (values) => {
                        if (values.some(value => value.success)) {
                            logger.info('Successfully created');
                            console.log("Successfully created")
                        } else {
                            logger.info('something went wrong.');
                            console.log("Something Went Wrong")
                        }
                    }).catch((err) => {
                        logger.error("catchError", err);
                        console.log("catchError")
                    })
                } else {
                    logger.info('No Data Found');
                    console.log("No Data Found")
                }
            } else {
                logger.info('Current Date Data Already Exist.');
                console.log("Current Date Data Already Exist.")
            }
        }
    } catch (err) {
        logger.error("Some error occurred while retrieving login.");
        console.log(err)
    }
};

exports.getDailyApplicationForCronJob = async () => {
    try {
        const promiseBuilder = {
            updateAppPromise: (payload,appCategory, appCollection,countryName) => new Promise(async (resolve) => {
                try {
                    if(payload.CreatedDate === getDate(todayDate)){
                        const result = _.omit(payload, '_id', '__v','CreatedDate','appCategory','appCollection','Country');
                        result.CreatedDate = getDate(todayDate)
                        result.appCategory = (appCategory === "NONE") ? "MixAll" : appCategory
                        result.appCollection = appCollection
                        result.Country = countryName
                        const isUpdate = await Daily.create(result)
                        if (isUpdate && isUpdate._id) {
                            return resolve({success: true})
                        } else {
                            return resolve({success: false})
                        }
                    }else {
                        const response = await axios.get(`http://localhost:3000/api/apps/${payload.appId}/`)
                        if(response.status === 200){
                            if (response && response.data) {
                                const result1 = response.data

                                const yesterday = moment(new Date(new Date().setDate(new Date().getDate() - 1))).format("YYYY-MM-DD")
                                const yesterDayData = await Category.findOne({appId : payload.appId, Country: countryName, CreatedDate : yesterday})
                                const dailyInstall = (result1 && result1.maxInstalls) - ((yesterDayData && yesterDayData.maxInstalls) || 0) || result1 && result1.maxInstalls

                                result1.CreatedDate = getDate(todayDate)
                                result1.appCategory = (appCategory === "NONE") ? "MixAll" : appCategory
                                result1.appCollection = appCollection
                                result1.Country = countryName
                                result1.dailyInstall = dailyInstall
                                const isUpdate = await Daily.create(result1)
                                if (isUpdate && isUpdate._id) {
                                    return resolve({success: true})
                                } else {
                                    return resolve({success: false})
                                }
                            } else {
                                return resolve({success: false})
                            }
                        }else {
                            return resolve({success: false})
                        }
                    }
                }catch (e) {
                    return resolve({success: false})
                }
            })
        }

        console.log("start daily app")
        const appCategory = "NONE"
        const appCollection = "topselling_new_free"
        const country = ["AU", "CA", "IN", "US", "SA"]

        for (const item of country) {
            console.log("item",item)
            const countryName = iso3311a2.getCountry(item)
            const allPromise = []

            const record = await Daily.find({})
            const currentDateRecord = record.filter(item => item.CreatedDate === getDate(todayDate) && item.Country === countryName)
            if (!currentDateRecord.length) {

                const ydd = await Daily.find({
                    CreatedDate: moment(new Date(new Date().setDate(new Date().getDate() - 1))).format("YYYY-MM-DD"),
                    Country: countryName
                })
                console.log("dailyYesterDayData", ydd.length)

                const yesterDayRecord = await Category.find({
                    CreatedDate: moment(new Date(new Date().setDate(new Date().getDate() - 1))).format("YYYY-MM-DD"),
                    Country: countryName
                })
                const todayRecord = await Category.find({CreatedDate: getDate(todayDate), Country: countryName})

                const results1 = todayRecord.filter(({appId: id1}) => ydd.some(({appId: id2}) => id2 === id1));
                console.log("results1", results1.length)

                const results = todayRecord.filter(({appId: id1}) => !yesterDayRecord.some(({appId: id2}) => id2 === id1));
                console.log("results", results.length)

                const result3 = ydd.filter(({appId: id1}) => !results1.some(({appId: id2}) => id2 === id1));
                console.log("result3", result3.length)

                const finalResult = results.concat(results1, result3)
                console.log("finalResult", finalResult.length)

                if (finalResult && finalResult.length) {
                    finalResult && finalResult.forEach(payload => {
                        allPromise.push(promiseBuilder.updateAppPromise(payload, appCategory, appCollection, countryName))
                    })
                    await Promise.all(allPromise).then(async (values) => {
                        if (values.some(value => value.success)) {
                            logger.info('Successfully created');
                            console.log("success")
                        } else {
                            logger.info('something went wrong.');
                            console.log("exist")
                        }
                    }).catch((err) => {
                        logger.error("catchError",err);
                        console.log("catchError", err)
                    })
                } else {
                    logger.info('No Data Found');
                    console.log("No Data Found")
                }
            } else {
                logger.info('Current Date Data Already Exist.');
                console.log("Current Date Data Already Exist.")
            }
        }
    } catch (err) {
        logger.error("Some error occurred while retrieving login.");
        console.log("Some error occurred while retrieving login.")
    }
};
