const mongoose = require( "mongoose" );

const serverConfig = require(`./environments/${process.env.NODE_ENV || "production"}.js`);

module.exports = function( app ) {
    // mongoose.connect(serverConfig.mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true }).catch(error => console.log(error));
    // mongoose.connection.on('error', err=>{
    //     console.log('connection failed...');
    // });
        mongoose.connect( serverConfig.mongoUrl, { useUnifiedTopology: true, useNewUrlParser: true });
        mongoose.Promise = global.Promise;

        process.on( "SIGINT", cleanup );
        process.on( "SIGTERM", cleanup );
        process.on( "SIGHUP", cleanup );

    if ( app ) {
        app.set( "mongoose", mongoose );
    }
};

function cleanup( ) {
    mongoose.connection.close( function( ) {
        process.exit( 0 );
    } );
}
