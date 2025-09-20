let paths = document.querySelectorAll("path");

function fixPaths(paths) {
    /**
     * options:
     * arcToCubic:
     * retain `A` (arc) commands or convert them to cubic bézier approximations
     * quadraticToCubic:
     * retain quadratic bézier commands or convert them to cubic
     */
    let options = {
        arcToCubic: false,
        quadraticToCubic: false,
        toClockwise: true
    };

    paths.forEach((path) => {
        // get stringified pathdata from element
        let d = path.getAttribute("d");

        // parse and optimize path directions
        let pathData = getFixedPathData(d, options);

        // stringify new pathdata and apply
        let dNew = pathDataToD(pathData);
        path.setAttribute("d", dNew);
    });

    //only for illustration
    showPathdata(paths);
}

/**
 * only for illustration
 */
showPathdata(paths);
updatePathdata(paths);


showDirections.addEventListener("input", (e) => {
    if (showDirections.checked) {
        document.body.classList.add("showMarkers");
    } else {
        document.body.classList.remove("showMarkers");
    }
});

function reverseAllPaths(paths) {
    paths.forEach((path) => {
        let d = path.getAttribute("d");
        let pathData = reversePathData(d);

        let dNew = pathDataToD(pathData);
        path.setAttribute("d", dNew);
    });

    showPathdata(paths);
}

function showPathdata(paths) {
    paths.forEach((path) => {
        let d = path.getAttribute("d");
        let textarea = path.closest(".grd").querySelector("textarea");
        textarea.value = d;
    });
}

function updatePathdata(paths) {
    paths.forEach((path) => {
        let svg = path.closest('svg');
        let d = path.getAttribute("d");
        let textarea = path.closest(".grd").querySelector("textarea");
        textarea.addEventListener('input', (e) => {
            let newD = textarea.value;
            path.setAttribute("d", newD)
            adjustViewBox(svg)
        })
    });
}


/**
 * adjjust viewBox
 */
function adjustViewBox(svg) {
    let bb = svg.getBBox();
    svg.setAttribute("viewBox", [bb.x, bb.y, bb.width, bb.height].join(" "));
}
