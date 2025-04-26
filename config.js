const config = {
    nRenters: {
        min: 0,
        max: 40000,
        default: 10000
    },
    nHouses: {
        min: 0,
        max: 40000,
        default: 10000
    },
    rentAffordability: {
        min: 0.0,
        max: 1.0,
        default: 0.4
    },
    costOfLiving: {
        min: 0,
        max: 10000,
        default: 1000
    },
    markup: {
        min: 0.0,
        max: 1.0,
        default: 0.2
    },
    priceDrop: {
        min: 0.0,
        max: 1.0,
        default: 0.02
    },
    housesPerStep: {
        min: 1,
        max: 50,
        default: 10
    },
    rentalDuration: {
        min: 0,
        max: 20*52,
        default: 5*52,
    },
    income: {
        min: 0,
        max: 10000,
        default: 2000
    },
    showLength: {
        min: 1,
        max: 40*52,
        default: 10*52,
    },
    updateSpeed: {
        min: 1,
        max: 8,
        default: 1
    }
};
