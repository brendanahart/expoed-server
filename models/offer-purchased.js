export class OfferPurchased {
    constructor(id, name, email, authId, offerName, price, offerDesc, txId, redeemedRestaurant, redeemedUser) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.authId = authId;
        this.price = price;
        this.offerName = offerName;
        this.offerDesc = offerDesc;
        this.txId = txId;
        this.redeemedRestaurant = redeemedRestaurant === 1;
        this.redeemedUser = redeemedUser === 1;
    }
}