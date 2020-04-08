export class RestaurantInfo {
    constructor(restaurant, address, addressTwo, city, state, zipCode, description, website, instagram, twitter, facebook, verified, pictureUrl, systemId, stripe) {
        this.restaurant = restaurant;
        this.address = address === null ? "" : address;
        this.addressTwo = addressTwo === null ? "" : addressTwo;
        this.city = city === null ? "" : city;
        this.state = state === null ? "" : state;
        this.zipCode = (zipCode === null || zipCode === "") ? 99999 : zipCode;
        this.description = description === null ? "" : description;
        this.website = website === null ? "" : website;
        this.instagram = instagram === null ? "" : instagram;
        this.twitter = twitter === null ? "" : twitter;
        this.facebook = facebook === null ? "" : facebook;
        this.verified = verified === null ? false : verified;
        this.pictureUrl = pictureUrl === null ? "" : pictureUrl;
        this.restaurantInfoSystemId = systemId;
        this.stripe = stripe === null ? "" : stripe;

        this.verified = this.verified === 1;
    }
}

module.exports = RestaurantInfo;