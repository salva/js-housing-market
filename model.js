class Renter {
    constructor(id, tick, incomeFactor, age) {
        this.id = id;
        this.createdTick = tick;
        this.changedTick = tick;
        this.incomeFactor = incomeFactor;
        this.age = age;
        this.house = null;
    }
}

class House {
    constructor(id, tick, rentPrice) {
        this.id = id;
        this.createdTick = tick;
        this.changedTick = tick;
        this.rentalEnd = 0;
        this.renter = null;
        this.setRentPrice(rentPrice);
    }

    setRentPrice(newPrice) {
        this.rentPrice = Math.max(newPrice, 1);
    }
}

class HousingMarket {

    constructor(nRenters = default_n_renters, nHouses = default_n_houses, rentAffordability = default_rent_price,
                costOfLiving = default_cost_of_living, markup = default_markup, priceDrop = default_price_drop,
                housesConsideredPerStep = default_houses_considered_per_step, rentalDurationMin = default_rental_duration_min,
                rentalDurationMax = default_rental_duration_max, meanIncome = mean_income) {
        this.tick = 0;
        this.renters = {};
        this.houses = {};
        this.rentersLooking = new Set();
        this.rentersRenting = new Set();
        this.housesAvailable = new Set();
        this.housesRented = new Set();
        this.lastId = 0;

        this.rentAffordability = rentAffordability;
        this.costOfLiving = costOfLiving;
        this.markup = markup;
        this.priceDrop = priceDrop;
        this.housesConsideredPerStep = housesConsideredPerStep;
        this.rentalDurationMin = rentalDurationMin;
        this.rentalDurationMax = rentalDurationMax;
        this.meanIncome = meanIncome;

        this.adjustPopulation(nRenters);
        this.adjustHousing(nHouses);

        this.housesRentedInTick = [];
    }

    addRenter(age, incomeFactor) {
        this.lastId += 1;
        const renter = new Renter(this.lastId, this.tick, incomeFactor, age);
        this.renters[this.lastId] = renter;
        this.rentersLooking.add(this.lastId);
        return this.lastId;
    }

    addHouse(rentPrice) {
        this.lastId += 1;
        const house = new House(this.lastId, this.tick, rentPrice);
        this.houses[this.lastId] = house;
        this.housesAvailable.add(this.lastId);
        return this.lastId;
    }

    makeRentingContract(renter, house, ttl) {
        if (house.renter) {
            throw new Error("House is already rented");
        }

        if (renter.house) {
            throw new Error("Renter is already renting a house");
        }

        house.renter = renter;
        renter.house = house;
        renter.changedTick = house.changedTick = this.tick;
        house.rentalEnd = this.tick + ttl;

        this.rentersRenting.add(renter.id);
        this.rentersLooking.delete(renter.id);
        this.housesAvailable.delete(house.id);
        this.housesRented.add(house.id);
    }

    endRentingWithHouseId(houseId, newRent = null) {
        const house = this.houses[houseId];
        if (house.renter) {
            this.renterUnrent(house.renter);
            this.rentersRenting.delete(house.renter.id);
            this.rentersLooking.add(house.renter.id);
            this.houseUnrent(house);
            this.housesRented.delete(houseId);
            this.housesAvailable.add(houseId);
            if (newRent !== null) {
                house.setRentPrice(newRent);
            }
            return true;
        }
        return false;
    }

    renterUnrent(renter) {
        if (!renter.house) {
            throw new Error("Renter is not renting a house");
        }
        renter.changedTick = this.tick;
        renter.house = null;
    }

    houseUnrent(house) {
        if (!house.renter) {
            throw new Error("House is not rented");
        }
        house.renter = null;
        house.changedTick = this.tick;
        house.rentalEnd = null;
    }

    endRentingWithRenterId(renterId, newRent = null) {
        const renter = this.renters[renterId];
        if (renter.house) {
            this.endRentingWithHouseId(renter.house.id, newRent);
            return true;
        }
        return false;
    }

    adjustPopulation(newTotalRenters) {
        const totalRenters = this.rentersLooking.size + this.rentersRenting.size;
        const diff = newTotalRenters - totalRenters;
        if (diff > 0) {
            for (let i = 0; i < diff; i++) {
                const age = Math.random() * std_age + mean_age;
                const incomeFactor = income_factor_lognormal();
                this.addRenter(age, incomeFactor);
            }
        } else if (diff < 0) {
            const renterIds = Array.from(this.renters.keys()).sort(() => 0.5 - Math.random()).slice(0, -diff);
            for (const renterId of renterIds) {
                this.endRentingWithRenterId(renterId);
                this.rentersLooking.delete(renterId);
                delete this.renters[renterId];
            }
        }
    }

    adjustHousing(newTotalHouses) {
        const totalHouses = this.housesAvailable.size + this.housesRented.size;
        const diff = newTotalHouses - totalHouses;
        if (diff > 0) {
            const avgRent = this.housesAvailable.size ? Object.values(this.houses).filter((house) => this.housesAvailable.has(house.id)).reduce((sum, house) => sum + house.rentPrice, 0) / this.housesAvailable.size : initial_rent_price;
            for (let i = 0; i < diff; i++) {
                const rentPrice = avgRent * Math.random() * (1 + this.markup * 0.5);
                this.addHouse(rentPrice);
            }
        } else if (diff < 0) {
            const houseIds = Array.from(this.houses.keys()).sort(() => 0.5 - Math.random()).slice(0, -diff);
            for (const houseId of houseIds) {
                this.endRentingWithHouseId(houseId);
                this.housesAvailable.delete(houseId);
                delete this.houses[houseId];
            }
        }
    }

    step() {
        this.tick += 1;
        const tick = this.tick;
        const ha = this.housesAvailable;

        this.housesRentedInTick = [];

        for (const houseId of Array.from(this.housesRented)) {
            const house = this.houses[houseId];
            if (house.rentalEnd <= tick) {
                const newRent = house.rentPrice * (1 + this.markup * 0.5);
                this.endRentingWithHouseId(houseId, newRent);
            }
        }

        const rentersLooking = Array.from(this.rentersLooking).map((renterId) => this.renters[renterId]);
        shuffle(rentersLooking);
        for (const renter of rentersLooking) {
            if (ha.size === 0) break;
            const visitedHouseIds = Array.from(ha).sort(() => 0.5 - Math.random()).slice(0, Math.min(this.housesConsideredPerStep, ha.size));
            const visitedHouses = visitedHouseIds.map((houseId) => this.houses[houseId]);
            const bestHouse = visitedHouses.reduce((best, house) => (house.rentPrice < best.rentPrice ? house : best), visitedHouses[0]);
            const bestRent = bestHouse.rentPrice;
            const availableForRent = Math.min(renter.incomeFactor * this.meanIncome - this.costOfLiving, renter.incomeFactor * this.meanIncome * this.rentAffordability);
            if (availableForRent >= bestRent) {
                const ttl = Math.floor(Math.random() * (this.rentalDurationMax - this.rentalDurationMin + 1)) + this.rentalDurationMin;
                this.makeRentingContract(renter, bestHouse, ttl);
                this.housesRentedInTick.push(bestHouse);
            }
        }

        for (const houseId of ha) {
            const house = this.houses[houseId];
            house.setRentPrice(house.rentPrice * (1 - this.priceDrop));
        }
    }
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
