export class EaterInfo {
    constructor(user, city, favoriteFoods, pictureUrl) {
        this.user = user;
        this.city = city === null ? "" : city;
        this.favoriteFoods = favoriteFoods === null ? "" : favoriteFoods;
        this.pictureUrl = pictureUrl === null ? "" : pictureUrl;
    }
}

module.exports = EaterInfo;