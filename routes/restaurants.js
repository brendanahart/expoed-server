import {ExpoedIdentity} from "../models/expoed-identity";
import {RestaurantInfo} from "../models/restaurant-info";
import {RestaurantOffering} from "../models/restaurant-offering";
import {OfferExpoed} from "../models/offer-expoed";
import {OfferPurchased} from "../models/offer-purchased";

const express = require('express');
const router = express.Router();

const stripe_key = process.env.STRIPE_KEY || "sk_test_Ck59VrJ9vrS9N8IPzTDIxuw300NNvb8Gow";
const stripe = require('stripe')(stripe_key);

const database = require('../database');


/* Add restaurant based on login/sign up */
const selectRestaurant = "SELECT id, authId, email, name FROM restaurants WHERE authId = ?";
const updateRestaurant = "UPDATE restaurants SET email = ?, name = ? WHERE authId = ?";
const insertRestaurant = "INSERT INTO restaurants (authId, email, name) VALUES (?, ?, ?)";

const updateRestaurantInfo = "UPDATE restaurants SET address = ?, addressTwo = ?, city = ?, state = ?, zipCode = ?, facebook = ?, instagram = ?, twitter = ?, website = ?, description = ? WHERE authId = ?";
const selectRestaurantInfo = "SELECT id, authId, email, name, address, addressTwo, city, state, zipCode, facebook, instagram, twitter, website, description, verified, pictureUrl, stripe FROM restaurants WHERE authId = ?";

const insertRestaurantOffer = "INSERT INTO offers (restaurantId, restaurantOfferId, offerName, offerDesc, price) VALUES (?, ?, ?, ?, ?)";
const deleteRestaurantOffer = "DELETE FROM offers WHERE restaurantOfferId = ?";
const getRestaurantOffers = "SELECT * FROM offers WHERE restaurantId = ?";

const updateRestaurantStripe = "UPDATE restaurants SET stripe = ? WHERE authId = ?";

const selectExpoInfo = "SELECT e.id, r.name, r.email, o.offerName, o.price, e.transactionId, e.confirmed, e.redeemed, " +
    "e.redeemedConfirmed FROM restaurants AS r INNER JOIN offers AS o ON r.id = o.restaurantId INNER JOIN expos AS e " +
    "ON o.id = e.offerId INNER JOIN restaurants AS res ON res.id = e.restaurantId WHERE res.authId = ?";

const selectExposPurchasedU = "SELECT e.id, eat.name, eat.email, eat.authId, o.offerName, o.price, o.offerDesc, " +
    "e.transactionId, e.redeemed, e.redeemedConfirmed FROM eaters AS eat INNER JOIN expos AS e ON e.userId = eat.id " +
    "INNER JOIN offers AS o ON e.offerId = o.id INNER JOIN restaurants AS r ON r.id = o.restaurantId WHERE r.authId = ?";

const selectExposPurchasedR = "SELECT e.id, res.name, res.email, res.authId, o.offerName, o.price, o.offerDesc, " +
    "e.transactionId, e.redeemed, e.redeemedConfirmed FROM restaurants AS res " +
    "INNER JOIN expos AS e ON e.restaurantId = res.id INNER JOIN offers AS o ON e.offerId = o.id " +
    "INNER JOIN restaurants AS r ON r.id = o.restaurantId WHERE r.authId = ?";

const domain = process.env.DOMAIN || "http://localhost:4200";

async function get_restaurant_info_helper(req) {
    console.log(req.body);
    const selectRestaurantQuery = database.format_query(selectRestaurantInfo, [req.body.id]);

    console.log("Getting restaurant info from the database");
    return await database.query_database(selectRestaurantQuery).then(rows => {
        const resRestaurantInfo = database.get_first_row(rows);
        return new RestaurantInfo(new ExpoedIdentity(resRestaurantInfo.authId, resRestaurantInfo.name, resRestaurantInfo.email),
            resRestaurantInfo.address, resRestaurantInfo.addressTwo, resRestaurantInfo.city,
            resRestaurantInfo.state, resRestaurantInfo.zipCode, resRestaurantInfo.description,
            resRestaurantInfo.website, resRestaurantInfo.instagram, resRestaurantInfo.twitter,
            resRestaurantInfo.facebook, resRestaurantInfo.verified, resRestaurantInfo.pictureUrl, resRestaurantInfo.id, resRestaurantInfo.stripe);
    }).catch((error) => {
        console.log("Error getting restaurant info: " + error);
        return null;
    });
};

async function get_restaurant_offering_helper(info, hide) {
    const getRestaurantOfferQueries = database.format_query(getRestaurantOffers,
        [info.restaurantInfoSystemId]);

    if (hide) {
        info.restaurant.id = null;
    }

    console.log("getting restaurant offers from the database");
    return await database.query_database(getRestaurantOfferQueries).then(rows => {
        console.log("Got offers from the database: " + rows);
        const restaurantOfferArray = [];

        for (let offer of rows) {
            const currRestaurantOffering = new RestaurantOffering(info.restaurant, offer.offerName, offer.offerDesc, offer.price);
            currRestaurantOffering.restaurantOfferId = offer.restaurantOfferId;
            currRestaurantOffering.id = offer.id;
            restaurantOfferArray.push(currRestaurantOffering)
        }

        return restaurantOfferArray;
    }).catch((error) => {
        console.log("Error getting restaurant offers: " + error);
        return null;
    });
}

router.post('/addRestaurant', function(req, res) {
    console.log(req.body);
    const currIdentity = new ExpoedIdentity(req.body.id, req.body.name, req.body.email);

    const selectRestaurantQuery = database.format_query(selectRestaurant, [currIdentity.id]);
    const updateRestaurantQuery = database.format_query(updateRestaurant, [currIdentity.email, currIdentity.name, currIdentity.id]);
    const insertRestaurantQuery = database.format_query(insertRestaurant, [currIdentity.id, currIdentity.email, currIdentity.name]);


    console.log("Adding/updating restaurant to the database");
    database.query_database(selectRestaurantQuery).then(rows => {
        if (database.check_empty_rows(rows)) {
            database.query_database(insertRestaurantQuery).then(value => {
                console.log("Inserted restaurant: " + value);
                res.send(req.body);
            });
        } else {
            database.query_database(updateRestaurantQuery).then(value => {
                console.log("Updated: restaurant: " + value);
                res.send(req.body);
            });
        }
    }).catch((error) => {
        console.log("Error inserting/updating: " + error);
        res.status(500).json(req.body);
    });
});

router.post('/updateRestaurantInfo', function(req, res) {
    console.log(req.body);
    const currIdentity = new ExpoedIdentity(req.body.restaurant.id, req.body.restaurant.name, req.body.restaurant.email);

    const instanceRestaurantInfo = new RestaurantInfo(currIdentity, req.body.address, req.body.addressTwo, req.body.city,
        req.body.state, req.body.zipCode, req.body.description, req.body.website, req.body.instagram, req.body.twitter,
        req.body.facebook, req.body.verified, req.body.pictureUrl, null, null);

    const updateRestaurantInfoQuery = database.format_query(updateRestaurantInfo, [instanceRestaurantInfo.address,
        instanceRestaurantInfo.addressTwo, instanceRestaurantInfo.city, instanceRestaurantInfo.state,
        instanceRestaurantInfo.zipCode, instanceRestaurantInfo.facebook, instanceRestaurantInfo.instagram,
        instanceRestaurantInfo.twitter, instanceRestaurantInfo.website, instanceRestaurantInfo.description,
        instanceRestaurantInfo.restaurant.id]);

    console.log("updating restaurant info into the database");
    database.query_database(updateRestaurantInfoQuery).then(rows => {
        console.log("Updated restaurant: " + rows);
        res.send(JSON.stringify(instanceRestaurantInfo));
    }).catch((error) => {
        console.log("Error updating restaurant info: " + error);
        res.status(500).json(req.body);
    });
});

router.post('/getRestaurantInfo', function(req, res) {
    get_restaurant_info_helper(req).then(resRestaurantInfo => {
        if (resRestaurantInfo == null) {
            res.status(500).json(req.body);
        } else {
            res.send(JSON.stringify(resRestaurantInfo));
        }
    });
});

router.post('/getRestaurantInfoUser', function(req, res) {
    get_restaurant_info_helper(req).then(resRestaurantInfo => {
        if (resRestaurantInfo == null) {
            res.status(500).json(req.body);
        } else {
            resRestaurantInfo.restaurant.id = null;
            res.send(JSON.stringify(resRestaurantInfo));
        }
    });
});

router.post('/addOffering', function(req, res) {
    console.log(req.body);
    const currIdentity = new ExpoedIdentity(req.body.restaurant.id, req.body.restaurant.name, req.body.restaurant.email);

    if (isNaN(req.body.price)) {
        res.status(500).json(req.body);
    }

    const currRestaurantOffering = new RestaurantOffering(currIdentity, req.body.offeringName, req.body.offeringDesc, req.body.price);
    const u = Date.now().toString(16)+Math.random().toString(16)+'0'.repeat(16);
    const guid = [u.substr(0,8), u.substr(8,4), '4000-8' + u.substr(13,3), u.substr(16,12)].join('-');

    currRestaurantOffering.restaurantOfferId = guid;

    const selectRestaurantQuery = database.format_query(selectRestaurant, [currIdentity.id]);

    console.log("Getting restaurant id from the database");
    database.query_database(selectRestaurantQuery).then(rows => {
        const resRestaurantInfo = database.get_first_row(rows);
        const restaurantId = resRestaurantInfo.id;

        const insertRestuarantOfferingQuery = database.format_query(insertRestaurantOffer, [restaurantId,
            currRestaurantOffering.restaurantOfferId, currRestaurantOffering.offeringName, currRestaurantOffering.offeringDesc,
        currRestaurantOffering.price]);

        console.log("Inserting restaurant offer into the database");
        database.query_database(insertRestuarantOfferingQuery).then(offerRows => {
            console.log("Inserted restaurant offfer: " + offerRows);
            res.send(JSON.stringify(currRestaurantOffering));
        }).catch((error) => {
            console.log("Error getting restaurant info: " + error);
            res.status(500).json(req.body);
        });
    }).catch((error) => {
        console.log("Error getting restaurant info: " + error);
        res.status(500).json(req.body);
    });
});

router.post('/deleteOffering', function(req, res) {
    console.log(req.body);
    const currIdentity = new ExpoedIdentity(req.body.restaurant.id, req.body.restaurant.name, req.body.restaurant.email);

    const currRestaurantOffering = new RestaurantOffering(currIdentity, req.body.offeringName, req.body.offeringDesc, req.body.price);
    currRestaurantOffering.restaurantOfferId = req.body.restaurantOfferId;
    currRestaurantOffering.id = req.body.id;

    const deleteRestaurantOfferQuery = database.format_query(deleteRestaurantOffer, [currRestaurantOffering.restaurantOfferId]);

    console.log("deleting restaurant offer from the database");
    database.query_database(deleteRestaurantOfferQuery).then(rows => {
        console.log("Deleted offer from the database: " + rows);
        res.send(JSON.stringify(currRestaurantOffering));
    }).catch((error) => {
        console.log("Error deleting restaurant offer: " + error);
        res.status(500).json(req.body);
    });
});

router.post('/getOfferings', function (req, res) {
    console.log(req.body);
    get_restaurant_info_helper(req).then((info) => {
        if (info == null) {
            res.status(500).json(req.body);
        } else {
            get_restaurant_offering_helper(info, false).then((restaurantOfferings => {
                if (info == null) {
                    res.status(500).json(req.body);
                } else {
                    res.send(JSON.stringify(restaurantOfferings));
                }
            }))
        }
    });
});

router.post('/getOfferingsUser', function (req, res) {
    console.log(req.body);
    get_restaurant_info_helper(req).then((info) => {
        if (info == null) {
            res.status(500).json(req.body);
        } else {
            get_restaurant_offering_helper(info, true).then((restaurantOfferings => {
                if (info == null) {
                    res.status(500).json(req.body);
                } else {
                    res.send(JSON.stringify(restaurantOfferings));
                }
            }))
        }
    });
});


const saveAccountId = async (id, state) => {
    // Save the connected account ID from the response to your database.
    console.log('Connected account ID: ' + id);

    const updateRestaurantStripeQuery = database.format_query(updateRestaurantStripe, [id.toString(), state]);

    console.log("Updating restaurant to the database");
    return await database.query_database(updateRestaurantStripeQuery).then(rows => {
        return true;
    }).catch((error) => {
        console.log("Error inserting/updating: " + error);
        return null;
    });
};

router.get("/stripe/connect/oauth", async (req, res) => {
    const { code, state } = req.query;

    var error;

    // Send the authorization code to Stripe's API.
    stripe.oauth.token({
        grant_type: 'authorization_code',
        code
    }).then(
        (response) => {
            var connected_account_id = response.stripe_user_id;
            saveAccountId(connected_account_id, state).then(saveAccountRes => {
                if (saveAccountRes != null) {
                    // Render some HTML or redirect to a different page.
                    return res.redirect(200, domain + "/restaurant")
                } else {
                    return res.redirect(200, domain + "/restaurant")
                }
            }).catch((error) => {
                return res.status(200).json({success: false})
            });
        },
        (err) => {
            if (err.type === 'StripeInvalidGrantError') {
                return res.redirect(400, domain + "/restaurant")
            } else {
                return res.redirect(500, domain + "/restaurant")
            }
        }
    );
});

router.post('/getRestaurantExpos', function (req, res) {
    console.log(req.body);
    const currIdentity = new ExpoedIdentity(req.body.id, req.body.name, req.body.email);
    const selectEaterOfferQuery = database.format_query(selectExpoInfo, [currIdentity.id]);

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

router.post('/getOffersPurchased', function (req, res) {
    console.log(req.body);
    const currIdentity = new ExpoedIdentity(req.body.id, req.body.name, req.body.email);
    const selectExposPurchasedUQuery = database.format_query(selectExposPurchasedU, [currIdentity.id]);
    const selectExposPurchasedRQuery = database.format_query(selectExposPurchasedR, [currIdentity.id]);

    database.query_database(selectExposPurchasedUQuery).then( rowsU => {
        const exposPurchased = [];
        for (const row of rowsU) {
            exposPurchased.push(new OfferPurchased(row.id, row.name, row.email, row.authId, row.offerName, row.price, row.offerDesc, row.transactionId, row.redeemed, row.redeemedConfirmed))
        }
        database.query_database(selectExposPurchasedRQuery).then( rowsR => {
            for (const row of rowsR) {
                exposPurchased.push(new OfferPurchased(row.id, row.name, row.email, row.authId, row.offerName, row.price, row.offerDesc, row.transactionId, row.redeemed, row.redeemedConfirmed))
            }
            res.send(JSON.stringify(exposPurchased));
        }).catch((error) => {
            console.log("Error getting expos purchased: " + error.toString());
            res.status(500).json(JSON.stringify(exposPurchased));
        });
    }).catch((error) => {
        console.log("Error getting expos purchased: " + error.toString());
        res.status(500).json(JSON.stringify([]));
    });
});

router.post('/getHelpers', function (req, res) {
    console.log(req.body);
    const currIdentity = new ExpoedIdentity(req.body.id, req.body.name, req.body.email);
    const selectExposPurchasedUQuery = database.format_query(selectExposPurchasedU, [currIdentity.id]);
    const selectExposPurchasedRQuery = database.format_query(selectExposPurchasedR, [currIdentity.id]);

    database.query_database(selectExposPurchasedUQuery).then( rowsU => {
        const exposPurchased = [];
        for (const row of rowsU) {
            const helperObject = {
                helper: row.name,
                offerName: row.offerName
            };
            exposPurchased.push(helperObject);
        }
        database.query_database(selectExposPurchasedRQuery).then( rowsR => {
            for (const row of rowsR) {
                const helperObject = {
                    helper: row.name,
                    offerName: row.offerName
                };
                exposPurchased.push(helperObject);
            }
            res.send(JSON.stringify(exposPurchased));
        }).catch((error) => {
            console.log("Error getting expos purchased: " + error.toString());
            res.status(500).json(JSON.stringify(exposPurchased));
        });
    }).catch((error) => {
        console.log("Error getting expos purchased: " + error.toString());
        res.status(500).json(JSON.stringify([]));
    });
});


module.exports = router;