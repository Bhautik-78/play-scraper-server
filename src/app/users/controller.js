const  _  = require("lodash");
const axios = require("axios");
const moment = require("moment");
const mongoose = require("mongoose");
const Users = mongoose.model("users");
require('dotenv').config()

const myLoggers = require('log4js');

myLoggers.configure({
    appenders: { mylogger: { type:"file", filename: "mylogger.log" } },
    categories: { default: { appenders:["mylogger"], level:"ALL" } }
});

const logger = myLoggers.getLogger("default");

const getDate = date => moment(date).format("YYYY-MM-DD")
const todayDate = new Date()

exports.getList = async (req, res) => {
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
                        res.status(200).send({success: true, message: "Successfully created"})
                    } else {
                        logger.info('something went wrong.');
                        res.status(200).send({success: false})
                    }
                })
            } else {
                logger.info('No Data Found');
                res.status(200).send({success: true, message: "No Data Found"})
            }
        }else {
            // const update = await Users.remove({CreatedDate : getDate(todayDate)})
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
        res.status(500).send({message: err.message || "Some error occurred while retrieving login."});
    }
};

exports.getApplication = async (req, res) => {
    try {
        const {appId} = req.body
        let query = {}
        if (req.body) {
            query = {
                appId : appId
            }
        }
        const applicationDate = await Users.find(query)
        res.status(200).send(applicationDate)
    }catch (err) {
        res.status(500).send({message: err.message || "data does not exist"});
    }
};

exports.avgDailyInstall = async (req, res) => {
    try {
        const { appId } = req.body
        const cureentDayApps = await Users.findOne({appId : appId, CreatedDate : getDate(todayDate)})
        // const yesterday = moment(new Date(new Date().setDate(new Date().getDate() - 1))).format("YYYY-MM-DD")
        // const yesterDayData = await Users.findOne({appId : appId, CreatedDate : yesterday})
        // const dailyInstall = (cureentDayApps.maxInstalls) - ((yesterDayData && yesterDayData.maxInstalls) || 0)
        const allData = await Users.find({appId : appId})
        const sumofDownload = _.sumBy(allData, (key) => key.dailyInstall || 0)
        const maxInstallObject = []
        allData.forEach(item => {
            // console.log(moment(item.CreatedDate).format("DD-MM"))
            maxInstallObject.push({x: parseInt(moment(item.CreatedDate).format("DD-MM")) , y : parseInt(item.dailyInstall)})
        })
        console.log("maxInstallObject",maxInstallObject)
        res.status(200).send({success: true, avgInstall : cureentDayApps.dailyInstall, sumDownload : sumofDownload, installObject : maxInstallObject})
    } catch (err) {
        res.status(500).send({message: err.message || "data does not exist"});
    }
}
