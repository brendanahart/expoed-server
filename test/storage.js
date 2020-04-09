// Imports the Google Cloud client library.
const {Storage} = require('@google-cloud/storage');

// Instantiates a client. If you don't specify credentials when constructing
// the client, the client library will look for credentials in the
// environment.
const projectId = 'expoed';
const keyFilename = '../config/key.json';
const storage = new Storage({projectId, keyFilename});


const get_buckets = async function get_buckets() {
    try {
        // Makes an authenticated API request.
        const results = await storage.getBuckets();

        const [buckets] = results;

        console.log('Buckets:');
        buckets.forEach((bucket) => {
            console.log(bucket.name);
        });
    } catch (err) {
        console.error('ERROR:', err);
    }
};

get_buckets().then((res) => {
    console.log("success")
}).catch((error) => {
    console.log("error")
});
