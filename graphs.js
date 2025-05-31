function computeBetaPDF(min, max, mean, dispersion, steps = 200) {
    // console.log(`computeBetaPDF(${min}, ${max}, ${mean}, ${dispersion}, ${steps})`);
    if (mean < min || mean > max || dispersion < 0 || dispersion > 1) {
        throw new Error("Invalid parameters");
    }

    const mean01 = (mean - min) / (max - min);
    const factor = (1 - dispersion) / dispersion;
    const alpha = mean01 * factor;
    const beta = (1 - mean01) * factor;

    const xs = [];
    const ys = [];

    for (let i = 0; i <= steps; i++) {
        const x01 = i / steps;
        const xReal = min + x01 * (max - min);
        const y = jStat.beta.pdf(x01, alpha, beta);
        xs.push(xReal);
        ys.push(y);
    }

    return [xs, ys];
}

function computeShiftedGammaPDF(min, max, mean, dispersion, steps = 200) {
    // console.log(`computeShiftedGammaPDF(${min}, ${max}, ${mean}, ${dispersion}, ${steps})`);

    if (mean < min || mean > max || dispersion <= 0 || dispersion >= 1) {
        throw new Error("Invalid parameters");
    }

    // Convert dispersion to standard deviation relative to (mean - min)
    const std = dispersion * (mean - min);

    // Gamma parameters for variable x = value - min
    const k = Math.pow((mean - min) / std, 2);
    const theta = Math.pow(std, 2) / (mean - min);

    const xs = [];
    const ys = [];

    for (let i = 0; i <= steps; i++) {
        const xReal = min + (i / steps) * (max - min);
        const x = xReal - min;  // shift to match gamma PDF
        const y = jStat.gamma.pdf(x, k, theta);
        xs.push(xReal);
        ys.push(y);
    }

    return [xs, ys];
}
