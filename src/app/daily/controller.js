const axios = require("axios");
const _ = require("lodash");
const moment = require("moment");
const mongoose = require("mongoose");
const iso3311a2 = require('iso-3166-1-alpha-2');
const Daily = mongoose.model("dailyapps");
const Category = mongoose.model("countrycategories");
require('dotenv').config()

const myLoggers = require('log4js');

myLoggers.configure({
    appenders: { mylogger: { type:"file", filename: "mylogger.log" } },
    categories: { default: { appenders:["mylogger"], level:"ALL" } }
});

const logger = myLoggers.getLogger("default");

const getDate = date => moment(date).format("YYYY-MM-DD")
const todayDate = new Date()

exports.getApplication = async (req, res) => {
    try {
        const promiseBuilder = {
            updateAppPromise: (payload,appCategory, appCollection,countryName) => new Promise(async (resolve) => {
                try {
                    if(payload.CreatedDate === getDate(todayDate)){
                        console.log("CreatedDate")
                        const result = _.omit(payload, '_id', '__v','CreatedDate','appCategory','appCollection','Country');
                        result.CreatedDate = getDate(todayDate)
                        result.appCategory = (appCategory === "NONE") ? "MixAll" : appCategory
                        result.appCollection = appCollection
                        result.Country = countryName
                        console.log("appId",result.appId)
                        const isUpdate = await Daily.create(result)
                        if (isUpdate && isUpdate._id) {
                            return resolve({success: true})
                        } else {
                            return resolve({success: false})
                        }
                    }else {
                        console.log("notCreated")
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
                                console.log("appId",result1.appId)
                                const isUpdate = await Daily.create(result1)
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
                    }
                }catch (e) {
                    return resolve({success: false})
                }
            })
        }
        const {appCategory, appCollection,country} = req.body
        const countryName = iso3311a2.getCountry(country)
        const allPromise = []

        const record = await Daily.find({})
        const currentDateRecord = record.filter(item => item.CreatedDate === getDate(todayDate) && item.Country === countryName)
        if (!currentDateRecord.length) {

            const ydd = await Daily.find({CreatedDate: moment(new Date(new Date().setDate(new Date().getDate() - 1))).format("YYYY-MM-DD"), Country: countryName})
            console.log("dailyYesterDayData",ydd.length)

            const yesterDayRecord = await Category.find({CreatedDate: moment(new Date(new Date().setDate(new Date().getDate() - 1))).format("YYYY-MM-DD"), Country: countryName})
            const todayRecord = await Category.find({CreatedDate: getDate(todayDate), Country: countryName})

            const results1 = todayRecord.filter(({ appId: id1 }) => ydd.some(({ appId: id2 }) => id2 === id1));
            console.log("results1",results1.length)

            const results = todayRecord.filter(({ appId: id1 }) => !yesterDayRecord.some(({ appId: id2 }) => id2 === id1));
            console.log("results",results.length)

            const result3 = ydd.filter(({ appId: id1 }) => !results1.some(({ appId: id2 }) => id2 === id1));
            console.log("result3",result3.length)

            const finalResult = results.concat(results1,result3)
            console.log("finalResult",finalResult.length)

            if(finalResult && finalResult.length){
                finalResult && finalResult.forEach(payload => {
                    allPromise.push(promiseBuilder.updateAppPromise(payload,appCategory, appCollection,countryName))
                })
                await Promise.all(allPromise).then(async (values) => {
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
                    logger.error("catchError",err);
                    console.log("catchError",err)
                })
            }else {
                logger.info('No Data Found');
                res.status(200).send({success: true, message: "No Data Found"})
            }
        }else {
            // const update = await Daily.remove({CreatedDate : getDate(todayDate)})
            // if(update && update.ok){
            //     console.log("true")
            // }else {
            //     console.log("false")
            // }
            logger.info('Current Date Data Already Exist.');
            res.status(200).send({success: true, message: "Current Date Data Already Exist."})
        }
    } catch (err) {
        logger.error("Some error occurred while retrieving login.");
        res.status(500).send({success: true, message: err.message || "Some error occurred while retrieving login."});
    }
};

exports.loadApplication = async (req, res) => {
    try {
        const {appCategory, appCollection,country} = req.body
        const countryName = iso3311a2.getCountry(country)
        let query = {}
        if (req.body) {
            query = {
                appCategory: (appCategory === "NONE") ? "MixAll" : appCategory,
                appCollection,
                Country : countryName,
                CreatedDate : getDate(todayDate)
            }
        }

        let yesterDayQuery = {}
        if (req.body) {
            yesterDayQuery = {
                appCategory: (appCategory === "NONE") ? "MixAll" : appCategory,
                appCollection,
                Country : countryName,
                CreatedDate : moment(new Date(new Date().setDate(new Date().getDate() - 1))).format("YYYY-MM-DD")
            }
        }

        const payload = await Daily.find(query)
        const result = await Daily.find(yesterDayQuery)

        if(payload && payload.length){
            const payloads = payload.map(item => {
                const data = result.find(item1 => item1.appId === item.appId)
                if(data && data.dailyInstall){
                    return {...item._doc, yesterDayInstall: (data.dailyInstall) || 0 }
                }else {
                    return {...item._doc, yesterDayInstall:  0 }
                }
            });
            res.status(200).send({success: true, message: "Successfully get", data: payloads})
        }else {
            res.status(200).send({success: false})
        }
    }catch (err) {
        res.status(500).send({success: true, message: err.message || "Some error occurred while retrieving login."});
    }
}

exports.avgDailyInstall = async (req, res) => {
    try {
        const { appId, Country } = req.body
        const cureentDayApps = await Daily.findOne({appId : appId, Country: Country, CreatedDate : getDate(todayDate)})
        const allData = await Daily.find({appId : appId, Country: Country})
        const sumofDownload = _.sumBy(allData, (key) => key.dailyInstall || 0)
        const maxInstallObject = []
        allData.forEach(item => {
            maxInstallObject.push({x: parseInt(moment(item.CreatedDate).format("DD")) , y : parseInt(item.dailyInstall)})
        })
        res.status(200).send({success: true, avgInstall : cureentDayApps.dailyInstall, sumDownload : sumofDownload, installObject : maxInstallObject})
    } catch (err) {
        res.status(500).send({message: err.message || "data does not exist"});
    }
}
