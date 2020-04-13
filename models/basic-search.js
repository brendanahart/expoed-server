export class BasicSearchObject {
    constructor(authId, name, email, address, city) {
        this.authId = authId;
        this.name = name;
        this.email = email;
        this.address = address;
        this.city = city;
    }
}

module.exports = BasicSearchObject;