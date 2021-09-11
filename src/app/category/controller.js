const axios = require("axios");
const _ = require("lodash");
const moment = require("moment");
const mongoose = require("mongoose");
const iso3311a2 = require('iso-3166-1-alpha-2');
const Category = mongoose.model("countrycategories");
require('dotenv').config()

const getDate = date => moment(date).format("YYYY-MM-DD")
const todayDate = new Date()

const myLoggers = require('log4js');

myLoggers.configure({
    appenders: { mylogger: { type:"file", filename: "mylogger.log" } },
    categories: { default: { appenders:["mylogger"], level:"ALL" } }
});

const logger = myLoggers.getLogger("default");

exports.getApplication = async (req, res) => {
    try {
        const promiseBuilder = {
            updateAppPromise: (payload, appCategory, appCollection, country) => new Promise(async (resolve) => {
                try {
                    const response = await axios.get(`http://localhost:3000/api/apps/${payload.appId}/`);
                    if(response.status === 200){
                        if (response && response.data) {
                            const result = response.data
                            const Country = iso3311a2.getCountry(country)

                            const yesterday = moment(new Date(new Date().setDate(new Date().getDate() - 1))).format("YYYY-MM-DD")
                            const yesterDayData = await Category.findOne({appId : payload.appId, Country: Country, CreatedDate : yesterday})
                            const dailyInstall = ((result && result.maxInstalls) - ((yesterDayData && yesterDayData.maxInstalls) || 0)) || result && result.maxInstalls

                            result.CreatedDate = getDate(todayDate)
                            result.appCategory = (appCategory === "NONE") ? "MixAll" : appCategory
                            result.appCollection = appCollection
                            result.Country = Country
                            result.dailyInstall = dailyInstall
                            console.log("appId",payload.appId)
                            const isUpdate = await Category.create(result)
                            if (isUpdate && isUpdate._id) {
                                console.log("true")
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
                }catch (e) {
                    return resolve({success: false})
                }
            })
        }
        const {appCategory, appCollection, country} = req.body
        const Country = iso3311a2.getCountry(country)
        const allPromises = []
        const filterList = []
        const record = await Category.find({})
        const currentDateRecord = record.filter(item => item.CreatedDate === getDate(todayDate) && item.Country === Country)
        if (!currentDateRecord.length) {
            if (appCategory === "NONE") {
                const response = await axios.get(`http://localhost:3000/api/apps/?collection=${appCollection}&country=${country}`)
                if(response){
                    Object.keys(response.data).forEach(item => {
                        if (item === "results") {
                            const result = response.data[item]
                            filterList.push(...result)
                        }
                    })
                }
            } else {
                const response = await axios.get(`http://localhost:3000/api/apps/?collection=${appCollection}&category=${appCategory}&country=${country}`)
                if(response){
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
                    allPromises.push(promiseBuilder.updateAppPromise(payload, appCategory, appCollection, country))
                })
                console.log("allPromises",allPromises.length)
                await Promise.all(allPromises).then(async (values) => {
                    if (values.some(value => value.success)) {
                        console.log("success")
                        logger.info('Successfully created');
                        res.status(200).send({success: true, message: "Successfully created"})
                    } else {
                        console.log("exist")
                        logger.info('something went wrong.');
                        res.status(200).send({success: false, message: "Something Went Wrong"})
                    }
                }).catch((err) => {
                    logger.error("catchError", err);
                    console.log("catchError", err)
                })
            } else {
                logger.info('No Data Found');
                res.status(200).send({success: true, message: "No Data Found"})
            }
        } else {
            // const update = await Category.remove({CreatedDate : getDate(todayDate)})
            // if(update && update.ok){
            //     console.log("true")
            // }else {
            //     console.log("falseas")
            // }
            logger.info('Current Date Data Already Exist.');
            res.status(200).send({success: true, message: "Current Date Data Already Exist."})
        }
    } catch (err) {
        logger.error("Some error occurred while retrieving login.");
        res.status(500).send({success: true, message: err.message || "Some error occurred while retrieving login."});
    }
};

exports.getCategoryData = async (req, res) => {
    try {
        const {appCategory, appCollection, country} = req.body
        const countryName = iso3311a2.getCountry(country)
        let query = {}
        if (req.body) {
            query = {
                appCategory: (appCategory === "NONE") ? "MixAll" : appCategory,
                appCollection,
                Country: countryName,
                CreatedDate: getDate(todayDate)
            }
        }
        const data = await Category.find(query)
        if (data.length) {
            res.status(200).send({success: true, message: "Successfully created", data: data})
        } else {
            res.status(200).send({success: false})
        }
    } catch (err) {
        res.status(500).send({message: err.message || "Some error occurred while retrieving login."});
    }
}

exports.getCriteriaData = async (req, res) => {
    try {
        const {selectedDay, criteria, country} = req.body
        const countryName = iso3311a2.getCountry(country)
        const startDate = getDate(todayDate)
        const endDate = moment(new Date(new Date().setDate(new Date().getDate() - (selectedDay - 1)))).format("YYYY-MM-DD")

        let endLimit = 0;

        if(criteria === 1000){
            endLimit = 9999
        }else if (criteria === 10000){
            endLimit = 99999
        }else if (criteria === 100000){
            endLimit = 999999
        }else if (criteria === 1000000){
            endLimit = 9999999
        }

        let query = {}
        if (req.body) {
            query = {
                Country: countryName,
                CreatedDate: {$gte: endDate, $lte: startDate}
            }
        }
        const data = await Category.find(query)
        const payload =[]
        console.log("criteria",criteria)
        console.log("endLimit",endLimit)
        if (data.length) {
            const groupByAppId = _.mapValues(_.groupBy(data, "appId"))
            Object.keys(groupByAppId).forEach(item => {
                const minInstall = _.minBy(groupByAppId[item], "maxInstalls")
                const maxInstall = _.maxBy(groupByAppId[item], "maxInstalls")
                const compareCriteria = criteria <= (maxInstall.maxInstalls - minInstall.maxInstalls) && endLimit >= (maxInstall.maxInstalls - minInstall.maxInstalls)
                if(compareCriteria){
                    payload.push(maxInstall)
                }
            })
        }
        if(payload.length){
            res.status(200).send({success: true, message: "Successfully created", data: payload})
        }else {
            res.status(200).send({success: false})
        }
    } catch (err) {
        res.status(500).send({message: err.message || "Something Went Wrong."});
    }
}

exports.unListData = async (req, res) => {
    try {
        const {country} = req.body
        const countryName = iso3311a2.getCountry(country)

        const data1 = await Category.find({CreatedDate :  moment(new Date(new Date().setDate(new Date().getDate() - 1))).format("YYYY-MM-DD"), Country: countryName})

        const data = await Category.find({CreatedDate: getDate(todayDate), Country: countryName})

        const results = data1.filter(({ appId: id1 }) => !data.some(({ appId: id2 }) => id2 === id1));
        if(results.length){
            res.status(200).send({success: true, message: "Successfully get", data: results})
        }else {
            res.status(200).send({success: false})
        }
    } catch (err) {
        res.status(500).send({message: err.message || "Some error occurred while retrieving login."});
    }
};
