// Maps value from [s1-s2]-range into [t1-t2]-range
function map(s1, s2, t1, t2, s) {
    return t1 + (s - s1) / (s2 - s1) * (t2 - t1);
}

// The mandelbrot function
function mandel(x, y, max) {
    let n = 0
    let a = x
    let b = y
    while (n < max) {
        const a2 = a * a
        const b2 = b * b
        if (a2 + b2 > 4) return n
        b = 2 * a * b + y
        a = a2 - b2 + x
        n++
    }
    return n
}

// Applies histogram equalization to given array of n-values, with max as maximum value
function normalize(ns, max) {
    const hist = new Array(max).fill(0)
    ns.filter(n => n < max).forEach(n => hist[n]++)
    
    const cumul = new Array(max).fill(0)
    cumul[0] = hist[0]
    for (let i = 1; i < max; i++) {
        cumul[i] = cumul[i - 1] + hist[i]
    }

    const div=cumul[cumul.length-1] / max
    return ns.map(n => (n === max) ? max : Math.ceil(cumul[n] / div))
}

// Convert a hue-value into rgb (color palette)
function toRgb(h) {
    const f = (n) => {
        const k = (n + h / 60) % 6
        return 1 - Math.max(Math.min(k, 4 - k, 1), 0)
    }
    return [f(5), f(3), f(1)];
}

// Calculates image-data for new image
function createMandelImage(ctx, w, h, x1, x2, y1, y2, max) {

    // Calculate n-values for all pixels
    const nValues = []
    for (let r = 0; r < h; r++) {
        // Map canvas y-value to 'real-world' y-value
        const y = map(0, h, y1, y2, r)
        for (let c = 0; c < w; c++) {
            // Map canvas y-value to 'real-world' y-value
            const x = map(0, w, x1, x2, c)

            // Calculate n-value using mandelbrot function
            nValues.push(mandel(x, y, max))
        }
    }

    // Normalize the n-values (to spread the colors more evenly)
    const nNorm = normalize(nValues, max)

    // Create image data
    const imgData = ctx.createImageData(w, h);
    nNorm.forEach((n, i) => {
        const ind = i * 4
        const m = n / max * 255

        // Translate n-value into RGB, and set pixel
        const [r, g, b] = n === max ? [0, 0, 0] : toRgb(m, 1, 1)
        imgData.data[ind + 0] = r * 255
        imgData.data[ind + 1] = g * 255
        imgData.data[ind + 2] = b * 255
        imgData.data[ind + 3] = 255
    })
    return imgData
}


function onload() {

    // Constants
    const w = 1900
    const h = 870
    const ratio = w / h
    const max = 500


    const canvas = document.getElementById("canvas");
    canvas.setAttribute("width", w)
    canvas.setAttribute("height", h)
    const ctx = canvas.getContext("2d");

    // Set initial 'real-world' x- and y ranges
    let xRange = [-2, 2]
    let yRange = [-2 / ratio, 2 / ratio]

    // Current image data
    let imageData = null

    // Keeps track of mouse button state.
    let mDown = false

    // Updates the image data based on current x- and y-range
    const update = () => {
        let [x1, x2] = xRange
        let [y1, y2] = yRange
        imageData = createMandelImage(ctx, w, h, x1, x2, y1, y2, max)
    }

    // Redraws current image data on canvas
    const redraw = () => {
        ctx.putImageData(imageData, 0, 0);
    }

    update()
    redraw()

    // Upper left corner of current zooming selection
    let start = [0, 0]

    // Extracts canvas coordinates for mouse event
    const canvasPos = (e) => {
        const rect = canvas.getBoundingClientRect()
        return [e.clientX - rect.left, e.clientY - rect.top]
    }

    // Extracts endPos, e.g. lower right corner coordinates for selection
    // Only uses x-coordinates of mouse position.
    // Y-coordinates is derived to preserve aspect ratio
    const endPos = (e) => {
        const x = canvasPos(e)[0]
        const y = start[1] + (x - start[0]) / ratio
        return [x, y]
    }

    // Converts canvas coordinates into 'real world' coordinates
    const realPos = (canvasPos) => {
        const x = canvasPos[0]
        const y = canvasPos[1]
        let [x1, x2] = xRange
        let [y1, y2] = yRange
        return [map(0, w, x1, x2, x), map(0, h, y1, y2, y)]
    }

    // Handler for pressing mouse, initiates selection
    const mouseDown = (e) => {
        start = canvasPos(e)
        mDown = true
    }

    // Handler for mouse move
    // During selection it draws selection rectangle
    const mouseMove = (e) => {
        if (mDown) {
            const end = endPos(e)
            const w = end[0] - start[0]
            const h = end[1] - start[1]
            if (w > 2) {
                redraw()
                ctx.strokeStyle = '#ff8'
                ctx.strokeRect(start[0], start[1], w, h)
            }
        }
    }

    // Handler for release of mouse button at end of selection
    // Updates and redraws image
    const mouseUp = (e) => {
        const end = endPos(e)
        const w = end[0] - start[0]
        if (w > 2) {
            const newRealStart = realPos(start)
            const newRealEnd = realPos(end)
            xRange = [newRealStart[0], newRealEnd[0]]
            yRange = [newRealStart[1], newRealEnd[1]]
        }
        update()
        redraw()
        mDown = false
    }

    // Calculates new range after zooming out, (2x)
    const zoomOut = (r) => {
        const d = r[1] - r[0]
        const mid = (r[0] + r[1]) / 2
        return [mid - d, mid + d]
    }

    // Handler to zooms out when 'z' is pressed
    const keyDown = (e) => {
        if (e.key === 'z') {
            xRange = zoomOut(xRange)
            yRange = zoomOut(yRange)
            update()
            redraw()
        }
    }

    // Register listeners
    window.addEventListener('keydown', keyDown, false);
    canvas.addEventListener('mousedown', mouseDown, false);
    canvas.addEventListener('mouseup', mouseUp, false);
    canvas.addEventListener('mousemove', mouseMove, false);
}
