const mongoose = require( "mongoose" );
const md5 = require( "md5" );

const Schema = mongoose.Schema;

const userSchema = new Schema({
    title : String,
    description : String,
    descriptionHTML : String,
    summary : String,
    installs : String,
    minInstalls : String,
    maxInstalls : String,
    score : String,
    scoreText : String,
    ratings : String,
    reviews : String,
    histogram : {
        1 : Number,
        2 : Number,
        3 : Number,
        4 : Number,
        5 : Number,
    },
    price : Number,
    free : Boolean,
    currency : String,
    priceText : String,
    offersIAP : Boolean,
    IAPRange : String,
    size : String,
    androidVersion : String,
    androidVersionText : String,
    developer : {
        devId : String,
        url : String
    },
    developerId : String,
    developerEmail : String,
    developerWebsite : String,
    developerAddress : String,
    privacyPolicy : String,
    developerInternalID : String,
    genre : String,
    genreId : String,
    icon : String,
    headerImage : String,
    screenshots : [

    ],
    contentRating : String,
    adSupported : Boolean,
    released : String,
    updated : Number,
    version : String,
    recentChanges : String,
    comments : [

    ],
    editorsChoice : Boolean,
    appId : String,
    url : String,
    playstoreUrl : String,
    permissions : String,
    similar : String,
    CreatedDate : String,
    dailyInstall :Number
});

userSchema.methods.setPass = function( password ) {
    this.password = md5( password );
};

userSchema.methods.checkPass = function( password ) {
    return this.password === md5( password );
};

module.exports = mongoose.model( "users", userSchema );
