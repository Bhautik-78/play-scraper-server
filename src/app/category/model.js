const mongoose = require( "mongoose" );

const Schema = mongoose.Schema;

const categorySchema = new Schema({
    title :String,
    description :String,
    descriptionHTML :String,
    appId :String,
    url :String,
    developer : {
        devId : String,
        url : String
    },
    adSupported: Boolean,
    installs : String,
    minInstalls: Number,
    maxInstalls:Number,
    ratings : Number,
    currency : String,
    developerId :String,
    developerEmail: String,
    developerInternalID: String,
    genre: String,
    genreId: String,
    icon : String,
    screenshots : [],
    priceText :String,
    offersIAP: Boolean,
    size: String,
    androidVersion: String,
    price :Number,
    free : Boolean,
    summary :String,
    scoreText :String,
    score :Number,
    playstoreUrl :String,
    permissions :String,
    similar :String,
    reviews :String,
    released : String,
    updated: Number,
    version: String,
    appCategory : String,
    appCollection : String,
    CreatedDate : String,
    Country : String,
    dailyInstall : Number
});

module.exports = mongoose.model( "countrycategories", categorySchema );
