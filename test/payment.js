const expect = require('expect');

const stripe_key = process.env.STRIPE_KEY || "sk_test_Ck59VrJ9vrS9N8IPzTDIxuw300NNvb8Gow";
const stripe = require('stripe')(stripe_key);

const webhookSecret = 'whsec_e8E6jjZQF8sgE3RZOTRanhE1LeO79KYt';

const payload = {
    id: 'checkout.session.completed',
    object: {

    },
};

const payloadString = JSON.stringify(payload, null, 2);
const secret = 'whsec_test_secret';

const header = stripe.webhooks.generateTestHeaderString({
    payload: payloadString,
    secret,
});

const event = stripe.webhooks.constructEvent(payloadString, header, secret);


expect(event.id).toBe(payload.id);
