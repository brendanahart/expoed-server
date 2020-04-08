export class OfferExpoed {
    constructor(id, restaurantName, restaurantEmail, offerName, offerPrice, txId, paid, redeemedRestaurant, redeemedUser) {
        this.id = id;
        this.restaurantName = restaurantName;
        this.restaurantEmail = restaurantEmail;
        this.offerName = offerName;
        this.offerPrice = offerPrice;
        this.txId = txId;
        this.paid = paid === 1;
        this.redeemedRestaurant = redeemedRestaurant === 1;
        this.redeemedUser = redeemedUser === 1;
    }
}

module.exports = OfferExpoed;