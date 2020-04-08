import {PaymentInfo} from "../models/payment-info";

const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');

const stripe_key = process.env.STRIPE_KEY || "sk_test_Ck59VrJ9vrS9N8IPzTDIxuw300NNvb8Gow";
const stripe = require('stripe')(stripe_key);

const webhookSecret = process.env.STRIPE_CHECKOUT_SECRET || 'whsec_EJkBawIN8WyJlTy1IddllATDqo278UO7';

const database = require('../database');

const eaterIdSelect = 'SELECT id FROM eaters WHERE authId = ?';
const restaurantIdSelect = 'SELECT id FROM restaurants WHERE authId = ?';
const offerIdSelect = 'SELECT id FROM offers WHERE restaurantOfferId = ?';
const expoedInsertE = 'INSERT INTO expos (offerId, userId, confirmed, redeemed, redeemedConfirmed, transactionId) VALUES (?, ?, ?, ?, ?, ?)';
const expoedInsertR = 'INSERT INTO expos (offerId, restaurantId, confirmed, redeemed, redeemedConfirmed, transactionId) VALUES (?, ?, ?, ?, ?, ?)';


// TODO: function that generate application fee amount based on price

const insert_paid_offer = async function insert_paid_offer(selectQuery, insertQuery, session) {
    const userIdSelectQuery = database.format_query(selectQuery, [session.client_reference_id]);
    const restaurantOfferIdQuery = database.format_query(offerIdSelect, [session.metadata['offerId']]);

    return await database.query_database(userIdSelectQuery).then(async rows => {
        const user = database.get_first_row(rows);

        return await database.query_database(restaurantOfferIdQuery).then(async rowsRestaurant => {
            const offer = database.get_first_row(rowsRestaurant);

            const insertExpoQuery = database.format_query(insertQuery, [offer.id, user.id, 1, 0, 0, session.id]);
            return await database.query_database(insertExpoQuery).then(insertExpoeRows => {
                console.log("Inserted expo");
                return true;
            }).catch((error) => {
                console.log("Error inserting expo: " + error.toString());
                return false;
            });
        }).catch((error) => {
            console.log("Error selecting id: " + error.toString());
            return false;
        });
    }).catch((error) => {
        console.log("Error selecting user: " + error.toString());
        return false;
    });
};

const generate_payment_info = function generate_payment_info(paymentInfo) {
    const paymentMetadata = {};

    paymentMetadata['offerId'] = paymentInfo.offer.restaurantOfferId;

    if (paymentInfo.returnUrl.includes('eater')) {
        paymentMetadata['eater'] = true;
        paymentMetadata['restaurant'] = false;
    } else {
        paymentMetadata['eater'] = false;
        paymentMetadata['restaurant'] = true;
    }

    return {
        payment_method_types: ['card'],
        line_items: [{
            name: paymentInfo.offer.offeringName,
            amount: parseFloat(paymentInfo.offer.price) * 100,
            currency: 'usd',
            quantity: 1,
        }],
        payment_intent_data: {
            application_fee_amount: 1,
        },
        success_url: paymentInfo.returnUrl,
        cancel_url: paymentInfo.url,
        client_reference_id: paymentInfo.user.id,
        metadata: paymentMetadata
    };
};

const generate_stripe_info = function generate_stripe_info(paymentInfo) {
    return {
        stripeAccount: paymentInfo.stripe,
    };
};

const generate_checkout_session = async function generate_checkout_session(paymentInfo) {
    return await stripe.checkout.sessions.create(generate_payment_info(paymentInfo), generate_stripe_info(paymentInfo));
};

const handleCheckoutSession = async (connectedAccountId, session) => {
    // Fulfill the purchase.
    console.log('Connected account ID: ' + connectedAccountId);
    console.log('Session: ' + JSON.stringify(session));


    // if eater, query eater table for user id
    // if restaurant, query restaurant table for restaurant id
    // query offer table for offer id
    // insert into expos table

    if (session.metadata['eater'] === "true") {
        return await insert_paid_offer(eaterIdSelect, expoedInsertE, session).then(res => {
            return res
        });
    } else {
        return await insert_paid_offer(restaurantIdSelect, expoedInsertR, session).then(res => {
            return res
        });
    }



};

router.post('/checkout/init', function (req, res) {
    console.log(req.body);
    // create payment object
    const paymentInfo = new PaymentInfo(req.body.offer, req.body.restaurant, req.body.stripe, req.body.url, req.body.returnUrl, req.body.user);
    generate_checkout_session(paymentInfo).then((stripeInfo) => {
        res.send(stripeInfo);
    }).catch((error) => {
        console.log("Error: " + error.toString());
        res.status(500).json(req.body);
    });
});

router.post('/checkout/complete', bodyParser.raw({type: 'application/json'}), (request, response) => {
    let event;

    // Verify webhook signature and extract the event.
    // See https://stripe.com/docs/webhooks/signatures for more information.
    try {
        event = stripe.webhooks.constructEvent(request.body, request.headers['stripe-signature'], webhookSecret);
    } catch (err) {
        console.log(err.toString());
        return response.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const connectedAccountId = event.account;
        handleCheckoutSession(connectedAccountId, session).then((insertRes) => {
            if (insertRes) {
                console.log("Handled checkout session correctly");
                response.json({received: true});
            } else {
                console.log("Could not checkout session correctly, contact merchant");
                return response.status(400).send('Webhook Error, could not insert session correctly');
            }
        }).catch((error) => {
            console.log("Could not checkout session correctly, contact merchant");
            return response.status(400).send('Webhook Error, could not insert session correctly');
        })
    } else {
        response.json({received: true});
    }

});

module.exports = router;