export class RestaurantOffering {
    constructor(restaurant, offeringName, offeringDesc, price) {
        this.restaurant = restaurant;
        this.offeringName = offeringName;
        this.offeringDesc = offeringDesc;
        this.price = price;
        this.restaurantOfferId = '';
        this.id = '';
    }
}

module.exports = RestaurantOffering;