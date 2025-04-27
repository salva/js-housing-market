
function percentToRatio(value) { return value / 100; }
function yearsToWeeks(value) { return value * 52; }
function ratioToPercent(value) { return value * 100; }
function weeksToYears(value) { return value / 52; }

function roundTo(value, decimalPlaces) {
    const factor = Math.round(Math.pow(10, decimalPlaces)+0.1);
    return Math.round(value * factor) / factor;
}

class Control {
    constructor() {}

    init() {
        this.showLength = config.showLength.default;
        this.simulationSpeed = config.simulationSpeed.default;
        
        this.initDisplayWidgets();
        this.setWidgetDefaults();
        this.resetButtonClicked()

        this.initGraphs();
    }

    initDisplayWidgets() {
        this.runButton = document.getElementById('runButton');
        this.pauseButton = document.getElementById('pauseButton');
        this.resetButton = document.getElementById('resetButton');

        this.runButton.addEventListener('click', () => this.runButtonClicked());
        this.pauseButton.addEventListener('click', () => this.pauseButtonClicked());
        this.resetButton.addEventListener('click', () => this.resetButtonClicked());
        console.log("Control: initDisplayWidgets done")
    }

    runButtonClicked() {
        this.state = "running";
        this.runButton.disabled = true;
        this.pauseButton.disabled = false;
        this.resetButton.disabled = false;
    }

    pauseButtonClicked() {
        this.state = "paused";
        this.runButton.disabled = false;
        this.pauseButton.disabled = true;
        this.resetButton.disabled = false;
    }

    resetButtonClicked() {
        this.state = "paused";
        this.runButton.disabled = false;
        this.pauseButton.disabled = true;
        this.resetButton.disabled = true;

        this.initModel();
        this.bindWidgets(`#simulation-box`, this.model);
        this.bindWidgets(`#display-box`, this);
        this.parameterizeModelFromWidgets();
        this.initHistory();
        this.step();
    }

    initModel() {
        this.model = new HousingMarket();
    }

    initHistory() {
        this.history = new History();
        this.history.init(this.model);
    }

    step() {
        if (this.state === "running") {
            for (let i = 0; i < this.simulationSpeed; i++) {
                this.model.step();
                this.history.push();
            }
            this.updateDisplay();
        }
    }

    setWidgetDefaults() {
        const sliderElements = document.querySelectorAll('#simulation-box input[type="range"], #display-box input[type="range"]')
        sliderElements.forEach(slider => {
            const key = slider.id;
            const normalizer = slider.dataset.normalizer;
            if (config[key]) {
                if (normalizer === 'percent') {
                    slider.min = ratioToPercent(config[key].min);
                    slider.max = ratioToPercent(config[key].max);
                    slider.value = ratioToPercent(config[key].default);
                } else if (normalizer === 'years') {
                    slider.min = weeksToYears(config[key].min);
                    slider.max = weeksToYears(config[key].max);
                    slider.value = weeksToYears(config[key].default);
                } else {
                    slider.min = config[key].min;
                    slider.max = config[key].max;
                    slider.value = config[key].default;
                }
                document.getElementById(`${key}Value`).textContent = slider.value;
            }
        });
    }

    parameterizeModelFromWidgets() {
        const sliderElements = document.querySelectorAll('#simulation-box input[type="range"]');
        sliderElements.forEach(slider => {
            const key = slider.id;
            const normalizer = slider.dataset.normalizer;
            const methodName = 'set' + key.charAt(0).toUpperCase() + key.slice(1);

            let value = parseFloat(slider.value);
            if (normalizer === 'percent') {
                value = percentToRatio(value);
            } else if (normalizer === 'years') {
                value = yearsToWeeks(value);
            }
            console.log("Setting " + key + " to " + value);
            this.model[methodName](value);
        });
    }

    bindWidgets(boxSelector, targetObject) {
        console.log("Control: bindSimulationWidgets");
        function bindSlider(sliderId, valueId, updateFunc, normalizeFunc = v => v) {
            const slider = document.getElementById(sliderId);
            const valueSpan = document.getElementById(valueId);
            slider.addEventListener('input', e => {
                valueSpan.textContent = e.target.value;
                valueSpan.classList.add('pending-change');
            });
            slider.addEventListener('change', e => {
                console.log("Updating value for " + sliderId + ": " + e.target.value);
                updateFunc(normalizeFunc(parseFloat(e.target.value)));
                valueSpan.classList.remove('pending-change');
            });
        }

        const sliderElements = document.querySelectorAll(`${boxSelector} input[type="range"]`);
        // console.log("sliderElements: ", sliderElements);
        sliderElements.forEach(slider => {
            const key = slider.id;
            const normalizer = slider.dataset.normalizer;
            const methodName = 'set' + key.charAt(0).toUpperCase() + key.slice(1);

            let normalizeFunc = v => v;
            if (normalizer === 'percent') {
                normalizeFunc = percentToRatio;
            } else if (normalizer === 'years') {
                normalizeFunc = yearsToWeeks;
            }

            console.log(`lookup, methodName: ${methodName}`);
            bindSlider(key, `${key}Value`, v => targetObject[methodName](v), normalizeFunc);
        });
    }

    updateDisplay() {
        this.updateTexts();
        this.updateGraphs();
    }

    updateTexts() {
        let model= this.model;
        let history = this.history;
        document.getElementById('housesAll').textContent = model.nHouses;
        document.getElementById('housesRented').textContent = model.housesRented.size;
        document.getElementById('housesVacant').textContent = model.housesVacant.size;
        document.getElementById('rentPrice').textContent = roundTo(history.rentAll.at(-1), 2);
        document.getElementById('rentersAll').textContent = model.nRenters;
        document.getElementById('rentersLooking').textContent = model.rentersLooking.size;
        document.getElementById('rentersRenting').textContent = model.rentersRenting.size;
        document.getElementById('vacancyRate').textContent = roundTo(ratioToPercent(model.housesVacant.size / model.nHouses), 2);
        document.getElementById('lookingRate').textContent = roundTo(ratioToPercent(model.rentersLooking.size / model.nRenters), 2);
        document.getElementById('inTickRentPrice').textContent = roundTo(history.inTickRentPrice.at(-1), 2);
    }

    initGraphs() {
        Plotly.newPlot('housesVsTime', [{ x: [], y: [], mode: 'lines', name: 'Total Houses' },
                                        { x: [], y: [], mode: 'lines', name: 'Rented Houses' },
                                        { x: [], y: [], mode: 'lines', name: 'Vacant Houses' }],
                       { title: 'Houses vs Time',
                         xaxis: { title: 'Date' },
                         yaxis: { title: 'House Market', rangemode: 'tozero' } });

        Plotly.newPlot('rentVsTime', [{ x: [], y: [], mode: 'lines', name: 'Avg all' },
                                      { x: [], y: [], mode: 'lines', name: 'Avg rented' },
                                      { x: [], y: [], mode: 'lines', name: 'Avg vacant' },
                                      { x: [], y: [], mode: 'lines', name: 'Avg just rented' },
                                      { x: [], y: [], mode: 'lines', name: 'Amortized rented' }],
                       { title: 'Rent Prices Vs Time',
                         xaxis: { title: 'Date' },
                         yaxis: { title: 'Price', rangemode: 'tozero' } });

        Plotly.newPlot('vacantTime', [{ x: [], y: [], mode: 'lines', name: 'Avg house vacant time' },
                                      { x: [], y: [], mode: 'lines', name: 'Avg renter looking time' }],
                       { title: 'Looking/renting Times',
                         xaxis: { title: 'Date' },
                         yaxis: { title: 'Weeks', rangemode: 'tozero' } });

        Plotly.newPlot('rentPriceHist', [{ x: [], type: 'histogram', name: 'RentPrice' }],
                       { title: 'Rent Price' });

        Plotly.newPlot('rentLengthHist', [{x: [], type: 'histogram', name: 'RentLength' }],
                       { title: 'Rent Length' })

        Plotly.newPlot('incomeHist', [{x: [], type: 'histogram', name: 'incomeRenting' },
                                      {x: [], type: 'histogram', name: 'incomeLooking' }],
                       { title: 'Income' });
    }

    cutToShowLength(arg) {
        return arg.slice(-this.showLength);
    }

    cutArgsToShowLength(...args) {
        return args.map((a) => this.cutToShowLength(a))
    }

    updateGraphs() {
        const m = this.model;
        const h = this.history;
        const t = this.cutToShowLength(h.times);

        Plotly.update('housesVsTime', { x: [t, t, t],
                                        y: this.cutArgsToShowLength(h.housesAll, h.housesRented, h.housesVacant) });

        Plotly.update('rentVsTime', { x: [t, t, t, t, t],
                                      y: this.cutArgsToShowLength(h.rentAll, h.rentRented, h.rentVacant, h.inTickRentPrice, h.currentRentPrice) });

        Plotly.update('vacantTime', { x: [t, t],
                                      y: this.cutArgsToShowLength(h.inTickVacantTime, h.inTickLookingTime) });

        Plotly.update('rentPriceHist', { x: [Object.values(m.houses).map((house) => house.rentPrice)] });
        Plotly.update('rentLengthHist', { x: [Array.from(m.housesRented, (houseId) => m.houses[houseId].rentingTime)] });
        Plotly.update('incomeHist', { x: [Array.from(m.rentersRenting, (renterId) => m.renterIncome(m.renters[renterId])),
                                          Array.from(m.rentersLooking, (renterId) => m.renterIncome(m.renters[renterId]))] });
    }

    // display callbacks

    setShowLength(weeks) {
        this.showLength = weeks;
        this.updateDisplay();
    }

    setSimulationSpeed(speed) {
        this.simulationSpeed = speed;
    }
}
