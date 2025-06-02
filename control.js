
function percentToRatio(value) { return value / 100; }
function yearsToWeeks(value) { return value * 52; }
function yearlyToWeeklyRent(value) { return value / 52; }
function monthlyToWeeklyRent(value) { return value * 12 / 52; }

function ratioToPercent(value) { return value * 100; }
function weeksToYears(value) { return value / 52; }
function weeklyToYearlyRent(value) { return value * 52; }
function weeklyToMonthlyRent(value) { return value * 52 / 12; }

function roundTo(value, decimalPlaces) {
    const factor = Math.round(Math.pow(10, decimalPlaces)+0.1);
    return Math.round(value * factor) / factor;
}

function ensureNonEmptyNumericArrays(arrs) {
    return arrs.map(arr => arr.length > 0 ? arr : [NaN]);
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
        this.initDistributionGraphs();
        this.updateDistributionGraphs();
    }

    setParameter(key, value) {
        const methodName = 'set' + key.charAt(0).toUpperCase() + key.slice(1);
        if (this.hasOwnProperty(methodName)) {
            if (typeof this[methodName] !== 'function') {
                throw new Error(`Method ${methodName} is not a function on model.`);
            }
            this[methodName](value);
        }
        else if (this.hasOwnProperty(key)) {
            console.log(`Setting model property ${key} to ${value} (old value: ${this[key]})`);
            this[key] = value;
        }
        else {
            throw new Error(`Model does not have method or property ${methodName} or ${key}`);
        }
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
        this.bindWidgets(`control`, this);
        this.bindWidgets(`model`, this.model);
        this.parameterizeModelFromWidgets();
        this.initHistory();
        this.step();
    }

    initModel() {
        this.model = new HousingMarket();
        this.model.setParameter('lifespanMin', config.lifespanMean.min);
        this.model.setParameter('lifespanMax', config.lifespanMean.max);
        this.model.setParameter('lifeStartAgeMin', config.lifeStartAgeMean.min);
        this.model.setParameter('lifeStartAgeMax', config.lifeStartAgeMean.max);
        this.model.setParameter('salaryAt20Min', config.salaryAt20Mean.min);
        this.model.setParameter('lifetimeSalaryGrowthFactorMin', config.lifetimeSalaryGrowthFactorMean.min);
        this.model.setParameter('homeBuyingAgeMin', config.homeBuyingAgeMean.min);
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
            console.log("At step: " + this.model.tick);
        }
    }

    setWidgetDefaults() {
        const sliderElements = document.querySelectorAll('div[target-object] input[type="range"]');
        sliderElements.forEach(slider => {
            const key = slider.id;
            const normalizer = slider.dataset.normalizer;
            if (config[key]) {
                if (normalizer === 'percent') {
                    slider.min = ratioToPercent(config[key].min);
                    slider.max = ratioToPercent(config[key].max);
                    slider.value = ratioToPercent(config[key].default);
                    if (config[key].step) {
                        slider.step = ratioToPercent(config[key].step);
                    }
                } else if (normalizer === 'years') {
                    slider.min = weeksToYears(config[key].min);
                    slider.max = weeksToYears(config[key].max);
                    slider.value = weeksToYears(config[key].default);
                    if (config[key].step) {
                        slider.step = weeksToYears(config[key].step);
                    }
                } else if (normalizer === 'yearlyRent' ) {
                    slider.min = weeklyToYearlyRent(config[key].min);
                    slider.max = weeklyToYearlyRent(config[key].max);
                    slider.value = weeklyToYearlyRent(config[key].default);
                    if (config[key].step) {
                        slider.step = weeklyToYearlyRent(config[key].step);
                    }
                } else if (normalizer === 'monthlyRent') {
                    slider.min = weeklyToMonthlyRent(config[key].min);
                    slider.max = weeklyToMonthlyRent(config[key].max);
                    slider.value = weeklyToMonthlyRent(config[key].default);
                    if (config[key].step) {
                        slider.step = weeklyToMonthlyRent(config[key].step);
                    }
                } else {
                    slider.min = config[key].min;
                    slider.max = config[key].max;
                    slider.value = config[key].default;
                    if (config[key].step) {
                        slider.step = config[key].step;
                    }
                }
                console.log(`Slider for ${key}: min: ${slider.min}, max: ${slider.max}, value: ${slider.value}`);

                document.getElementById(`${key}Value`).textContent = slider.value;
            }
        });
    }

    parameterizeModelFromWidgets() {
        const sliderElements = document.querySelectorAll('div[target-object="model"] input[type="range"]');
        sliderElements.forEach(slider => {
            const key = slider.id;
            const normalizer = slider.dataset.normalizer;


            let value = parseFloat(slider.value);
            if (normalizer === 'percent') {
                value = percentToRatio(value);
            } else if (normalizer === 'years') {
                value = yearsToWeeks(value);
            } else if (normalizer === 'yearlyRent') {
                value = yearlyToWeeklyRent(value);
            } else if (normalizer === 'monthlyRent') {
                value = monthlyToWeeklyRent(value);
            }
            console.log("Setting " + key + " to " + value);
            this.model.setParameter(key, value);
        });
    }

    bindWidgets(targetName, targetObject) {
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

        const sliderElements = document.querySelectorAll(`div[target-object="${targetName}"] input[type="range"]`);
        // console.log("sliderElements: ", sliderElements);
        sliderElements.forEach(slider => {
            const key = slider.id;
            const normalizer = slider.dataset.normalizer;

            let normalizeFunc = v => v;
            if (normalizer === 'percent') {
                normalizeFunc = percentToRatio;
            } else if (normalizer === 'years') {
                normalizeFunc = yearsToWeeks;
            } else if (normalizer === 'yearlyRent') {
                normalizeFunc = yearlyToWeeklyRent;
            } else if (normalizer === 'monthlyRent') {
                normalizeFunc = monthlyToWeeklyRent;
            }

            function cb(v) {
                console.log(`calling $(targetName}.setParamter(${key}, ${v}) (targetObject: ${targetObject})`);
                targetObject.setParameter(key, v)
            }

            // bindSlider(key, `${key}Value`, v => targetObject[methodName](v), normalizeFunc);
            bindSlider(key, `${key}Value`, v => cb(v), normalizeFunc);

            if (slider.getAttribute('update-distributions') === 'true') {
                slider.addEventListener('input', () => {
                    this.updateDistributionGraphs();
                });
            }
        });
    }

    updateDisplay() {
        this.updateTexts();
        this.updateDistributionGraphs();
        this.updateGraphs();
    }

    updateTexts() {
        let model= this.model;
        let history = this.history;
        let housesForRent = model.housesForRent.size;

        document.getElementById('housesAll').textContent = model.nHouses;
        document.getElementById('housesForSale').textContent = model.housesForSale.size - housesForRent;
        document.getElementById('housesForRent').textContent = housesForRent;
        document.getElementById('housesRented').textContent = model.housesRented.size;
        document.getElementById('housesOccupiedByOwner').textContent = model.housesOccupiedByOwner.size;

        //        document.getElementById('rentPrice').textContent = roundTo(history.rentAll.at(-1), 2);
        document.getElementById('citizensAll').textContent = model.nCitizens;
        document.getElementById('citizensLooking').textContent = model.citizensLooking.size;
        //document.getElementById('citizensRenting').textContent = model.citizensRenting.size;
        //document.getElementById('citizensOwning').textContent = model.citizensOwningTheirHomes.size;
        //        document.getElementById('vacancyRate').textContent = roundTo(ratioToPercent(model.housesVacant.size / model.nHouses), 2);
        document.getElementById('lookingRate').textContent = roundTo(ratioToPercent(model.citizensLooking.size / model.nCitizens), 2);
        document.getElementById('inTickRentPrice').textContent = roundTo(history.inTickRentPrice.at(-1), 2);
    }

    initDistributionGraphs() {
        Plotly.newPlot('lifeDensities',
                       [{ x: [], y: [], type: 'scatter', mode: 'lines', name: 'Life start age' },
                        { x: [], y: [], type: 'scatter', mode: 'lines', name: 'Lifespan' }],
                       { margin: { l: 0, r: 0, t: 0, b: 20 }},
                       { displayModeBar: false,
                         displaylogo: false });

        Plotly.newPlot('salaryAt20Density',
                       [{ x: [], y: [], type: 'scatter', mode: 'lines', name: 'Salary at 20' }],
                       { margin: { l: 0, r: 0, t: 0, b: 20 }},
                       { displayModeBar: false,
                         displaylogo: false });

        Plotly.newPlot('lifetimeSalaryGrowthFactorDensity',
                       [{ x: [], y: [], type: 'scatter', mode: 'lines', name: 'Lifetime salary growth factor' }],
                       { margin: { l: 0, r: 0, t: 0, b: 20 }},
                       { displayModeBar: false,
                         displaylogo: false });

        Plotly.newPlot('surplusSavingRateDensity',
                       [{ x: [], y: [], type: 'scatter', mode: 'lines', name: 'Surplus saving rate' },
                        { x: [], y: [], type: 'scatter', mode: 'lines', name: 'Rental investment rate' }],
                       { margin: { l: 0, r: 0, t: 0, b: 20 }},
                       { displayModeBar: false,
                         displaylogo: false });

        Plotly.newPlot('homeBuyingAgeDensity',
                       [{ x: [], y: [], type: 'scatter', mode: 'lines', name: 'Home buying age' }],
                       { margin: { l: 0, r: 0, t: 0, b: 20 }},
                       { displayModeBar: false,
                         displaylogo: false });
    }

    updateDistributionGraphs() {
        const lifeStarAgeMeanSlider = document.getElementById('lifeStartAgeMean');
        const [lsaxs, lsays] = computeBetaPDF(parseFloat(lifeStarAgeMeanSlider.min),
                                              parseFloat(lifeStarAgeMeanSlider.max),
                                              parseFloat(lifeStarAgeMeanSlider.value),
                                              document.getElementById('lifeStartAgeDispersion').value / 100);

        const lifespanMeanSlider = document.getElementById('lifespanMean');
        const [lfxs, lfys] = computeBetaPDF(parseFloat(lifespanMeanSlider.min),
                                            parseFloat(lifespanMeanSlider.max),
                                            parseFloat(lifespanMeanSlider.value),
                                            document.getElementById('lifespanDispersion').value / 100);
        // console.log(`updating density graph: ${lsaxs}, ${lsays}, ${lfxs}, ${lfys}`);
        Plotly.update('lifeDensities', { x: [lsaxs, lfxs], y: [lsays, lfys] });

        const salaryAt20MeanSlider = document.getElementById('salaryAt20Mean');
        const [sa20xs, sa20ys] = computeShiftedGammaPDF(parseFloat(salaryAt20MeanSlider.min),
                                                        parseFloat(salaryAt20MeanSlider.max) * 1.5,
                                                        parseFloat(salaryAt20MeanSlider.value),
                                                        document.getElementById('salaryAt20Dispersion').value / 100);
        // console.log(`updating salaryAt20 graph: ${sa20xs}, ${sa20ys}`);
        Plotly.update('salaryAt20Density', { x: [sa20xs], y: [sa20ys] });

        const lifetimeSalaryGrowthFactorMeanSlider = document.getElementById('lifetimeSalaryGrowthFactorMean');
        const [xs, ys] = computeShiftedGammaPDF(parseFloat(lifetimeSalaryGrowthFactorMeanSlider.min) / 100,
                                                parseFloat(lifetimeSalaryGrowthFactorMeanSlider.max) / 100 * 1.5,
                                                parseFloat(lifetimeSalaryGrowthFactorMeanSlider.value) / 100,
                                                document.getElementById('lifetimeSalaryGrowthFactorDispersion').value / 100);
        // console.log(`updating lifetimeSalaryGrowthFactorDensity graph: ${xs}, ${ys}`);
        Plotly.update('lifetimeSalaryGrowthFactorDensity', { x: [xs], y: [ys] });

        const surplusSavingRateSlider = document.getElementById('surplusSavingRateMean');
        const [ssrsxs, ssrsys] = computeBetaPDF(0, 100, parseFloat(surplusSavingRateSlider.value),
                                                document.getElementById('surplusSavingRateDispersion').value / 100);
        const [rirxs, rirys] = computeBetaPDF(0, 100, parseFloat(document.getElementById('rentalInvestmentRateMean').value),
                                               document.getElementById('rentalInvestmentRateDispersion').value / 100);

        Plotly.update('surplusSavingRateDensity', { x: [ssrsxs, rirxs], y: [ssrsys, rirys] });

        const homeBuyingAgeMeanSlider = document.getElementById('homeBuyingAgeMean');
        const [hbaxs, hbays] = computeBetaPDF(parseFloat(homeBuyingAgeMeanSlider.min),
                                              parseFloat(homeBuyingAgeMeanSlider.max),
                                              parseFloat(homeBuyingAgeMeanSlider.value),
                                              document.getElementById('homeBuyingAgeDispersion').value / 100);
        Plotly.update('homeBuyingAgeDensity', { x: [hbaxs], y: [hbays] });
    }

    initGraphs() {
        Plotly.newPlot('housesVsTime', [{ x: [], y: [], mode: 'lines', name: 'Total Houses' },
                                        { x: [], y: [], mode: 'lines', name: 'Houses For Rent' },
                                        { x: [], y: [], mode: 'lines', name: 'Houses For Sale' },
                                        { x: [], y: [], mode: 'lines', name: 'Houses Rented' },
                                        { x: [], y: [], mode: 'lines', name: 'Houses Occupied By Owner' }],
                       { title: { text: 'Houses vs Time' },
                         xaxis: { title: 'Date' },
                         yaxis: { title: 'House Market', rangemode: 'tozero' } });

        Plotly.newPlot('citizensVsTime', [{ x: [], y: [], mode: 'lines', name: 'Total citizens' },
                                          { x: [], y: [], mode: 'lines', name: 'Citizens looking' },
                                          { x: [], y: [], mode: 'lines', name: 'Citizens renting' },
                                          { x: [], y: [], mode: 'lines', name: 'Citizens owning their homes' }],
                       { title: { text: 'Citizens vs Time' },
                         xaxis: { title: 'Date' },
                         yaxis: { title: 'Citizen Market', rangemode: 'tozero' } });

        Plotly.newPlot('rentPriceVsTime', [{ x: [], y: [], mode: 'lines', name: 'Mean all' },
                                           { x: [], y: [], mode: 'lines', name: 'Mean rented' },
                                           { x: [], y: [], mode: 'lines', name: 'Mean for rent' },
                                           { x: [], y: [], mode: 'lines', name: 'Mean just rented' },
                                           { x: [], y: [], mode: 'lines', name: 'Amortized mean rent prize' },
                                           { x: [], y: [], mode: 'lines', name: 'Mean sale price equivalent mortgage' }],
                       { title: { text: 'Rent Prices Vs Time' },
                         xaxis: { title: 'Date' },
                         yaxis: { title: 'Price', rangemode: 'tozero' } });

        Plotly.newPlot('salePriceVsTime', [{ x: [], y: [], mode: 'lines', name: 'Mean sale price' },
                                           { x: [], y: [], mode: 'lines', name: 'Mean just sold sale price' },
                                           { x: [], y: [], mode: 'lines', name: 'Amortized mean sale price' }],
                       { title: { text: 'Sale Prices Vs Time' },
                         xaxis: { title: 'Date' },
                         yaxis: { title: 'Price', rangemode: 'tozero' } });

        Plotly.newPlot('salaryVsTime', [{ x: [], y: [], mode: 'lines', name: 'Avg salary all citizens' },
                                        { x: [], y: [], mode: 'lines', name: 'Avg salary looking' },
                                        { x: [], y: [], mode: 'lines', name: 'Avg salary renting' },
                                        { x: [], y: [], mode: 'lines', name: 'Avg salary owning their homes' }],
                       { title: { text: 'Salary vs Time' },
                         xaxis: { title: 'Date' },
                         yaxis: { title: 'Salary', rangemode: 'tozero' } });

        Plotly.newPlot('vacantTime', [{ x: [], y: [], mode: 'lines', name: 'Avg house vacant time' },
                                      { x: [], y: [], mode: 'lines', name: 'Avg citizen looking time' }],
                       { title: { text: 'Looking/renting Times' },
                         xaxis: { title: 'Date' },
                         yaxis: { title: 'Weeks', rangemode: 'tozero' } });

        Plotly.newPlot('rentPriceHist', [{ x: [], type: 'histogram', name: 'RentPrice', xcalendar: 'gregorian'}],
                       { title: { text: 'Rent Price' }});

        Plotly.newPlot('rentLengthHist', [{x: [], type: 'histogram', name: 'RentLength', xcalendar: 'gregorian'}],
                       { title: { text: 'Rent Length (years)' }});

        const salaryXBins = { start: 0, end: 100000, size: 2500 };
        Plotly.newPlot('salaryHist', [{x: [], type: 'histogram', name: 'Looking for a home', xbins: salaryXBins, autobinx: false},
                                      {x: [], type: 'histogram', name: 'Renting their home', xbins: salaryXBins, autobinx: false},
                                      {x: [], type: 'histogram', name: 'Owning their home', xbins: salaryXBins, autobinx: false}],
                       { title: { text: 'Salary of citezens' },
                         barmode: 'stack',
                         xaxis: { 'type': 'linear' }});

        const ageXBins = { start: 25, end: 100, size: 2.5 };
        Plotly.newPlot('ageHist', [{x: [], type: 'histogram', name: 'Looking for a home', xbins: ageXBins, autobinx: false},
                                   {x: [], type: 'histogram', name: 'Renting their home', xbins: ageXBins,autobinx: false},
                                   {x: [], type: 'histogram', name: 'Owning their home', xbins: ageXBins, autobinx: false}],
                       { title: { text: 'Age of citizens' },
                         barmode: 'stack',
                         xaxis: { 'type': 'linear' }});

        // Plotly.newPlot('ownedHousesHist', [{x: [], type: 'histogram', name: 'Owned Houses' }],
        //                { title: 'Number of houses owned by citizen',
        //                  xbins: { start: -0.5, end: 10.5, size: 1 } });

        Plotly.newPlot('ownedHousesHist', [{x: [], y: [], type: 'bar', name: 'Owned Houses' }],
                       { title: { text: 'Number of houses owned by citizen'}});

        Plotly.newPlot('salaryVsAge', [{ x: [], y: [], type: 'scatter', mode: 'markers', marker: { size: 3 }, name: 'Looking for a home' },
                                       { x: [], y: [], type: 'scatter', mode: 'markers', marker: { size: 3 }, name: 'Renting their home' },
                                       { x: [], y: [], type: 'scatter', mode: 'markers', marker: { size: 3 }, name: 'Owning their home' }],
                       { title: { text: 'Salary vs Age' },
                         xaxis: { range: [Math.round(weeksToYears(config.lifeStartAgeMean.min)),
                                          Math.round(weeksToYears(config.lifespanMean.max * 1.1))],
                                  title: 'Age (years)' },
                         yaxis: { title: 'Salary (€)', rangemode: 'tozero' } });
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

        Plotly.update('housesVsTime', { x: [t, t, t, t, t],
                                        y: this.cutArgsToShowLength(h.housesAll, h.housesForRent, h.housesForSale, h.housesRented, h.housesOccupiedByOwner) });

        Plotly.update('citizensVsTime', { x: [t, t, t, t],
                                          y: this.cutArgsToShowLength(h.citizensAll, h.citizensLooking, h.citizensRenting, h.citizensOwningTheirHomes) });

        Plotly.update('rentPriceVsTime', { x: [t, t, t, t, t],
                                      y: this.cutArgsToShowLength(h.meanRentPriceHousesAll, h.meanRentPriceHousesRented, h.meanRentPriceHousesForRent,
                                                                  h.meanRentPriceHousesRentedInTick, h.currentRentPrice,
                                                                  h.meanSalePriceMortgagePayment) });

        Plotly.update('salePriceVsTime', { x: [t, t],
                                           y: this.cutArgsToShowLength(h.meanSalePrice, h.meanSalePriceInTick, h.currentSalePrice) });

        Plotly.update('salaryVsTime', { x: [t, t, t, t],
                                        y: this.cutArgsToShowLength(h.meanSalaryAll, h.meanSalaryLooking, h.meanSalaryRenting, h.meanSalaryOwningTheirHomes) });

        Plotly.update('vacantTime', { x: [t, t],
                                      y: this.cutArgsToShowLength(h.inTickVacantTime, h.inTickLookingTime) });

        Plotly.update('rentPriceHist', { x: [Object.values(m.houses).map((house) => house.rentPrice)] });
        Plotly.update('rentLengthHist', { x: [Array.from(m.housesRented, (houseId) => weeksToYears(m.houses[houseId].rentalDuration))] });
        Plotly.update('salaryHist', { x: ensureNonEmptyNumericArrays([Array.from(m.citizensLooking, (citizenId) => weeklyToYearlyRent(m.citizens[citizenId].salary)),
                                                                      Array.from(m.citizensRenting, (citizenId) => weeklyToYearlyRent(m.citizens[citizenId].salary)),
                                                                      Array.from(m.citizensOwningTheirHomes, (citizenId) => weeklyToYearlyRent(m.citizens[citizenId].salary))]) });

        Plotly.update('ageHist', { x: ensureNonEmptyNumericArrays([Array.from(m.citizensLooking, (citizenId) => weeksToYears(m.tick - m.citizens[citizenId].lifeStart)),
                                                                   Array.from(m.citizensRenting, (citizenId) => weeksToYears(m.tick - m.citizens[citizenId].lifeStart)),
                                                                   Array.from(m.citizensOwningTheirHomes, (citizenId) => weeksToYears(m.tick - m.citizens[citizenId].lifeStart))]) });


        const binCuts = [0, 1, 3, 6];
        const binMap = [];
        const binLabel = [];
        const xs = [];
        const binCount = [];
        let j = 0;
        for (let i = 0; i < binCuts.length; i++) {
            const cut = binCuts[i];
            xs.push(xs.length);
            binLabel.push((j === cut) ? cut : `${j}-${cut}`);
            binCount.push(0);
            for (; j <= cut; j++) {
                binMap.push(i);
            }
        }
        binCount.push(0);
        binLabel.push(`${j}+`);

        const allCounts = []

        for (const citizen of Object.values(m.citizens)) {
            allCounts.push(citizen.ownedHouses.length);
            const ix = (binMap[citizen.ownedHouses.length] ?? binCuts.length)
            binCount[ix]++;
        }

        // console.log(`binLabel: ${binLabel}, binMap: ${binMap}, binCount: ${binCount}, allCounts: ${allCounts}`);

        Plotly.update('ownedHousesHist', { x: [xs], y: [binCount] },
                      { xaxis: { tickvals: binLabel, ticktext: binLabel } });


        const citizensLooking = Array.from(m.citizensLooking, (citizenId) => m.citizens[citizenId]);
        const citizensRenting = Array.from(m.citizensRenting, (citizenId) => m.citizens[citizenId]);
        const citizensOwningTheirHomes = Array.from(m.citizensOwningTheirHomes, (citizenId) => m.citizens[citizenId]);
        Plotly.update('salaryVsAge', { x: [citizensLooking.map(c => weeksToYears(m.tick - c.lifeStart)),
                                           citizensRenting.map(c => weeksToYears(m.tick - c.lifeStart)),
                                           citizensOwningTheirHomes.map(c => weeksToYears(m.tick - c.lifeStart))],
                                       y: [citizensLooking.map(c => weeklyToYearlyRent(c.salary)),
                                           citizensRenting.map(c => weeklyToYearlyRent(c.salary)),
                                           citizensOwningTheirHomes.map(c => weeklyToYearlyRent(c.salary))] });
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
