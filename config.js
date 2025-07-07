const config = {
    nCitizens: {
        min: 0,
        max: 20000,
        default: 5000,
    },
    nHouses: {
        min: 0,
        max: 20000,
        default: 4500,
    },
    rentAffordabilityRatioMean: {
        min: 0.0,
        max: 1.0,
        default: 0.3
    },
    rentAffordabilityRatioDispersion: {
        min: 0.0,
        max: 1.0,
        default: 0.2
    },
    mortgageAffordabilityRatioMean: {
        min: 0.0,
        max: 1.0,
        default: 0.4
    },
    mortgageAffordabilityRatioDispersion: {
        min: 0.0,
        max: 1.0,
        default: 0.2
    },
    costOfLivingBase: {
        min: 0,
        max: 10000 * 12 / 52,
        default: 600 * 12 / 52,
    },
    costOfLivingSalaryFactor: {
        min: 0.0,
        max: 1,
        default: 0.2,
    },
    costOfLivingDispersion: {
        min: 0.0,
        max: 1,
        default: 0.2,
    },
    saleMarkupMean: {
        min: 0.0,
        max: 1.0,
        default: 0.10
    },
    saleMarkupDispersion: {
        min: 0.0,
        max: 0.2,
        default: 0.05
    },
    salePriceDropMean: {
        min: 0.0 * 12,
        max: 0.5 * 12,
        default: 0.05 * 12,
    },
    salePriceDropDispersion: {
        min: 0.0,
        max: 0.2,
        default: 0.05
    },
    rentMarkupMean: {
        min: 0.0,
        max: 1.0,
        default: 0.10
    },
    rentMarkupDispersion: {
        min: 0.0,
        max: 0.2,
        default: 0.05
    },
    rentPriceDropMean: {
        min: 0.0 * 12,
        max: 0.5 * 12,
        default: 0.10 * 12
    },
    rentPriceDropDispersion: {
        min: 0.0,
        max: 0.2,
        default: 0.05
    },
    housesConsideredPerStep: {
        min: 1,
        max: 50,
        default: 25
    },
    rentalDurationMean: {
        min: 0,
        max: 20*52,
        default: 5*52,
    },
    rentalDurationDispersion: {
        min: 0.005,
        max: 0.330,
        default: 0.05,
    },
    showLength: {
        min: 52 / 2,
        max: 100*52,
        default: 10*52,
    },
    simulationSpeed: {
        min: 1,
        max: 4,
        default: 1
    },
    lifespanMean: {
        min: 20 * 52,
        max: 100 * 52,
        default: 80 * 52,
    },
    lifespanDispersion: {
        min: 0.005,
        max: 0.330,
        default: 0.05,
    },
    lifeStartAgeMean: {
        min: 20 * 52,
        max: 100 * 52,
        default: 28 * 52,
    },
    lifeStartAgeDispersion: {
        min: 0.005,
        max: 0.330,
        default: 0.05,
    },

    retirementAge: {
        min: 20 * 52,
        max: 80 * 52,
        default: 68 * 52,
    },

    afterRetirementSalaryFactorMean: {
        min: 0.0,
        max: 1.0,
        default: 0.8,
    },
    lifetimeSalaryGrowthFactorMean: {
        min: 1.0,
        max: 8.0,
        default: 2.0
    },
    lifetimeSalaryGrowthFactorDispersion: {
        min: 0.01,
        max: 1,
        default: 0.5,
    },
    salaryAt20Mean: {
        min: 0,
        max: 40000 / 52,
        default: 18000 / 52,
    },
    salaryAt20Dispersion: {
        min: 0.0,
        max: 2.0,
        default: 0.4,
    },
    retirementAge: {
        min: 50 * 52,
        max: 100 * 52,
        default: 68 * 52
    },
    mortgageDuration: {
        min: 1,
        max: 30 * 52,
        default: 20 * 52
    },
    mortgageRate: {
        min: 0.0,
        max: 0.3,
        default: 0.035,
        step: 0.001
    },
    maxMortgageAge: {
        min: 50 * 52,
        max: 100 * 52,
        default: 75 * 52,
    },
    maxMortgageLoanToValue: {
        min: 0.0,
        max: 1.0,
        default: 0.8
    },
    surplusSavingRateMean: {
        min: 0.0,
        max: 1.0,
        default: 0.4
    },

    surplusSavingRateDispersion: {
        min: 0.0,
        max: 0.5,
        default: 0.2,
    },
    rentalInvestmentRateMean: {
        min: 0.0,
        max: 1.0,
        default: 0.4
    },
    rentalInvestmentRateDispersion: {
        min: 0.0,
        max: 1.0,
        default: 0.8
    },
    homeBuyingAgeMean: {
        min: 18 * 52,
        max: 80 * 52,
        default: 38 * 52
    },
    homeBuyingAgeDispersion: {
        min: 0.005,
        max: 0.50,
        default: 0.08
    },

    minAcceptableExcessYieldMean: {
        min: 0.0,
        max: 30,
        default: 0.02
    },
    minAcceptableExcessYieldDispersion: {
        min: 0.0,
        max: 1.0,
        default: 0.05
    },
    minSalePrice: {
        min: 0,
        max: 100000,
        default: 5000,
    },
    minRentPrice: {
        min: 0,
        max: 2000 * 12 / 52,
        default: 20 * 12 / 52,
    },
    houseConstructionCostMean: {
        min: 0,
        max: 1000000,
        default: 120000,
    },
    houseConstructionCostDispersion: {
        min: 0.0,
        max: 0.5,
        default: 0.1
    },
    renovationCostMean: {
        min: 0,
        max: 1000000,
        default: 60000,
    },
    renovationCostDispersion: {
        min: 0.0,
        max: 0.5,
        default: 0.1
    },
    houseMaintenanceCost: {
        min: 0,
        max: 200000 / 52,
        default: 2000 / 52,
    },
};
