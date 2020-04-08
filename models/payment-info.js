export class PaymentInfo {
    constructor(offer, restaurant, stripe, url, returnUrl, user) {
        this.offer = offer;
        this.restaurant = restaurant;
        this.stripe = stripe;
        this.url = url;
        this.returnUrl = returnUrl;
        this.user = user;
    }
}