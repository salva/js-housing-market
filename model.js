
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

function arrayRemoveAt(array, ix) {
    array[ix] = array[array.length - 1];
    array.pop();
}

function computeWeeklyMortgagePayment(principal, annualInterestRate, weeks) {
    if (annualInterestRate === 0) {
        return principal / weeks;
    }

    const weeklyRate = annualInterestRate / 52;
    return principal * weeklyRate / (1 - Math.pow(1 + weeklyRate, -weeks))
}

function betaSample(min, max, mean, dispersion) {
    // console.log(`betaSample(${min}, ${max}, ${mean}, ${dispersion})`);
    if (mean <= min || mean >= max) {
        throw new Error("mean must be between min and max");
    }
    if (dispersion <= 0 || dispersion >= 1) {
        throw new Error("dispersion must be in (0, 1)");
    }

    const mean01 = (mean - min) / (max - min);
    const factor = (1 - dispersion) / dispersion;
    const alpha = mean01 * factor;
    const beta = (1 - mean01) * factor;

    // console.log(`Computed parameters for beta distribution - mean01: ${mean01}, factor: ${factor}, alpha: ${alpha}, beta: ${beta}`);

    const sample01 = jStat.beta.sample(alpha, beta);
    const sample = min + (max - min) * sample01;

    // console.log(`Sample from beta distribution - sample01: ${sample01}, sampled value: ${sample}`);

    return sample;
}

function shiftedGammaSample(shift, mean, dispersion) {
    // console.log(`shiftedGammaSample(shift: ${shift}, mean: ${mean}, dispersion: ${dispersion})`);
    if (mean <= shift) {
        throw new Error("mean must be above the shift");
    }
    if (dispersion <= 0 || dispersion >= 1) {
        if (dispersion === 0) { return mean; }
        throw new Error("dispersion must be in (0, 1)");
    }

    const std = dispersion * (mean - shift);
    const k = Math.pow((mean - shift) / std, 2);
    const theta = Math.pow(std, 2) / (mean - shift);

    const sample = jStat.gamma.sample(k, theta) + shift; // shift to match the original range
    // console.log(`shiftedGammaSample std: ${std}, k: ${k}, theta: ${theta}, sample: ${sample}`);

    return sample;
}

class Thing {
    static nextId = 0;

    constructor(state, tick) {
        this.previousState = "_beforeNew";
        this.state = state;
        this.id = Thing.nextId;
        Thing.nextId += 1;

        this.creationTick = tick;
        this.lastStateChangeTick = tick;
        this.lastStateChangeTickGap = 0;
    }

    newState(state, tick) {
        if (this.state !== state) {
            if (tick > this.lastStateChangeTick) {
                this.previousState = this.state;
                this.lastStateChangeTickGap = tick - this.lastStateChangeTick;
                this.lastStateChangeTick = tick;
            }
            this.state = state;
        }
    }
}

class Citizen extends Thing {
    constructor(tick, lifeStartAge, lifespan, retirementAge,
                salaryAt20, lifetimeSalaryGrowthFactor,
                costOfLivingBase, costOfLivingSalaryFactor,
                rentalAffordabilityRatio, mortgageAffordabilityRatio,
                surplusSavingRate, rentalInvestmentRate,
                homeBuyingAge) {
        super("_new", tick)
        this.lifeStart = tick - lifeStartAge;
        this.lifeStartAge = lifeStartAge;
        this.lifespan = lifespan;
        this.workingEnd = tick + retirementAge - lifeStartAge;
        this.lifeEnd = tick + lifespan - lifeStartAge;
        this.salaryAt20 = salaryAt20;
        this.lifetimeSalaryGrowthFactor = lifetimeSalaryGrowthFactor;
        this.costOfLivingBase = costOfLivingBase;
        this.costOfLivingSalaryFactor = costOfLivingSalaryFactor;
        this.rentalAffordabilityRatio = rentalAffordabilityRatio;
        this.mortgageAffordabilityRatio = mortgageAffordabilityRatio;
        this.surplusSavingRate = surplusSavingRate;
        this.rentalInvestmentRate = rentalInvestmentRate;
        this.homeBuyingAge = homeBuyingAge;
        this.homeBuyingTick = tick + homeBuyingAge - lifeStartAge;
        this.savings = 0;
        this.ownedHouses = [];
        this.residence = null;
        this.salary = 0;
        this.costOfLiving = 0;
        this.salaryAvailableForRent = 0;
        this.salaryAvailableForMortgage = 0;

        console.log(`new citizen: id: ${this.id}, lifeStart: ${this.lifeStart}, lifespan: ${this.lifespan}, retirementAge: ${retirementAge}, workingEnd: ${this.workingEnd}, lifeEnd: ${this.lifeEnd}, salaryAt20: ${salaryAt20}, lifetimeSalaryGrowthFactor: ${lifetimeSalaryGrowthFactor}, costOfLivingBase: ${costOfLivingBase}, costOfLivingSalaryFactor: ${costOfLivingSalaryFactor}, surplusSavingRate: ${surplusSavingRate}, rentalInvestmentRate: ${rentalInvestmentRate}, homeBuyingAge: ${homeBuyingAge}`);

    }
}

class House extends Thing {
    constructor(tick, salePrice) {
        super("_new", tick);
        this.rentalEnd = 0;
        this.owner = null;
        this.resident = null;
        this.salePrice = salePrice;
        this.rentPrice = null;
        this.mortagePayment = 0;
        this.mortageEnd = 0;
        this.lastBuyPrice = null;
        this.lastFullBuyPrice = null;
    }
}

class Vulture extends Thing {
    constructor(tick) {
        super("scavenging", tick);
        this.ownedHouses = []
    }
}

class HousingMarket {
    constructor() {
        this.tick = 0;
        this.citizens = {}
        this.nCitizens = 0;
        this.houses = {};
        this.nHouses = 0;

        this.citizensLooking = new Set();
        this.citizensRenting = new Set();
        this.citizensOwningTheirHomes = new Set();

        this.housesForRent = new Set();
        this.housesForSale = new Set();
        this.housesRented = new Set();
        this.housesOccupiedByOwner = new Set();

        this.savingsRatio = 0.2;
        this.costOfLivingBase = 100;
        this.costOfLivingSalaryFactor = 0.2;
        this.costOfLivingDispersion = 0.2;
        this.rentMarkup = 0.20;
        this.rentOverload = 0.03;
        this.saleMarkup = 0.10;
        this.rentPriceDrop = 0.07;
        this.salePriceDrop = 0.01;
        this.housesConsideredPerStep = 10;
        this.nextCityRentPriceRatio = 0.3;

        this.moneyDepositRate = 0.02;

        this.mortgageRate = 0.04;
        this.maxMortgageDuration = 30 * 52;
        this.maxMortgageAge = 75 * 52;
        this.maxMortgageLoanToValue = 0.8;
        this.buyingTaxes = 0.08;
        this.fixedBuyingCosts = 1000;
        this.mortgageWeight = 0.8;

        this.salaryAt20Min = 5000;
        this.salaryAt20Mean = 20000;
        this.salaryAt20Dispersion = 0.2;
        this.lifetimeSalaryGrowthFactorMin = 1;
        this.lifetimeSalaryGrowthFactorMean = 3;
        this.lifetimeSalaryGrowthFactorDispersion = 0.2;
        this.afterRetirementSalaryFactorMean = 0.8;

        this.rentAffordabilityRatioMean = 0.3;
        this.rentAffordabilityRatioDispersion = 0.1;
        this.mortgageAffordabilityRatioMean = 0.3;
        this.mortgageAffordabilityRatioDispersion = 0.1;

        this.surplusSavingRateMean = 0.2;
        this.surplusSavingRateDispersion = 0.2;
        this.rentalInvestmentRateMean = 0.2;
        this.rentalInvestmentRateDispersion = 0.2;
        this.minAcceptableExcessYieldMean = 0.02;
        this.minAcceptableExcessYieldDispersion = 0.1;

        this.rentalDurationMean = 52 * 12; // 1 year
        this.rentalDurationDispersion = 0.2; // 20% dispersion

        this.homeBuyingAgeMin = 18 * 52; // 18 years
        this.homeBuyingAgeMean = 30 * 52; // 30 years
        this.homeBuyingAgeDispersion = 0.25; // 20% dispersion

        this.currentRentPrice = null;
        this.currentRentPriceWeight = 0;
        this.currentRentPriceAmortizationFactor = 0.9;

        this.initialSalePrice = 250000.0;
        this.currentSalePrice = null;
        this.currentSalePriceWeight = 0;
        this.currentSalePriceAmortizationFactor = 0.9;

        this.houseAmortizedMaintenanceCost = 0; //100;

        this.minStartLifeAge = 20 * 52;
        this.maxStartLifeAge = 105 * 52;
        this.meanStartLifeAge = 28 * 52;
        this.dispersionStartLifeAge = 0.05;
        this.retirementAge = 68 * 52;

        this.minLifespan = 20 * 52;
        this.maxLifespan = 105 * 52;
        this.meanLifespan = 80 * 52;
        this.dispersionLifespan = 0.05;

        this.housesRentedInTick = [];
        this.housesBoughtInTick = [];
    }

    setNCitizens(val) {
        console.log(`Number of Citizens changed from ${this.nCitizens} to ${val}`);
        this.nCitizens = val;
    }

    setNHouses(val) {
        console.log(`Number of Houses changed from ${this.nHouses} to ${val}`);
        this.nHouses = val;
    }

    setSavingsRatio(val) {
        console.log(`Savings Ratio changed from ${this.savingsRatio} to ${val}`);
        this.savingsRatio = val;
    }

    setCostOfLivingBase(val) {
        console.log(`Cost of Living changed from ${this.costOfLiving} to ${val}`);
        this.costOfLivingBase = val;
    }
    setCostOfLivingSalaryFactor(val) {
        console.log(`Cost of Living Salary Factor changed from ${this.costOfLivingSalaryFactor} to ${val}`);
        this.costOfLivingSalaryFactor = val;
    }
    setCostOfLivingDispersion(val) {
        console.log(`Cost of Living Dispersion changed from ${this.costOfLivingDispersion} to ${val}`);
        this.costOfLivingDispersion = val;
    }

    setSaleMarkup(val) {
        console.log(`SaleMarkup changed from ${this.saleMarkup} to ${val}`);
        this.saleMarkup = val;
    }

    setRentMarkup(val) {
        console.log(`RentMarkup changed from ${this.rentMarkup} to ${val}`);
        this.rentMarkup = val;
    }

    setSalePriceDrop(val) {
        console.log(`Sale Price Drop changed from ${this.salePriceDrop} to ${val}`);
        this.salePriceDrop = val;
    }

    setRentPriceDrop(val) {
        console.log(`Rent Price Drop changed from ${this.rentPriceDrop} to ${val}`);
        this.rentPriceDrop = val;
    }

    setHousesPerStep(val) {
        console.log(`Houses Considered per Step changed from ${this.housesPerStep} to ${val}`);
        this.housesPerStep = val;
    }

    setRentalDurationMean(val) {
        console.log(`Rental Duration Mean changed from ${this.rentalDurationMean} to ${val}`);
        this.rentalDurationMean = val;
    }
    setRentalDurationDispersion(val) {
        console.log(`Rental Duration Dispersion changed from ${this.rentalDurationDispersion} to ${val}`);
        this.rentalDurationDispersion = val;
    }

    setLifespanMean(val) {
        console.log(`Lifespan Mean changed from ${this.meanLifespan} to ${val}`);
        this.meanLifespan = val;
    }
    setLifespanDispersion(val) {
        console.log(`Lifespan Dispersion changed from ${this.dispersionLifespan} to ${val}`);
        this.dispersionLifespan = val;
    }

    setLifespanMin(val) {
        console.log(`Lifespan Min changed from ${this.minLifespan} to ${val}`);
        this.minLifespan = val;
    }
    setLifespanMax(val) {
        console.log(`Lifespan Max changed from ${this.maxLifespan} to ${val}`);
        this.maxLifespan = val;
    }

    setLifeStartAgeMean(val) {
        console.log(`Life Start Age Mean changed from ${this.meanStartLifeAge} to ${val}`);
        this.meanStartLifeAge = val;
    }
    setLifeStartAgeDispersion(val) {
        console.log(`Life Start Age Dispersion changed from ${this.dispersionStartLifeAge} to ${val}`);
        this.dispersionStartLifeAge = val;
    }
    setLifeStartAgeMin(val) {
        console.log(`Life Start Age Min changed from ${this.minStartLifeAge} to ${val}`);
        this.minStartLifeAge = val;
    }
    setLifeStartAgeMax(val) {
        console.log(`Life Start Age Max changed from ${this.maxStartLifeAge} to ${val}`);
        this.maxStartLifeAge = val;
    }

    setRetirementAge(val) {
        console.log(`Retirement Age changed from ${this.retirementAge} to ${val}`);
        this.retirementAge = val;
    }

    setSalaryAt20Min(val) {
        console.log(`Salary At 20 Min changed from ${this.salaryAt20Min} to ${val}`);
        this.salaryAt20Min = val;
    }
    setSalaryAt20Mean(val) {
        console.log(`Salary At 20 Mean changed from ${this.salaryAt20Mean} to ${val}`);
        this.salaryAt20Mean = val;
    }
    setSalaryAt20Dispersion(val) {
        console.log(`Salary At 20 Dispersion changed from ${this.salaryAt20Dispersion} to ${val}`);
        this.salaryAt20Dispersion = val;
    }

    setLifetimeSalaryGrowthFactorMin(val) {
        console.log(`Lifetime Salary Growth Factor Min changed from ${this.lifetimeSalaryGrowthFactorMin} to ${val}`);
        this.lifetimeSalaryGrowthFactorMin = val;
    }

    setLifetimeSalaryGrowthFactorMean(val) {
        console.log(`Lifetime Salary Growth Factor Mean changed from ${this.lifetimeSalaryGrowthFactorMean} to ${val}`);
        this.lifetimeSalaryGrowthFactorMean = val;
    }
    setLifetimeSalaryGrowthFactorDispersion(val) {
        console.log(`Lifetime Salary Growth Factor Dispersion changed from ${this.lifetimeSalaryGrowthFactorDispersion} to ${val}`);
        this.lifetimeSalaryGrowthFactorDispersion = val;
    }

    setRentAffordabilityRatioMean(val) {
        console.log(`Rent Affordability Ratio Mean changed from ${this.rentAffordabilityRatioMean} to ${val}`);
        this.rentAffordabilityRatioMean = val;
    }

    setRentAffordabilityRatioDispersion(val) {
        console.log(`Rent Affordability Ratio Dispersion changed from ${this.rentAffordabilityRatioDispersion} to ${val}`);
        this.rentAffordabilityRatioDispersion = val;
    }

    setMortgageAffordabilityRatioMean(val) {
        console.log(`Mortgage Affordability Ratio Mean changed from ${this.mortgageAffordabilityRatioMean} to ${val}`);
        this.mortgageAffordabilityRatioMean = val;
    }

    setMortgageAffordabilityRatioDispersion(val) {
        console.log(`Mortgage Affordability Ratio Dispersion changed from ${this.mortgageAffordabilityRatioDispersion} to ${val}`);
        this.mortgageAffordabilityRatioDispersion = val;
    }

    setSurplusSavingRateMean(val) {
        console.log(`Surplus Saving Rate Mean changed from ${this.surplusSavingRateMean} to ${val}`);
        this.surplusSavingRateMean = val;
    }

    setSurplusSavingRateDispersion(val) {
        console.log(`Surplus Saving Rate Dispersion changed from ${this.surplusSavingRateDispersion} to ${val}`);
        this.surplusSavingRateDispersion = val;
    }

    setRentalInvestmentRateMean(val) {
        console.log(`Rental Investment Rate Mean changed from ${this.rentalInvestmentRateMean} to ${val}`);
        this.rentalInvestmentRateMean = val;
    }

    setRentalInvestmentRateDispersion(val) {
        console.log(`Rental Investment Rate Dispersion changed from ${this.rentalInvestmentRateDispersion} to ${val}`);
        this.rentalInvestmentRateDispersion = val;
    }

    setMortgageRate(val) {
        console.log(`Mortgage Rate changed from ${this.mortgageRate} to ${val}`);
        this.mortgageRate = val;
    }
    setMaxMortgageDuration(val) {
        console.log(`Max Mortgage Duration changed from ${this.maxMortgageDuration} to ${val}`);
        this.maxMortgageDuration = val;
    }

    setMaxMortgageAge(val) {
        console.log(`Max Mortgage Age changed from ${this.maxMortgageAge} to ${val}`);
        this.maxMortgageAge = val;
    }

    setMaxMortgageLoanToValue(val) {
        console.log(`Max Mortgage Loan To Value changed from ${this.maxMortgageLoanToValue} to ${val}`);
        this.maxMortgageLoanToValue = val;
    }

    setHomeBuyingAgeMin(val) {
        console.log(`Home Buying Age Min changed from ${this.homeBuyingAgeMin} to ${val}`);
        this.homeBuyingAgeMin = val;
    }

    setHomeBuyingAgeMean(val) {
        console.log(`Home Buying Age Mean changed from ${this.homeBuyingAgeMean} to ${val}`);
        this.homeBuyingAgeMean = val;
    }

    setHomeBuyingAgeDispersion(val) {
        console.log(`Home Buying Age Dispersion changed from ${this.homeBuyingAgeDispersion} to ${val}`);
        this.homeBuyingAgeDispersion = val;
    }

    setMinAcceptableExcessYieldMean(val) {
        console.log(`Min Acceptable Excess Yield Mean changed from ${this.minAcceptableExcessYieldMean} to ${val}`);
        this.minAcceptableExcessYieldMean = val;
    }

    setMinAcceptableExcessYieldDispersion(val) {
        console.log(`Min Acceptable Excess Yield Dispersion changed from ${this.minAcceptableExcessYieldDispersion} to ${val}`);
        this.minAcceptableExcessYieldDispersion = val;
    }

    setHouseRentPrice(house) {
        const oldRentPrice = house.rentPrice;
        const refRentPrice = (this.currentRentPrice ?? (house.lastBuyPrice * (this.moneyDepositRate / 52) * (1 + this.rentOverload)));
        const stddev = this.rentMarkup * 0.2;
        house.rentPrice = Math.max(1.0, refRentPrice * jStat.normal.sample(1.0 + this.rentMarkup, stddev));
        // console.log(`setHouseRentPrice: house ${house.id}, oldRentPrice: ${oldRentPrice}, newRentPrice: ${house.rentPrice}, refRentPrice: ${refRentPrice}, rentMarkup: ${this.rentMarkup}, currentRentPrice: ${this.currentRentPrice}, lastBuyPrice: ${house.lastBuyPrice}, moneyDepositRate: ${this.moneyDepositRate}, stddev: ${stddev}`);
    }

    setHouseSalePrice(house) {
        const rentPrice = house.rentPrice;
        if ((rentPrice !== null) && (rentPrice > 0)) {
            // TODO: this algorithm needs improvement, it should take more factors into account
            house.salePrice = rentPrice * 52 / this.moneyDepositRate * (1 + this.saleMarkup);
        }
        if (this.currentSalePrice === null) {
            // if (house.salePrice === null) {
            house.salePrice = this.initialSalePrice;
            // }
        }
        else {
            house.salePrice = this.currentSalePrice * (1 + this.saleMarkup);
        }
        // console.log(`setHouseSalePrice: house ${house.id}, rentPrice: ${house.rentPrice}, salePrice: ${house.salePrice}, amortized maintenance cost: ${this.houseAmortizedMaintenanceCost}, rentPrice: ${rentPrice}, money deposit rate: ${this.moneyDepositRate}, saleMarkup: ${this.saleMarkup}, currentSalePrice: ${this.currentSalePrice}`);
    }

    setHouseState(house, state) {
        const oldState = house.state;
        if (state !== oldState) {

            //if (oldState === "rented") {
            //    console.trace(`House ${house.id} is being set to state ${state} from rented, remaining ticks: ${house.rentalEnd - this.tick}`);
            //}

            const id = house.id;
            this.housesForRent.delete(id);
            this.housesForSale.delete(id);
            this.housesRented.delete(id);
            this.housesOccupiedByOwner.delete(id);
            if (state === "forSale") {
                this.housesForSale.add(house.id);
                this.setHouseSalePrice(house);
            }
            else if (state === "forRent") {
                this.housesForRent.add(house.id);
                this.setHouseRentPrice(house);
            }
            else if (state === "forSaleOrRent") {
                this.housesForSale.add(house.id);
                this.setHouseSalePrice(house);
                this.housesForRent.add(house.id);
                this.setHouseRentPrice(house);
            }
            else if (state === "rented") {
                this.housesRented.add(house.id);
            }
            else if (state === "occupiedByOwner") {
                this.housesOccupiedByOwner.add(house.id);
            }
            else if (state === "removed") {
                // The bulldozer has come
                delete this.houses[house.id];
            }
            else {
                console.warn("Unknown house state: " + state);
            }
            house.newState(state, this.tick);
        }
    }

    setCitizenState(citizen, state) {
        const oldState = citizen.state;
        if (state !== oldState) {
            const id = citizen.id;
            this.citizensLooking.delete(id);
            this.citizensRenting.delete(id);
            this.citizensOwningTheirHomes.delete(id);
            if (state === "looking") {
                this.citizensLooking.add(citizen.id);
                // this.setCitizenAims(citizen);
            }
            else if (state === "renting") {
                this.citizensRenting.add(citizen.id);
            }
            else if (state === "ownsHisHome") {
                this.citizensOwningTheirHomes.add(citizen.id);
            }
            else if (state === "removed") {
                // Requiescat in pace
                delete this.citizens[citizen.id];
            }
            else {
                console.warn("Unknown citizen state: " + state);
            }
            citizen.newState(state, this.tick);
        }
    }

    addHouse() {
        const house = new House(this.tick);
        console.log("Adding house " + house.id +" (" + house + ")");
        this.houses[house.id] = house;
        this.setHouseState(house, "forSale");
    }

    makeRentingContract(citizen, house, rentalDuration) {
        if (house.resident) {
            throw new Error("House is already occupied");
        }

        if (citizen.residence) {
            throw new Error("Citizen already has a home");
        }

        if (house.owner == null) {
            throw new Error("A house can not be rented unless it belongs to somebody");
        }

        citizen.residence = house;
        house.resident = citizen;

        house.rentalDuration = rentalDuration;
        house.rentalEnd = this.tick + rentalDuration;

        this.setHouseState(house, "rented");
        this.setCitizenState(citizen, "renting");

        this.housesRentedInTick.push(house);
    }

    endRentingContract(house) {
        const resident = house.resident;
        if (resident === null) {
            console.warn("endRentingContract for house " + house.id + " with no resident");
            return;
        }
        if (resident.state !== "renting") {
            console.warn("endRentingContract for not rented house " + house.id);
            return;
        }

        const citizen = house.resident;
        citizen.residence = null;

        house.resident = null;
        // house.rentalEnd = 0;

        this.setHouseState(house, "forSaleOrRent");
        this.setCitizenState(citizen, "looking");
    }

    randomLifeStartAge() {
        return betaSample(this.minStartLifeAge, this.maxStartLifeAge, this.meanStartLifeAge, this.dispersionStartLifeAge);
    }

    randomLifespan() {
        return betaSample(this.minLifespan, this.maxLifespan, this.meanLifespan, this.dispersionLifespan);
    }

    randomSalaryAt20() {
        return shiftedGammaSample(this.salaryAt20Min, this.salaryAt20Mean, this.salaryAt20Dispersion);
    }

    randomLifetimeSalaryGrowthFactor() {
        // console.log(`randomLifetimeSalaryGrowthFactor: ${this.lifetimeSalaryGrowthFactorMin}, ${this.lifetimeSalaryGrowthFactorMean}, ${this.lifetimeSalaryGrowthFactorDispersion}`);
        return shiftedGammaSample(this.lifetimeSalaryGrowthFactorMin, this.lifetimeSalaryGrowthFactorMean, this.lifetimeSalaryGrowthFactorDispersion);
    }

    randomCostOfLivingBase() {
        return shiftedGammaSample(0, this.costOfLivingBase, this.costOfLivingDispersion);
    }

    randomCostOfLivingSalaryFactor() {
        return betaSample(0, 1, this.costOfLivingSalaryFactor, this.costOfLivingDispersion);
    }

    randomSurplusSavingRate() {
        return betaSample(0, 1, this.surplusSavingRateMean, this.surplusSavingRateDispersion);
    }

    randomRentalInvestmentRate() {
        return betaSample(0, 1, this.rentalInvestmentRateMean, this.rentalInvestmentRateDispersion);
    }

    randomCitizenLifePeriod() {
        while (true) {
            const lifeStartAge = Math.round(this.randomLifeStartAge(this.minStartLifeAge, this.maxStartLifeAge, this.meanStartLifeAge, this.dispersionStartLifeAge));
            const lifespan = Math.round(this.randomLifespan(this.minLifespan, this.maxLifespan, this.meanLifespan, this.dispersionLifespan));

            if (lifeStartAge < lifespan) {
                return [lifeStartAge, lifespan];
            }
        }
    }

    addCitizen() {
        let [lifeStartAge, lifespan] = this.randomCitizenLifePeriod();
        if (this.tick <= 1) {
            lifeStartAge += Math.round(Math.random() * (lifespan - lifeStartAge));
        }
        const salaryAt20 = this.randomSalaryAt20();
        const lifetimeSalaryGrowthFactor = this.randomLifetimeSalaryGrowthFactor();
        const costOfLivingBase = this.randomCostOfLivingBase();
        const costOfLivingSalaryFactor = this.randomCostOfLivingSalaryFactor();
        const rentAffordabilityRatio = betaSample(0, 1, this.rentAffordabilityRatioMean, this.rentAffordabilityRatioDispersion);
        const mortgageAffordabilityRatio = betaSample(0, 1, this.mortgageAffordabilityRatioMean, this.mortgageAffordabilityRatioDispersion);
        const surplusSavingRate = shiftedGammaSample(0, this.surplusSavingRateMean, this.surplusSavingRateDispersion);
        const rentalInvestmentRate = shiftedGammaSample(0, this.rentalInvestmentRateMean, this.rentalInvestmentRateDispersion);
        const homeBuyingAge = shiftedGammaSample(18*52, this.homeBuyingAgeMean, this.homeBuyingAgeDispersion);
        const citizen = new Citizen(this.tick, lifeStartAge, lifespan, this.retirementAge,
                                    salaryAt20, lifetimeSalaryGrowthFactor,
                                    costOfLivingBase, costOfLivingSalaryFactor,
                                    rentAffordabilityRatio, mortgageAffordabilityRatio,
                                    surplusSavingRate, rentalInvestmentRate,
                                    homeBuyingAge);
        this.citizens[citizen.id] = citizen;
        this.setCitizenState(citizen, "looking");
        this.updateCitizenMoneys(citizen);
    }

    buyHouse(citizen, house) {
        if (house.state !== "forSale" && house.state !== "forSaleOrRent") {
            console.warn("House is not for sale");
            return;
        }
        const price = house.salePrice;
        const [fullPrice, mortgage, mortgagePayment, mortgageDuration] = this.computeBuyOperation(price, citizen.savings, this.tick - citizen.lifeStart);

        // console.log(`buyHouse: citizen: ${citizen.id}, house: ${house.id}, price: ${price}, fullPrice: ${fullPrice}, mortgage: ${mortgage}, mortgagePayment: ${mortgagePayment}, mortgageDuration: ${mortgageDuration}, savings: ${citizen.savings}, available for mortgage: ${citizen.salaryAvailableForMortgage}, workingEnd: ${citizen.workingEnd}, tick: ${this.tick}`);

        if (mortgagePayment > 0) {
            house.mortgagePayment = mortgagePayment;
            house.mortgageEnd = this.tick + mortgageDuration;
            citizen.savings = 0;
        }
        else {
            house.mortgagePayment = 0;
            house.mortgageEnd = 0;
            citizen.savings -= fullPrice;
        }

        if (house.owner !== null) {
            this.disownHouse(house);
        }

        citizen.ownedHouses.push(house);
        house.owner = citizen;
        house.lastBuyPrice = price;
        house.lastFullBuyPrice = fullPrice;
        this.setHouseState(house, "forSaleOrRent");
        this.housesBoughtInTick.push(house);

        // console.log(`house bought: citizen: ${citizen.id}, house: ${house.id}, price: ${price}, mortgage: ${mortgage}, mortgagePayment: ${house.mortgagePayment}, lastBuyPrice: ${house.lastBuyPrice}, lastFullBuyPrice: ${house.lastFullBuyPrice}, savings: ${citizen.savings}, ownedHouses: ${citizen.ownedHouses.length}`);
    }

    ownerMovesIn(citizen) {
        if (citizen.ownedHouses.length === 0) {
            console.warn("Citizen has no house to move into");
            return;
        }

        let freeHouseIx = citizen.ownedHouses.findIndex(h => h.resident === null);
        if (freeHouseIx == -1) {
            this.endRentingContract(citizen.ownedHouses[0]);
            freeHouseIx = 0;
        }

        const house = citizen.ownedHouses[freeHouseIx];
        house.resident = citizen;
        citizen.residence = house;
        this.setHouseState(house, "occupiedByOwner");
        this.setCitizenState(citizen, "ownsHisHome");
    }

    ownerMovesOut(citizen) {
        if (citizen.state !== "ownsHisHome") {
            console.warn("Citizen does not live in his own house");
            return;
        }

        const house = citizen.residence;
        const owner = house.owner;
        if (house.state !== "occupiedByOwner" || owner !== citizen) {
            console.warn("Inconsidtent home/citizen states: house id:" + house.id + ", state: " + house.state + "; citizen id: " + citizen.id + ", state: " + citizen.state + "; owner id: " + owner.id);
            return;
        }

        house.resident = null;
        citizen.residence = null;
        this.setHouseState(house, "forSaleOrRent");
        this.setCitizenState(citizen, "looking");
    }

    disownHouse(house) {
        const owner = house.owner;
        if (owner === null) {
            console.warn("Can't disown house " + house.id + ", it does not have an owner");
            return;
        }

        const len = owner.ownedHouses.length;
        owner.ownedHouses = owner.ownedHouses.filter(ownedHouse => ownedHouse !== house);
        if (len !== owner.ownedHouses.length + 1) {
            console.warn("Mismatch in number of owned houses after disowning house, remaining owned houses: " + owner.ownedHouses.length + " expected: " + (len - 1));
        }

        if (house.state == "occupiedByOwner") {
            this.ownerMovesOut(owner);
            if (owner.ownedHouses.length > 0) {
                this.ownerMovesIn(owner);
            }
        }
        else if (house.state == "rented") {
            this.endRentingContract(house);
        }

        house.owner = null;
        this.setHouseState(house, "forSale");
    }

    rmHouse(house) {
        const state = house.state;
        if (house.owner) {
            this.disownHouse(house);
        }
        this.setHouseState(house, "removed");
    }

    rmCitizen(citizen) {
        console.log("Removing citizen " + citizen.id + " (" + citizen + ")");
        if (citizen.state === "renting") {
            this.endRentingContract(citizen.residence);
        }
        else if (citizen.state === "ownsHisHome") {
            this.ownerMovesOut(citizen);
        }

        for (const house of citizen.ownedHouses) {
            this.disownHouse(house);
        }

        this.setCitizenState(citizen, "removed");
    }

    adjustPopulation() {
        const diff = this.nCitizens - Object.keys(this.citizens).length;
        if (diff !== 0) {
            console.log(`adjustPopulation: diff: ${diff}, nCitizens: ${this.nCitizens}, current: ${Object.keys(this.citizens).length}`);
            if (diff > 0) {
                for (let i = 0; i < diff; i++) {
                    this.addCitizen();
                }
            }
            else {
                const citizens = Object.values(this.citizens)
                shuffleAndTakeN(citizens, -diff)
                // console.log("Removing citizens: " + citizens.map(c => c.id));
                for (const citizen of citizens) {
                    // console.log("Removing citizen " + citizen.id);
                    this.rmCitizen(citizen);
                }
            }
        }
    }

    addNHouses(newHouses) {
        for (let i = 0; i < newHouses; i++) { this.addHouse() }
    }

    adjustHousing() {
        const diff = this.nHouses - Object.keys(this.houses).length;
        if (diff !== 0) {
            console.log(`adjustHousing: diff: ${diff}, nHouses: ${this.nHouses}, current: ${Object.keys(this.houses).length}`);
            if (diff > 0) {
                // console.log("Adding " + diff + " houses");
                this.addNHouses(diff);
            }
            else {
                const rmHouses = Object.values(this.houses);
                shuffleAndTakeN(rmHouses, -diff);
                for (const house of rmHouses) {
                    this.rmHouse(house);
                }
            }
        }
    }

    randomRentalDuration() {
        return shiftedGammaSample(0, this.rentalDurationMean, this.rentalDurationDispersion);
    }

    opEndRentals() {
        let count = 0;
        for (const houseId of this.housesRented) {
            const house = this.houses[houseId];
            if (house.rentalEnd <= this.tick) {
                this.endRentingContract(house);
                count += 1;
            }
        }
        console.log(`opEndRentals: ended ${count} rental contracts at tick ${this.tick}`);
    }

    pickBestHouseN(housesAvailableIds, n, priceFunc, log=false) {
        const n1 = Math.min(housesAvailableIds.length, n);
        shuffleN(housesAvailableIds, n1);
        let bestIx = null;
        let bestPrice = Infinity;
        const prices = []
        for (let ix = 0; ix < n1; ix++) {
            const altPrice = priceFunc(this.houses[housesAvailableIds[ix]]);
            prices.push(altPrice);
            if (altPrice < bestPrice) {
                bestIx = ix;
                bestPrice = altPrice;
            }
        }
        const bestHouse = (bestIx !== null) ? this.houses[housesAvailableIds[bestIx]] : null;
        if (log) {
            const sortedPrices = prices.slice().sort((a, b) => a - b);
            console.log(`best house: ${bestHouse ? bestHouse.id : "none"}, price: ${bestPrice}, n: ${n}, n1: ${n1}, prices: ${sortedPrices}`);
        }
        return [bestIx, bestHouse, bestPrice];
    }

    computeBuyOperation(housePrice, savings, age) {
        // console.log(`computeBuyOperation: housePrice: ${housePrice}, savings: ${savings}, age: ${age}, buyingTaxes: ${this.buyingTaxes}, fixedBuyingCosts: ${this.fixedBuyingCosts}, mortgageRate: ${this.mortgageRate}, maxMortgageAge: ${this.maxMortgageAge}, maxMortgageDuration: ${this.maxMortgageDuration}`);
        if (isFinite(housePrice) && isFinite(savings)) {
            const fullPrice = housePrice * (1 + this.buyingTaxes) + this.fixedBuyingCosts;
            const mortgage = Math.max(0, fullPrice - savings);
            if (mortgage <= 0) {
                return [fullPrice, 0, 0, 0];
            }
            const numberOfPayments = Math.min(this.maxMortgageAge - age, this.maxMortgageDuration);
            if (numberOfPayments > 0) {
                const mortgagePayment = computeWeeklyMortgagePayment(mortgage, this.mortgageRate, numberOfPayments);
                // console.log(`computeBuyOperation: fullPrice: ${fullPrice}, mortgage: ${mortgage}, mortgagePayment: ${mortgagePayment}, numberOfPayments: ${numberOfPayments}`);
                return [fullPrice, mortgage, mortgagePayment, numberOfPayments];
            }
        }
        return [Infinity, Infinity, Infinity, Infinity];
    }

    opCitizensRent() {
        const houseIds = Array.from(this.housesForRent);

        const citizens = Object.values(this.citizens);
        shuffle(citizens);
        for (const citizen of citizens) {
            if ((citizen.state === "looking") || (citizen.state === "renting")) {
                const [houseIdsIx, house, price] = this.pickBestHouseN(houseIds, this.housesConsideredPerStep, (house) => house.rentPrice, false);
                // console.log(`best house for renting: ${house ? house.id : "none"}, house state: ${house ? house.state : "none"} price: ${price}, citizen: ${citizen.id}, salary: ${citizen.salary}, salaryAvailableForRent: ${citizen.salaryAvailableForRent}, citizen state: ${citizen.state}, rent: ${citizen.salaryAvailableForRent >= price}`);
                if (house && (citizen.salaryAvailableForRent >= price)) {
                    if (citizen.residence) {
                        if (citizen.residence.rentPrice * 0.95 < price) {
                            continue
                        }
                        this.endRentingContract(citizen.residence);
                    }
                    this.makeRentingContract(citizen, house, this.randomRentalDuration());
                    arrayRemoveAt(houseIds, houseIdsIx);
                }
            }
        }
    }

    opCitizensBuy() {
        const houseIds = Array.from(this.housesForSale);

        // If can find house for sale at a good price it buys it. Otherwise it rents.
        // TODO:
        // - Degree of stability: the more stability, the higher the probability of buying
        // - Savings. Money saved. / degree of savings ability.
        // - Salary
        // - Desperation. Time searching for a house.
        // - Determination in searching for a house. Depends on the time spent searching and age.
        // - Percentage of salary they are willing to spend on the house.

        const citizens = Object.values(this.citizens);
        shuffle(citizens);
        for (const citizen of citizens) {
            if (citizen.homeBuyingTick > this.tick) {
                continue
            }
            const [houseIdsIx, house, price] = this.pickBestHouseN(houseIds, this.housesConsideredPerStep, (house) => house.salePrice);
            if (house) {
                let availableForMortgagePayment;
                let availableSavings;
                if (citizen.state === "ownsHisHome") {
                    availableForMortgagePayment = this.citizenNetIncome(citizen) * citizen.rentalInvestmentRate;
                    availableSavings = citizen.savings * citizen.rentalInvestmentRate;
                }
                else {
                    availableForMortgagePayment = citizen.salaryAvailableForMortgage;
                    availableSavings = citizen.savings;
                }

                const [fullPrice, mortgage, mortgagePayment] = this.computeBuyOperation(price, availableSavings, this.tick - citizen.lifeStart);

                // console.log(`house price: ${price}, availableForMortgagePayment: ${availableForMortgagePayment}, availableSavings: ${availableSavings}, citizen: ${citizen.id}, state: ${citizen.state}, citizen.workingEnd: ${citizen.workingEnd}, tick: ${this.tick},fullPrice: ${fullPrice}, mortgage: ${mortgage}, mortgagePayment: ${mortgagePayment}`);

                if ((fullPrice - availableSavings) / price > this.maxMortgageLoanToValue) {
                    continue;
                }

                if (mortgagePayment <= availableForMortgagePayment) {
                    if (citizen.state === "ownsHisHome") {
                        const expectedRentPrice = this.currentRentPrice;
                        if (expectedRentPrice !== null) {
                            const excessYield = (expectedRentPrice * 52) / fullPrice - this.moneyDepositRate;
                            if (excessYield < 0.01) {
                                continue
                            }
                        }
                    }
                    else if (citizen.state === "renting") {
                        if (mortgagePayment * this.mortgageWeight > citizen.residence.rentPrice) {
                            continue; // We prefer renting!
                        }
                        this.endRentingContract(citizen.residence);
                    }
                    this.buyHouse(citizen, house);
                    if (citizen.state !== "ownsHisHome") {
                        this.ownerMovesIn(citizen);
                    }

                    arrayRemoveAt(houseIds, houseIdsIx);
                }
            }
        }
    }

    amortizedMean(oldValue, oldWeight, amortizationFactor, values, cb) {
        let sum = 0;
        let count = 0;
        let vs = [];
        for (const value of values) {
            const v = cb(value);
            if (v !== null) {
                sum += v;
                count += 1;
                vs.push(v);
            }
        }
        if (count > 0) {
            const amortizedOldWeight = oldWeight * amortizationFactor;
            const newWeight = count + amortizedOldWeight;
            const mean = (amortizedOldWeight * (oldValue||0) + sum) / newWeight;
            // console.log(`amortizedMean: oldValue: ${oldValue}, oldWeight: ${oldWeight}, amortizationFactor: ${amortizationFactor}, sum: ${sum}, count: ${count}, newWeight: ${newWeight}, mean: ${mean}, vs: ${vs}`);
            return [mean, newWeight];
        }
        return [oldValue, oldWeight];
    }

    updateCitizenMoneys(citizen) {
        const salary = this.computeCitizenSalary(citizen);
        const costOfLiving = Math.min(salary, citizen.costOfLivingBase + (salary - citizen.costOfLivingBase) * citizen.costOfLivingSalaryFactor);
        const salaryAvailableForRent = (salary - costOfLiving) * citizen.rentalAffordabilityRatio;
        const salaryAvailableForMortgage = (salary - costOfLiving) * citizen.mortgageAffordabilityRatio;

        citizen.salary = salary;
        citizen.costOfLiving = costOfLiving;
        citizen.salaryAvailableForRent = salaryAvailableForRent;
        citizen.salaryAvailableForMortgage = salaryAvailableForMortgage;
    }

    opUpdateCitizenMoneys() {
        const citizens = Object.values(this.citizens);
        for (const citizen of citizens) {
            this.updateCitizenMoneys(citizen);
        }
    }

    opRentMetrics() {
        const oldRentPrice = this.currentRentPrice;
        const oldRentPriceWeight = this.currentRentPriceWeight;
        [this.currentRentPrice, this.currentRentPriceWeight] = this.amortizedMean(this.currentRentPrice, this.currentRentPriceWeight,
                                                                                  this.currentRentPriceAmortizationFactor,
                                                                                  this.housesRentedInTick, (house) => house.rentPrice);
        console.log(`opRentMetrics: oldRentPrice: ${oldRentPrice}, currentRentPrice: ${this.currentRentPrice}, oldRentPriceWeight: ${oldRentPriceWeight}, currentRentPriceWeight: ${this.currentRentPriceWeight}, currentRentPriceAmortizationFactor: ${this.currentRentPriceAmortizationFactor}, housesRentedInTick: ${this.housesRentedInTick.length}/${this.housesRented.size}`);
    }

    opBuyMetrics() {
        [this.currentSalePrice, this.currentSalePriceWeight] = this.amortizedMean(this.currentSalePrice, this.currentSalePriceWeight,
                                                                                  this.currentSalePriceAmortizationFactor,
                                                                                  this.housesBoughtInTick, (house) => house.lastBuyPrice);
    }

    updateRentPrice(house) {
        const newPrice = house.rentPrice * (1.0 - this.rentPriceDrop);

        // console.log(`House ${house.id}, current rent price: ${house.rentPrice}, next price: ${newPrice}, amortized maintenance cost: ${this.houseAmortizedMaintenanceCost}`);
        if (newPrice > this.houseAmortizedMaintenanceCost) {
            house.rentPrice = newPrice;
        }
    }

    updateSalePrice(house) {
        const oldPrice = house.salePrice;
        house.salePrice = Math.max(1, house.salePrice * (1 - this.salePriceDrop));
        // console.log(`updateSalePrice: House ${house.id}, old salePrice: ${oldPrice}, salePrice: ${house.salePrice}`);
    }

    opUpdatePrices() {
        this.housesForRent.forEach((houseId) => { this.updateRentPrice(this.houses[houseId]) });
        this.housesForSale.forEach((houseId) => { this.updateSalePrice(this.houses[houseId]) });
    }

    computeCitizenSalary(citizen) {
        const salaryAt20 = citizen.salaryAt20;
        const salaryGrowthFactor = citizen.lifetimeSalaryGrowthFactor;
        const salaryAtTheEnd = salaryAt20 * salaryGrowthFactor;

        if (citizen.workingEnd < this.tick) {
            return salaryAtTheEnd * this.afterRetirementSalaryFactorMean;
        }

        const remaining = citizen.workingEnd - this.tick;
        const span = this.retirementAge - 20 * 52;
        const gone = span - remaining;

        const salary = (salaryAtTheEnd * gone + salaryAt20 * remaining) / Math.max(1, span);

        //console.log(`citizen: ${citizen.id}, salaryAt20: ${salaryAt20}, salaryGrowthFactor: ${salaryGrowthFactor}, salaryAtTheEnd: ${salaryAtTheEnd}, workingEnd: ${citizen.workingEnd}, tick: ${this.tick}, remaining: ${remaining}, span: ${span}, gone: ${gone}, salary: ${salary}`);

        return salary;
    }

    citizenNetIncome(citizen) {
        const currentSalary = citizen.salary;
        const costOfLiving = citizen.costOfLiving;
        let netIncome = currentSalary - costOfLiving;
        if (citizen.state === "renting") {
            netIncome -= citizen.residence.rentPrice;
        }
        else if (citizen.state === "looking") {
            netIncome -= Math.min(this.currentRentPrice * this.nextCityRentPriceRatio, citizen.salaryAvailableForRent);
        }
        for (const house of citizen.ownedHouses) {
            netIncome -= this.houseAmortizedMaintenanceCost;
            if (house.mortgageEnd <= this.tick) {
                netIncome -= house.mortgagePayment;
            }
            if (house.resident && house.resident !== citizen) {
                netIncome += house.rentPrice;
            }
        }
        return netIncome;
    }

    opCitizensDie() {
        const citizens = Object.values(this.citizens);
        //const endTicks = citizens.map(citizen => citizen.lifeEnd).sort((a, b) => a - b);
        //console.log(`opCitizensDie: checking for dead citizens at tick ${this.tick}, next ticks: ${endTicks}`);

        for (const citizen of citizens) {
            const lifeEnd = citizen.lifeEnd;
            if (citizen.lifeEnd < this.tick) {
                // console.log(`Citizen ${citizen.id} has died at tick ${this.tick}`);
                this.rmCitizen(citizen);
            }
        }
    }

    opSavings() {
        const citizens = Object.values(this.citizens);
        for (const citizen of citizens) {
            const netIncome = this.citizenNetIncome(citizen);
            if (netIncome > 0) {
                const oldSavings = citizen.savings;
                citizen.savings += netIncome * citizen.surplusSavingRate;
                // console.log(`opSavings: citizen: ${citizen.id}, netIncome: ${netIncome}, surplusSavingRate: ${citizen.surplusSavingRate}, savings: ${oldSavings} -> ${citizen.savings}`);
            }
        }
    }

    opExternalMetrics() {
    }

    step() {
        this.tick += 1;

        this.adjustHousing();
        this.adjustPopulation();
        this.opEndRentals();

        this.opUpdateCitizenMoneys();

        this.housesBoughtInTick = [];
        this.opCitizensRent();
        this.opRentMetrics();

        this.housesRentedInTick = [];
        this.opCitizensBuy();
        this.opBuyMetrics();

        this.opCitizensDie();

        this.opUpdatePrices();
        this.opSavings();
        this.opExternalMetrics();
    }


}

class History {
    constructor() {
        this.ticks = [];
        this.times = [];
        this.housesAll = [];
        this.housesForRent = [];
        this.housesForSale = [];
        this.housesRented = [];
        this.housesOccupiedByOwner = [];

        this.citizensAll = [];
        this.citizensLooking = [];
        this.citizensRenting = [];
        this.citizensOwningTheirHomes = [];

        this.meanSalaryAll = [];
        this.meanSalaryRenting = [];
        this.meanSalaryLooking = [];
        this.meanSalaryOwningTheirHomes = [];
        this.meanSalaryAvailableForHome = []

        this.meanRentPriceHousesAll = [];
        this.meanRentPriceHousesForRent = [];
        this.meanRentPriceHousesRented = [];
        this.meanRentPriceHousesRentedInTick = [];
        this.currentRentPrice = [];
        this.meanSalePriceMortgagePayment = [];

        this.meanSalePrice = [];
        this.meanSalePriceInTick = [];
        this.currentSalePrice = [];

        this.houseVacantTime = [];

        this.inTickRentPrice = [];
        this.inTickSalePrice = [];
        this.inTickAvailableForRent = [];
        this.inTickLookingTime = [];
        this.inTickVacantTime = [];
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

        this.housesAll.push(model.houses.length);
        this.housesForRent.push(model.housesForRent.size);
        this.housesForSale.push(model.housesForSale.size);
        this.housesRented.push(model.housesRented.size);
        this.housesOccupiedByOwner.push(model.housesOccupiedByOwner.size);

        this.citizensAll.push(model.citizens.length);
        this.citizensLooking.push(model.citizensLooking.size);
        this.citizensRenting.push(model.citizensRenting.size);
        this.citizensOwningTheirHomes.push(model.citizensOwningTheirHomes.size);

        const meanRentPriceHousesForRent = mapAndMean(model.housesForRent, (houseId) => houses[houseId].rentPrice);
        this.meanRentPriceHousesForRent.push(weeklyToMonthlyRent(meanRentPriceHousesForRent));

        const meanRentPriceHousesRented = mapAndMean(model.housesRented, (houseId) => houses[houseId].rentPrice);
        this.meanRentPriceHousesRented.push(weeklyToMonthlyRent(meanRentPriceHousesRented));

        const meanRentPriceHousesAll =
              ( meanRentPriceHousesForRent * model.housesForRent.length +
                meanRentPriceHousesRented * model.housesRented.length ) /
              ( model.housesForRent.length + model.housesRented.length );
        this.meanRentPriceHousesAll.push(weeklyToMonthlyRent(meanRentPriceHousesAll));

        this.meanRentPriceHousesRentedInTick.push(mapAndMean(model.housesRentedInTick, (house) => house.rentPrice));
        this.currentRentPrice.push(weeklyToMonthlyRent(model.currentRentPrice));

        const meanSalePrice = mapAndMean(model.housesForSale, (houseId) => houses[houseId].salePrice);
        this.meanSalePrice.push(meanSalePrice);
        this.meanSalePriceInTick.push(mapAndMean(model.housesBoughtInTick, (house) => house.salePrice));
        this.currentSalePrice.push(model.currentSalePrice);

        const mortgagePayment = computeWeeklyMortgagePayment(model.currentSalePrice, model.mortgageRate, model.maxMortgageDuration);
        this.meanSalePriceMortgagePayment.push(weeklyToMonthlyRent(mortgagePayment));
        console.log(`equivalent mortgagePayment: ${mortgagePayment}, currentSalePrice: ${model.currentSalePrice}, mortgageRate: ${model.mortgageRate}, maxMortgageDuration: ${model.maxMortgageDuration}`);

        const meanSalaryRentingMean = mapAndMean(model.citizensRenting, (citizenId) => citizens[citizenId].salary);
        const meanSalaryLookingMean = mapAndMean(model.citizensLooking, (citizenId) => citizens[citizenId].salary);
        const meanSalaryOwningTheirHomesMean = mapAndMean(model.citizensOwningTheirHomes, (citizenId) => citizens[citizenId].salary);

        const rentingN = model.citizensRenting.size;
        const lookingN = model.citizensLooking.size;
        const owningN = model.citizensOwningTheirHomes.size;

        const meanSalaryAllMean = ((meanSalaryRentingMean || 0) * rentingN +
                                   (meanSalaryLookingMean || 0) * lookingN +
                                   (meanSalaryOwningTheirHomesMean || 0) * owningN) /
              (rentingN + lookingN + owningN);

        this.meanSalaryAll.push(weeklyToMonthlyRent(meanSalaryAllMean));
        this.meanSalaryRenting.push(weeklyToMonthlyRent(meanSalaryRentingMean));
        this.meanSalaryLooking.push(weeklyToMonthlyRent(meanSalaryLookingMean));
        this.meanSalaryOwningTheirHomes.push(weeklyToMonthlyRent(meanSalaryOwningTheirHomesMean));
        return;

        this.salaryAvailableForRentRenting.push(mapAndMean(model.citizensRenting, (citizenId) => model.salaryAvailableForRent(citizens[citizenId])));
        this.salaryAvailableForRentLooking.push(mapAndMean(model.citizensLooking, (citizenId) => model.salaryAvailableForRent(citizens[citizenId])));



        this.houseVacantTime.push(mapAndMean(model.housesForRent, (houseId) => model.tick - houses[houseId].creationTick));

        this.inTickRent.push(mapAndMean(model.housesRentedInTick, (house) => house.rentPrice));
        this.inTickAvailableForRent.push(mapAndMean(model.housesRentedInTick, (house) => ((house.state === "rented") ? model.salaryAvailableForRent(house.resident) : null)));
        this.inTickVacantTime.push(mapAndMean(model.housesRentedInTick, (house) => house.vacantTime));
        this.inTickLookingTime.push(mapAndMean(model.housesRentedInTick, (house) => house.resident.lookingTime));



    }
}
