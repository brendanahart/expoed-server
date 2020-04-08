import {ExpoedIdentity} from "../models/expoed-identity";
import {EaterInfo} from "../models/eater-info";
import {OfferExpoed} from "../models/offer-expoed";

const express = require('express');
const router = express.Router();

const database = require('../database');


/* Add eater based on login/sign up */
const selectEater = "SELECT id, authId, email, name FROM eaters WHERE authId = ?";
const updateEater = "UPDATE eaters SET email = ?, name = ? WHERE authId = ?";
const insertEater = "INSERT INTO eaters (authId, email, name) VALUES (?, ?, ?)";

const selectEaterInfo = "SELECT id, authId, email, name, city, favoriteFoods, pictureUrl FROM eaters WHERE authId = ?";
const updateEaterInfo = "UPDATE eaters SET city = ?, favoriteFoods = ? WHERE authId = ?";

const selectOfferInfo = "SELECT e.id, r.name, r.email, o.offerName, o.price, e.transactionId, e.confirmed, e.redeemed, " +
    "e.redeemedConfirmed FROM restaurants AS r INNER JOIN offers AS o ON r.id = o.restaurantId INNER JOIN expos AS e " +
    "ON o.id = e.offerId INNER JOIN eaters AS eat ON eat.id = e.userId WHERE eat.authId = ?";

const updateOfferConfirmedTrue = "UPDATE expos SET redeemedConfirmed = 1 WHERE id = ?";
const updateOfferConfirmedFalse = "UPDATE expos SET redeemedConfirmed = 0 WHERE id = ?";

const updateOfferConfirmedRTrue = "UPDATE expos SET redeemed = 1 WHERE id = ?";
const updateOfferConfirmedRFalse = "UPDATE expos SET redeemed = 0 WHERE id = ?";

async function get_eater_info_helper(req) {
    console.log(req.body);
    const currIdentity = new ExpoedIdentity(req.body.id, req.body.name, req.body.email);

    const selectEaterInfoQuery = database.format_query(selectEaterInfo, [currIdentity.id]);

    console.log("Getting restaurant info from the database");
    return await database.query_database(selectEaterInfoQuery).then(rows => {
        const eaterInfo = database.get_first_row(rows);
        return new EaterInfo(currIdentity, eaterInfo.city, eaterInfo.favoriteFoods, eaterInfo.pictureUrl);
    }).catch((error) => {
        console.log("Error getting restaurant info: " + error);
        return null;
    });
}

router.post('/addEater', function(req, res) {
    console.log(req.body);
    var currIdentity = new ExpoedIdentity(req.body.id, req.body.name, req.body.email);

    let selectEaterQuery = database.format_query(selectEater, [currIdentity.id]);
    let updateEaterQuery = database.format_query(updateEater, [currIdentity.email, currIdentity.name, currIdentity.id]);
    let insertEaterQuery = database.format_query(insertEater, [currIdentity.id, currIdentity.email, currIdentity.name]);

    console.log("Adding/updating eater to the database");
    database.query_database(selectEaterQuery).then(rows => {
        if (database.check_empty_rows(rows)) {
            database.query_database(insertEaterQuery).then(value => {
                console.log("Inserted eater: " + value);
                res.send(req.body);
            });
        } else {
            database.query_database(updateEaterQuery).then(value => {
                console.log("Updated: eater: " + value);
                res.send(req.body);
            });
        }
    }).catch((error) => {
        console.log("Error inserting/updating: " + error);
        res.status(500).json(req.body);
    });
});

router.post('/updateEaterInfo', function(req, res) {
    console.log(req.body);
    const currIdentity = new ExpoedIdentity(req.body.user.id, req.body.user.name, req.body.user.email);

    const instanceRestaurantInfo = new EaterInfo(currIdentity, req.body.city, req.body.favoriteFoods, req.body.pictureUrl);

    const updateRestaurantInfoQuery = database.format_query(updateEaterInfo, [instanceRestaurantInfo.city,
        instanceRestaurantInfo.favoriteFoods, currIdentity.id]);

    console.log("updating restaurant info into the database");
    database.query_database(updateRestaurantInfoQuery).then(rows => {
        console.log("Updated restaurant: " + rows);
        res.send(JSON.stringify(instanceRestaurantInfo));
    }).catch((error) => {
        console.log("Error updating restaurant info: " + error);
        res.status(500).json(req.body);
    });
});

router.post('/getEaterInfo', function(req, res) {
    get_eater_info_helper(req).then(resEaterInfo => {
        if (resEaterInfo == null) {
            res.status(500).json(req.body);
        } else {
            res.send(JSON.stringify(resEaterInfo));
        }
    });
});

router.post('/getEaterOffers', function (req, res) {
    console.log(req.body);
    const currIdentity = new ExpoedIdentity(req.body.id, req.body.name, req.body.email);
    const selectEaterOfferQuery = database.format_query(selectOfferInfo, [currIdentity.id]);

    database.query_database(selectEaterOfferQuery).then( rows => {
        const eaterOffersExpoed = [];
        for (const row of rows) {
            eaterOffersExpoed.push(new OfferExpoed(row.id, row.name, row.email, row.offerName, row.price, row.transactionId, row.confirmed, row.redeemed, row.redeemedConfirmed))
        }
        res.send(JSON.stringify(eaterOffersExpoed));
    }).catch((error) => {
        console.log("Error getting eater offers purchased: " + error.toString());
        res.status(500).json(JSON.stringify([]));
    });
});

router.post('/updateRedeemedConfirmedFalse', function (req, res) {
    console.log(req.body);

    const updateOfferConfirmedFalseQuery = database.format_query(updateOfferConfirmedFalse, [req.body.id]);

    database.query_database(updateOfferConfirmedFalseQuery).then(rows => {
        console.log("updated redeemed confirmed for id: " + req.body.id);
        res.status(200).json({})
    }).catch((error) => {
        console.log("error updated redeemed confirmed for id: " + req.body.id);
        res.status(500).json({})
    });
});

router.post('/updateRedeemedConfirmedTrue', function (req, res) {
    console.log(req.body);

    const updateOfferConfirmedTrueQuery = database.format_query(updateOfferConfirmedTrue, [req.body.id]);

    database.query_database(updateOfferConfirmedTrueQuery).then( rows => {
        console.log("updated redeemed confirmed for id: " + req.body.id);
        res.status(200).json({})
    }).catch((error) => {
        console.log("error updated redeemed confirmed for id: " + req.body.id);
        res.status(500).json({})
    });
});

router.post('/updateRedeemedConfirmedRFalse', function (req, res) {
    console.log(req.body);

    const updateOfferConfirmedRFalseQuery = database.format_query(updateOfferConfirmedRFalse, [req.body.id]);

    database.query_database(updateOfferConfirmedRFalseQuery).then(rows => {
        console.log("updated redeemed confirmed for id: " + req.body.id);
        res.status(200).json({})
    }).catch((error) => {
        console.log("error updated redeemed confirmed for id: " + req.body.id);
        res.status(500).json({})
    });
});

router.post('/updateRedeemedConfirmedRTrue', function (req, res) {
    console.log(req.body);

    const updateOfferConfirmedTrueRQuery = database.format_query(updateOfferConfirmedRTrue, [req.body.id]);

    database.query_database(updateOfferConfirmedTrueRQuery).then( rows => {
        console.log("updated redeemed confirmed for id: " + req.body.id);
        res.status(200).json({})
    }).catch((error) => {
        console.log("error updated redeemed confirmed for id: " + req.body.id);
        res.status(500).json({})
    });
});


const upload_file = async function upload_file(bucketName, destination, filename) {
    // Uploads a local file to the bucket
    await storage.bucket(bucketName).upload(filename, {
        // Support for HTTP requests made with `Accept-Encoding: gzip`
        gzip: true,
        // By setting the option `destination`, you can change the name of the
        // object you are uploading to a bucket.
        destination: destination,
        metadata: {
            // Enable long-lived HTTP caching headers
            // Use only if the contents of the file will never change
            // (If the contents will change, use cacheControl: 'no-cache')
            cacheControl: 'public, max-age=31536000',
        },
    });

    console.log(`${filename} uploaded to ${bucketName}.`);
};

module.exports = router;