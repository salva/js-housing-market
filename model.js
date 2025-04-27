
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function shuffleN(array, n) {
    const len = array.length;
    for (let i = 0; (i < len) && (i < n); i++) {
        const j = Math.floor(Math.random() * (len - i) + i);
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function shuffleAndTakeN(array, n) {
    shuffleN(array, n);
    array.splice(n);
}

function mapAndMean(iterable, func) {
    let sum = 0;
    let count = 0;
    for (const item of iterable) {
        sum += func(item);
        count += 1;
    }
    if (count > 0) {
        return sum / count;
    }
    return null;
}

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
    constructor(nRenters=0,
                nHouses=0,
                rentAffordability=0.2,
                costOfLiving=100,
                markup=0.2,
                priceDrop=0.02,
                housesConsideredPerStep=10,
                rentalDurationMin=1,
                rentalDurationMax=200,
                meanIncome=1000) {

        this.tick = 0;
        this.renters = {}
        this.nRenters = 0;
        this.houses = {};
        this.nHouses = 0;
        this.rentersLooking = new Set();
        this.rentersRenting = new Set();
        this.housesVacant = new Set();
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

        this.stdAge = 10;
        this.meanAge = 30;

        this.incomeFactorCv = 0.3;
        this.incomeFactorSigma2 = -Math.log(1 - Math.pow(this.incomeFactorCv, 2));
        this.incomeFactorSigma = Math.sqrt(this.incomeFactorSigma2);
        this.incomeFactorMu = -this.incomeFactorSigma2 / 2;

        // Parameters for beta distribution used to model rental durations.
        this.rentalDurationBetaAlpha = 5;
        this.rentalDurationBetaBeta = 2;

        this.initialRentPrice = 1000.0;
        this.currentRentPrice = this.initialRentPrice;
        this.currentRentPriceWeight = 100.0;
        this.currentRentPriceAmortizationFactor = 0.9;

        this.housesRentedInTick = [];
    }

    setNRenters(val) {
        console.log(`Number of Renters changed from ${this.nRenters} to ${val}`);
        this.adjustPopulation(val);
    }

    setNHouses(val) {
        console.log(`Number of Houses changed from ${this.nHouses} to ${val}`);
        this.adjustHousing(val);
    }

    setRentAffordability(val) {
        console.log(`Rent Affordability changed from ${this.rentAffordability} to ${val}`);
        this.rentAffordability = val;
    }

    setCostOfLiving(val) {
        console.log(`Cost of Living changed from ${this.costOfLiving} to ${val}`);
        this.costOfLiving = val;
    }

    setMarkup(val) {
        console.log(`Markup changed from ${this.markup} to ${val}`);
        this.markup = val;
    }

    setPriceDrop(val) {
        console.log(`Price Drop changed from ${this.priceDrop} to ${val}`);
        this.priceDrop = val;
    }

    setHousesPerStep(val) {
        console.log(`Houses Considered per Step changed from ${this.housesPerStep} to ${val}`);
        this.housesPerStep = val;
    }

    setRentalDuration(val) {
        console.log(`Max Rental Duration changed from ${this.rentalDurationMax} to ${val}`);
        this.rentalDurationMax = val;
    }

    setIncome(val) {
        console.log(`Salary changed from ${this.meanIncome} to ${val}`);
        this.meanIncome = val;
    }

    setShowTicks(val) {
        console.log(`Show Ticks changed from ${this.showTicks} to ${val}`);
        this.showTicks = val;
    }

    setUpdateSpeed(val) {
        console.log(`Update Speed changed from ${this.updateSpeed} to ${val}`);
        this.updateSpeed = val;
    }

    incomeFactorLogNormal() {
        return jStat.lognormal.sample(this.incomeFactorMu, this.incomeFactorSigma);
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
        this.housesVacant.add(this.lastId);
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
        renter.lookingTime = this.tick - renter.changedTick;
        renter.changedTick = this.tick;
        house.vacantTime = this.tick - house.changedTick;
        house.rentingTime = ttl;
        house.changedTick = this.tick
        house.rentalEnd = this.tick + ttl;

        this.rentersRenting.add(renter.id);
        this.rentersLooking.delete(renter.id);
        this.housesVacant.delete(house.id);
        this.housesRented.add(house.id);

        this.housesRentedInTick.push(house);
    }

    endRenting(house, newRent = null) {
        const renter = house.renter;
        if (renter) {
            this.renterUnrent(renter);
            this.rentersRenting.delete(renter.id);
            this.rentersLooking.add(renter.id);
            this.houseUnrent(house);
            this.housesRented.delete(house.id);
            this.housesVacant.add(house.id);
            if (newRent !== null) {
                house.setRentPrice(newRent);
            }
        }
        else {
            console.warn("endRentingWithHouseId for not rented house $(house.id}")
        }
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
        house.rentingTime = null;
        house.vacantTime = null;
    }

    adjustPopulation(newNRenters) {
        const diff = newNRenters - this.nRenters;
        if (diff > 0) {
            for (let i = 0; i < diff; i++) {
                const age = Math.random() * this.stdAge + this.meanAge;
                const incomeFactor = this.incomeFactorLogNormal();
                this.addRenter(age, incomeFactor);
            }
        }
        else if (diff < 0) {
            const rmRenters = Object.values(this.renters)
            shuffleAndTakeN(rmRenters, -diff)
            for (const renter in rmRenter) {
                const house = renter.house;
                if (house) {
                    this.endRenting(house);
                }
                this.rentersLooking.delete(renter.id);
                delete this.renters[renter.id];
            }
        }
        this.nRenters = newNRenters;
    }

    randomRent() {
        const stddev = this.markup * 0.2;
        const result = Math.max(1.0, this.currentRentPrice * jStat.normal.sample(1.0 + this.markup, stddev));
        // console.log(`new random rent: ${result}`);
        return result;
    }

    adjustHousing(newNHouses) {
        const diff = newNHouses - this.nHouses;;
        if (diff > 0) {
            const meanRent = mapAndMean(this.housesRented, (houseId) => this.houses[houseId].rentPrice) || this.initialRentPrice;
            for (let i = 0; i < diff; i++) {
                const rentPrice = meanRent * Math.random() * (1 + this.markup * 0.5);
                this.addHouse(rentPrice);
            }
        } else if (diff < 0) {
            const rmHouses = Object.values(this.houses);
            shuffleAndTakeN(rmHouses, -diff);
            for (const house of rmHouses) {
                if (house.renter) {
                    this.endRenting(house);
                }
                this.housesVacant.delete(house.id);
                delete this.houses[house.id];
            }
        }
        this.nHouses = newNHouses;
    }

    randomTtl() {
        const sample = jStat.beta.sample(this.rentalDurationBetaAlpha, this.rentalDurationBetaBeta);
        const result = Math.floor(sample * (this.rentalDurationMax-this.rentalDurationMin) + this.rentalDurationMin + 0.5);
        // console.log(`beta sample: ${sample}, result: ${result}`)
        return result;
    }

    step() {
        this.tick += 1;
        // console.log("Tick: " + this.tick + " Renters: " + this.rentersLooking.size + " Houses: " + (this.housesVacant.size + this.housesRented.size));
        const tick = this.tick;
        const ha = this.housesVacant;

        this.housesRentedInTick = [];

        // console.log("[" + new Date().toISOString() + "] Ending renting contracts" + ha.size);

        for (const houseId of Array.from(this.housesRented)) {
            const house = this.houses[houseId];
            if (house.rentalEnd <= tick) {
                // console.log(`Ending renting for house ${house.id}, ttl: ${house.rentalEnd - house.changedTick}`);
                // const newRent = house.rentPrice * (1 + this.markup * 0.5);
                const newRent = this.randomRent();
                this.endRenting(house, newRent);

            }
        }

        // console.log("[" + new Date().toISOString() + "] Renting homes" + ha.size);

        const rlIds = Array.from(this.rentersLooking);
        const hvIds = Array.from(this.housesVacant);
        shuffle(rlIds);
        for (const renterId of rlIds) {
            if (hvIds.length === 0) break;
            const renter = this.renters[renterId];

            shuffleN(hvIds, this.housesConsideredPerStep);
            let bestIx = 0;
            let bestRentPrice = this.houses[hvIds[0]].rentPrice;
            for (let ix=1; ix < this.housesConsideredPerStep && ix < hvIds.length; ix++) {
                const altRentPrice = this.houses[hvIds[ix]].rentPrice;
                if (altRentPrice < bestRentPrice) {
                    bestIx = ix;
                    bestRentPrice = altRentPrice;
                }
            }

            if (bestRentPrice <= this.incomeAvailableForRent(renter)) {
                const bestHouse = this.houses[hvIds[bestIx]];
                this.makeRentingContract(renter, bestHouse, this.randomTtl());
            }
            else {
                // console.log("not renting to " + renterId + " because rent price is too high: " + bestRentPrice +" > " + this.incomeAvailableForRent(renter) + " renter salary factor: " + renter.incomeFactor + "(total: " + this.renterIncome(renter) + ")");
            }

            hvIds[bestIx] = hvIds.at(-1);
            hvIds.pop();
        }

        const newWeight = this.housesRentedInTick.length;
        // console.log(`newWeight: ${newWeight}`);

        if (newWeight > 0) {
            const oldPrice = this.currentRentPrice
            const newPrice = mapAndMean(this.housesRentedInTick, (house) => house.rentPrice);
            const oldWeight = this.currentRentPriceWeight * this.currentRentPriceAmortizationFactor;
            const weight = oldWeight + newWeight;
            this.currentRentPrice = (oldWeight * oldPrice + newWeight * newPrice) / weight;
            this.currentRentPriceWeight = weight;
            // console.log(`newWeight: ${newWeight}, newPrice: ${newPrice}, oldWeight: ${oldWeight}, oldPrice: ${oldPrice} --> ${this.currentRentPrice}`)
        }

        // console.log("[" + new Date().toISOString() + "] Dropping prices" + ha.size);
        for (const houseId of ha) {
            const house = this.houses[houseId];
            house.setRentPrice(Math.max(1.0, house.rentPrice * (1 - this.priceDrop)));
        }
    }

    renterIncome(renter) {
        return renter.incomeFactor * this.meanIncome;
    }

    incomeAvailableForRent(renter) {
        const income = this.renterIncome(renter);
        return Math.min(income - this.costOfLiving, income * this.rentAffordability);
    }
}

class History {
    constructor() {
        this.ticks = [];
        this.times = [];
        this.housesAll = [];
        this.housesVacant = [];
        this.housesRented = [];
        this.rentersAll = [];
        this.rentersRenting = [];
        this.rentersLooking = [];
        this.incomeAll = [];
        this.incomeRenting = [];
        this.incomeLooking = [];
        this.availableForRentAll = [];
        this.availableForRentRenting = [];
        this.availableForRentLooking = [];
        this.rentAll = [];
        this.rentRented = [];
        this.rentVacant = [];
        this.houseVacantTime = [];

        this.inTickRentPrice = [];
        this.inTickAvailableForRent = [];
        this.inTickLookingTime = [];
        this.inTickVacantTime = [];

        this.currentRentPrice = [];
    }

    init(model) {
        this.model = model;
    }

    push() {
        let model = this.model;
        let renters = model.renters;
        let houses = model.houses;
        this.ticks.push(model.tick);
        this.times.push(weeksToYears(model.tick));

        this.housesAll.push(model.nHouses);
        this.housesVacant.push(model.housesVacant.size);
        this.housesRented.push(model.housesRented.size);

        this.rentersAll.push(model.nRenters);
        this.rentersRenting.push(model.rentersRenting.size);
        this.rentersLooking.push(model.rentersLooking.size);

        this.incomeAll.push(mapAndMean(Object.values(renters), (renter) => model.renterIncome(renter)));
        this.incomeRenting.push(mapAndMean(model.rentersRenting, (renterId) => model.renterIncome(renters[renterId])));
        this.incomeLooking.push(mapAndMean(model.rentersLooking, (renterId) => model.renterIncome(renters[renterId])));

        this.availableForRentAll.push(mapAndMean(Object.values(renters), (renter) => model.incomeAvailableForRent(renter)));
        this.availableForRentRenting.push(mapAndMean(model.rentersRenting, (renterId) => model.incomeAvailableForRent(renters[renterId])));
        this.availableForRentLooking.push(mapAndMean(model.rentersLooking, (renterId) => model.incomeAvailableForRent(renters[renterId])));

        this.rentAll.push(mapAndMean(Object.values(houses), (house) => house.rentPrice));
        this.rentRented.push(mapAndMean(model.housesRented, (houseId) => houses[houseId].rentPrice));
        this.rentVacant.push(mapAndMean(model.housesVacant, (houseId) => houses[houseId].rentPrice));

        this.houseVacantTime.push(mapAndMean(model.housesVacant, (houseId) => model.tick - houses[houseId].createdTick));

        this.inTickRentPrice.push(mapAndMean(model.housesRentedInTick, (house) => house.rentPrice));
        this.inTickAvailableForRent.push(mapAndMean(model.housesRentedInTick, (house) => model.incomeAvailableForRent(house.renter)));
        this.inTickVacantTime.push(mapAndMean(model.housesRentedInTick, (house) => house.vacantTime));
        this.inTickLookingTime.push(mapAndMean(model.housesRentedInTick, (house) => house.renter.lookingTime));

        this.currentRentPrice.push(model.currentRentPrice);

    }
}
