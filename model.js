
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

class Citizen {
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
    constructor(id, tick, rentalPrice, salePrice) {
        this.id = id;
        this.createdTick = tick;
        this.changedTick = tick;
        this.rentalEnd = 0;
        this.owner = null;
        this.renter = null;
        this.status = 'new';
        this.setRentalPrice(rentalPrice);
        this.setSalePrice(salePraice)
    }

    setRentalPrice(newRentalPrice) {
        this.rentalPrice = Math.max(newRentalPrice, 1);
    }

    setSalePrice(newSalePrice) {
        this.salePrice = Math.max(newSalePrice, 1);
    }
}

class HousingMarket {
    constructor(nCitizens=0,
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
        this.citizens = {}
        this.nCitizens = 0;
        this.houses = {};
        this.nHouses = 0;
        this.citizensLooking = new Set();
        this.citizensRenting = new Set();
        this.citizensOwning = new Set();
        this.housesNew = new Set();
        this.housesForRent = new Set();
        this.housesForSale = new Set();
        this.housesRented = new Set();
        this.housesOwnerOccupied = new Set();
        this.housesSecondHouse = new Set();

        this.lastId = 0;

        this.rentAffordability = rentAffordability;
        this.costOfLiving = costOfLiving;
        this.markup = markup;
        this.priceDrop = priceDrop;
        this.housesConsideredPerStep = housesConsideredPerStep;
        this.rentalDurationMin = rentalDurationMin;
        this.rentalDurationMax = rentalDurationMax;
        this.meanIncome = meanIncome;

        this.adjustPopulation(nCitizens);
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

        this.initialRentalPrice = 1000.0;
        this.currentRentalPrice = this.initialRentalPrice;
        this.currentRentalPriceWeight = 100.0;
        this.currentRentalPriceAmortizationFactor = 0.9;

        this.housesRentedInTick = [];
    }

    setNCitizens(val) {
        console.log(`Number of Citizens changed from ${this.nCitizens} to ${val}`);
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

    addCitizen(age, incomeFactor) {
        this.lastId += 1;
        const citizen = new Citizen(this.lastId, this.tick, incomeFactor, age);
        this.citizens[this.lastId] = citizen;
        this.citizensLooking.add(this.lastId);
        return this.lastId;
    }

    addHouse(rentalPrice) {
        this.lastId += 1;
        const house = new House(this.lastId, this.tick, rentalPrice);
        this.houses[this.lastId] = house;
        this.housesForRent.add(this.lastId);
        return this.lastId;
    }

    makeRentingContract(citizen, house, ttl) {
        if (house.renter) {
            throw new Error("House is already rented");
        }

        if (citizen.house) {
            throw new Error("Citizen is already renting a house");
        }

        house.renter = citizen;
        citizen.house = house;
        citizen.lookingTime = this.tick - citizen.changedTick;
        citizen.changedTick = this.tick;
        house.vacantTime = this.tick - house.changedTick;
        house.rentingTime = ttl;
        house.changedTick = this.tick
        house.rentalEnd = this.tick + ttl;

        this.citizensRenting.add(citizen.id);
        this.citizensLooking.delete(citizen.id);
        this.housesForRent.delete(house.id);
        this.housesRented.add(house.id);

        this.housesRentedInTick.push(house);
    }

    endRenting(house, newRentalPrice = null) {
        const citizen = house.renter;
        if (citizen) {
            this.citizenUnrent(citizen);
            this.citizensRenting.delete(citizen.id);
            this.citizensLooking.add(citizen.id);
            this.houseUnrent(house);
            this.housesRented.delete(house.id);
            this.housesForRent.add(house.id);
            if (newRentalPrice !== null) {
                house.setRentalPrice(newRentalPrice);
            }
        }
        else {
            console.warn("endRentingWithHouseId for not rented house $(house.id}")
        }
    }

    citizenUnrent(citizen) {
        if (!citizen.house) {
            throw new Error("Citizen is not renting a house");
        }
        citizen.changedTick = this.tick;
        citizen.house = null;
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

    adjustPopulation(newNCitizens) {
        const diff = newNCitizens - this.nCitizens;
        if (diff > 0) {
            for (let i = 0; i < diff; i++) {
                const age = Math.random() * this.stdAge + this.meanAge;
                const incomeFactor = this.incomeFactorLogNormal();
                this.addCitizen(age, incomeFactor);
            }
        }
        else if (diff < 0) {
            const rmCitizens = Object.values(this.citizens)
            shuffleAndTakeN(rmCitizens, -diff)
            for (const citizen in rmCitizen) {
                const house = citizen.house;
                if (house) {
                    this.endRenting(house);
                }
                this.citizensLooking.delete(citizen.id);
                delete this.citizens[citizen.id];
            }
        }
        this.nCitizens = newNCitizens;
    }

    randomRentalPrice() {
        const stddev = this.markup * 0.2;
        const result = Math.max(1.0, this.currentRentalPrice * jStat.normal.sample(1.0 + this.markup, stddev));
        // console.log(`new random rentalPrice: ${result}`);
        return result;
    }

    addNHouses(newHouses) {
        for (let i = 0; i < newHouses; i++) {

            

        const meanRentalPrice = mapAndMean(this.housesRented, (houseId) => this.houses[houseId].rentalPrice) || this.initialRentalPrice;
        for (let i = 0; i < diff; i++) {
            const rentalPrice = meanRentalPrice * Math.random() * (1 + this.markup * 0.5);
            this.addHouse(rentalPrice);
        }
    }
    
    adjustHousing(newNHouses) {
        const diff = newNHouses - this.nHouses;;
        if (diff > 0) {
            addNHouses(diff);
        } else if (diff < 0) {
            const rmHouses = Object.values(this.houses);
            shuffleAndTakeN(rmHouses, -diff);
            for (const house of rmHouses) {
                if (house.renter) {
                    this.endRenting(house);
                }
                this.housesForRent.delete(house.id);
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
        // console.log("Tick: " + this.tick + " Citizens: " + this.citizensLooking.size + " Houses: " + (this.housesForRent.size + this.housesRented.size));
        const tick = this.tick;
        const ha = this.housesForRent;

        this.housesRentedInTick = [];

        // console.log("[" + new Date().toISOString() + "] Ending renting contracts" + ha.size);

        for (const houseId of Array.from(this.housesRented)) {
            const house = this.houses[houseId];
            if (house.rentalEnd <= tick) {
                // console.log(`Ending renting for house ${house.id}, ttl: ${house.rentalEnd - house.changedTick}`);
                // const newRentalPrice = house.rentalPrice * (1 + this.markup * 0.5);
                const newRentalPrice = this.randomRentalPrice();
                this.endRenting(house, newRentalPrice);

            }
        }

        // console.log("[" + new Date().toISOString() + "] Renting homes" + ha.size);

        const rlIds = Array.from(this.citizensLooking);
        const hvIds = Array.from(this.housesForRent);
        shuffle(rlIds);
        for (const citizenId of rlIds) {
            if (hvIds.length === 0) break;
            const citizen = this.citizens[citizenId];

            shuffleN(hvIds, this.housesConsideredPerStep);
            let bestIx = 0;
            let bestRentalPrice = this.houses[hvIds[0]].rentalPrice;
            for (let ix=1; ix < this.housesConsideredPerStep && ix < hvIds.length; ix++) {
                const altRentalPrice = this.houses[hvIds[ix]].rentalPrice;
                if (altRentalPrice < bestRentalPrice) {
                    bestIx = ix;
                    bestRentalPrice = altRentalPrice;
                }
            }

            if (bestRentalPrice <= this.incomeAvailableForRent(citizen)) {
                const bestHouse = this.houses[hvIds[bestIx]];
                this.makeRentingContract(citizen, bestHouse, this.randomTtl());
            }
            else {
                // console.log("not renting to " + citizenId + " because rent price is too high: " + bestRentalPrice +" > " + this.incomeAvailableForRent(citizen) + " citizen salary factor: " + citizen.incomeFactor + "(total: " + this.citizenIncome(citizen) + ")");
            }

            hvIds[bestIx] = hvIds.at(-1);
            hvIds.pop();
        }

        const newWeight = this.housesRentedInTick.length;
        // console.log(`newWeight: ${newWeight}`);

        if (newWeight > 0) {
            const oldPrice = this.currentRentalPrice
            const newPrice = mapAndMean(this.housesRentedInTick, (house) => house.rentalPrice);
            const oldWeight = this.currentRentalPriceWeight * this.currentRentalPriceAmortizationFactor;
            const weight = oldWeight + newWeight;
            this.currentRentalPrice = (oldWeight * oldPrice + newWeight * newPrice) / weight;
            this.currentRentalPriceWeight = weight;
            // console.log(`newWeight: ${newWeight}, newPrice: ${newPrice}, oldWeight: ${oldWeight}, oldPrice: ${oldPrice} --> ${this.currentRentalPrice}`)
        }

        // console.log("[" + new Date().toISOString() + "] Dropping prices" + ha.size);
        for (const houseId of ha) {
            const house = this.houses[houseId];
            house.setRentalPrice(Math.max(1.0, house.rentalPrice * (1 - this.priceDrop)));
        }
    }

    citizenIncome(citizen) {
        return citizen.incomeFactor * this.meanIncome;
    }

    incomeAvailableForRent(citizen) {
        const income = this.citizenIncome(citizen);
        return Math.min(income - this.costOfLiving, income * this.rentAffordability);
    }
}

class History {
    constructor() {
        this.ticks = [];
        this.times = [];
        this.housesAll = [];
        this.housesForRent = [];
        this.housesRented = [];
        this.citizensAll = [];
        this.citizensRenting = [];
        this.citizensLooking = [];
        this.incomeAll = [];
        this.incomeRenting = [];
        this.incomeLooking = [];
        this.incomeAvailableForRentAll = [];
        this.incomeAvailableForRentRenting = [];
        this.incomeAvailableForRentLooking = [];
        this.rentalPriceAll = [];
        this.rentalPriceHousesForRent = [];
        this.rentalPriceHousesForRent = [];
        this.houseVacantTime = [];

        this.inTickRent = [];
        this.inTickAvailableForRent = [];
        this.inTickLookingTime = [];
        this.inTickVacantTime = [];

        this.currentRentalPrice = [];
    }

    init(model) {
        this.model = model;
    }

    push() {
        let model = this.model;
        let citizens = model.citizens;
        let houses = model.houses;
        this.ticks.push(model.tick);
        this.times.push(weeksToYears(model.tick));

        this.housesAll.push(model.nHouses);
        this.housesForRent.push(model.housesForRent.size);
        this.housesRented.push(model.housesRented.size);

        this.citizensAll.push(model.nCitizens);
        this.citizensRenting.push(model.citizensRenting.size);
        this.citizensLooking.push(model.citizensLooking.size);

        this.incomeAll.push(mapAndMean(Object.values(citizens), (citizen) => model.citizenIncome(citizen)));
        this.incomeRenting.push(mapAndMean(model.citizensRenting, (citizenId) => model.citizenIncome(citizens[citizenId])));
        this.incomeLooking.push(mapAndMean(model.citizensLooking, (citizenId) => model.citizenIncome(citizens[citizenId])));

        this.incomeAvailableForRentAll.push(mapAndMean(Object.values(citizens), (citizen) => model.incomeAvailableForRent(citizen)));
        this.incomeAvailableForRentRenting.push(mapAndMean(model.citizensRenting, (citizenId) => model.incomeAvailableForRent(citizens[citizenId])));
        this.incomeAvailableForRentLooking.push(mapAndMean(model.citizensLooking, (citizenId) => model.incomeAvailableForRent(citizens[citizenId])));

        this.rentalPriceAll.push(mapAndMean(Object.values(houses), (house) => house.rentalPrice));
        this.rentHousesForRent.push(mapAndMean(model.housesRented, (houseId) => houses[houseId].rentalPrice));
        this.rentHousesForRent.push(mapAndMean(model.housesForRent, (houseId) => houses[houseId].rentalPrice));

        this.houseVacantTime.push(mapAndMean(model.housesForRent, (houseId) => model.tick - houses[houseId].createdTick));

        this.inTickRent.push(mapAndMean(model.housesRentedInTick, (house) => house.rentalPrice));
        this.inTickAvailableForRent.push(mapAndMean(model.housesRentedInTick, (house) => model.incomeAvailableForRent(house.renter)));
        this.inTickVacantTime.push(mapAndMean(model.housesRentedInTick, (house) => house.vacantTime));
        this.inTickLookingTime.push(mapAndMean(model.housesRentedInTick, (house) => house.renter.lookingTime));

        this.currentRentalPrice.push(model.currentRentalPrice);

    }
}
