import {RestaurantSearch} from "../models/restaurant-search";
import {ExpoedIdentity} from "../models/expoed-identity";
import {RestaurantInfo} from "../models/restaurant-info";

const express = require('express');
const router = express.Router();

const {Storage} = require('@google-cloud/storage');
const Multer = require('multer');
const {format} = require('util');


const database = require('../database');

const projectId = 'expoed';
const keyFilename = 'expoed-17cdf2617eac.json';
const storage = new Storage({projectId, keyFilename});

// Multer is required to process file uploads and make them available via
// req.files.
const multer = Multer({
    storage: Multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // no larger than 10mb, you can change as needed.
    },
});

const bucketName = process.env.GCLOUD_STORAGE_BUCKET || "expoed-data";

const bucket = storage.bucket(bucketName);

const searchLikeRestaurants = "SELECT * FROM restaurants WHERE name LIKE ? AND stripe IS NOT NULL ORDER BY RAND() LIMIT 100";
const searchRandomXRestaurants = "SELECT * FROM restaurants WHERE stripe IS NOT NULL ORDER BY RAND() LIMIT ?";

const updatePictureUrlE = "UPDATE eaters SET pictureUrl = ? WHERE authId = ?";
const updatePictureUrlR = "UPDATE restaurants SET pictureUrl = ? WHERE authId = ?";

const profileTypeE = 'eater';
const profileTypeR = 'restaurant';
const profileTypeO = 'offer';

/* Respond to search about restaurants */
const restaurantsReturn = 100;

router.post('/search', function(req, res) {
    const searchObject = new RestaurantSearch(req.body.searchTerm);

    const finalSearchTerm = "%" + searchObject.searchTerm + "%";

    const searchRestaurantQuery = database.format_query(searchLikeRestaurants, [finalSearchTerm]);
    console.log("Searching the database for restaurants according to: " + searchObject.searchTerm);

    const returnRestaurants = [];

    database.query_database(searchRestaurantQuery).then(rows => {
        const restaurantsFound = rows.length;
        for (let row of rows) {
            const currLikeExpoedIdentity = new ExpoedIdentity(row.authId, row.name, row.email);
            const currRestaurantInfo = new RestaurantInfo(currLikeExpoedIdentity, row.address, row.addressTwo,
                row.city, row.state, row.zipCode, row.description, row.website, row.twitter, row.instagram,
                row.facebook, row.verified, row.pictureUrl, row.id, null);
            returnRestaurants.push(currRestaurantInfo);
        }
        // null restaurant for separator
        returnRestaurants.push(new RestaurantInfo(
            new ExpoedIdentity(null, null, null), null, null, null, null, null, null, null, null, null, null,
            null, null, null));

        const randomRestaurantsNeeded = restaurantsReturn - restaurantsFound;

        const searchRandomXRestaurantsQuery = database.format_query(searchRandomXRestaurants, [randomRestaurantsNeeded]);

        // TODO: do not get restaurants already queried above
        database.query_database(searchRandomXRestaurantsQuery).then(rowsRandom => {
            for (let row of rowsRandom) {
                const randomLikeExpoedIdentity = new ExpoedIdentity(row.authId, row.name, row.email);
                const randomRestaurantInfo = new RestaurantInfo(randomLikeExpoedIdentity, row.address, row.addressTwo,
                    row.city, row.state, row.zipCode, row.description, row.website, row.twitter, row.instagram,
                    row.facebook, row.verified, row.pictureUrl, row.id, null);
                returnRestaurants.push(randomRestaurantInfo);
            }
            console.log("Found random restaurants");
            res.send(JSON.stringify(returnRestaurants));
        }).catch((error) => {
            console.log("Error searching random restaurants: " + error);
            res.status(500).json(JSON.stringify(returnRestaurants));
        });
    }).catch((error) => {
        console.log("Error searching like restaurants: " + error);
        res.status(500).json(JSON.stringify(returnRestaurants));
    });
});

// Process the file upload and upload to Google Cloud Storage.
router.post('/upload/photo', multer.single('image'), (req, res, next) => {
    if (!req.file) {
        res.status(400).send('No file uploaded.');
        return;
    }

    const identity = new ExpoedIdentity(req.body.id, null, req.body.email);

    // Create a new blob in the bucket and upload the file data.
    const blob = bucket.file(req.file.originalname);
    const fileExtensionArr = req.file.originalname.split(".");
    const extension = fileExtensionArr[1];

    let updatePictureUrl = "";

    if (req.body.type === profileTypeE) {
        blob.name = "eaters/" + identity.id + "/" + Date.now().toString() + "." + extension;
        updatePictureUrl = updatePictureUrlE
    } else if (req.body.type === profileTypeR) {
        blob.name = "restaurants/" + identity.id + "/" + Date.now().toString() + "." + extension;
        updatePictureUrl = updatePictureUrlR
    }

    const blobStream = blob.createWriteStream({
        resumable: false,
    });

    blobStream.on('error', (err) => {
        next(err);
    });

    blobStream.on('finish', () => {
        // The public URL can be used to directly access the file via HTTP.
        blob.name = blob.name.replace("|", "%7C");
        const publicUrl = format(
            `https://storage.cloud.google.com/${bucket.name}/${blob.name}`
        );

        const updatePictureUrlQuery = database.format_query(updatePictureUrl, [publicUrl, identity.id]);

        database.query_database(updatePictureUrlQuery).then((rows) => {
            console.log("updated url");
            const urlObj = {
                'src': publicUrl
            };
            res.status(200).send(JSON.stringify(urlObj));
        }).catch((error) => {
            console.log(error.toString());
            res.status(500).send({});
        });

    });

    blobStream.end(req.file.buffer);
});

module.exports = router;
