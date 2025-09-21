let paths = document.querySelectorAll("path");

let pathInput = document.getElementById('pathInput');
let pathInputFixed = document.getElementById('pathInputFixed');

let svgPreviewOriginal = document.getElementById('svgPreviewOriginal');
let pathOriginal = document.getElementById('pathOriginal');


let svgPreview = document.getElementById('svgPreview');
let path = document.getElementById('path');


let btnReversePaths = document.getElementById('btnReversePaths');
let showDirections = document.getElementById('showDirections');


updateFixedPath(pathInput.value, path)

pathInput.addEventListener('input', e => {
    updateFixedPath(pathInput.value, path)
});


function updateFixedPath(d, target){

    //console.log(d, target);
    let dNew = fixPathData(d.trim());
    target.setAttribute('d', dNew);

    // original
    pathOriginal.setAttribute('d', d);


    let svg = target.closest('svg');
    adjustViewBox(svg)
    adjustViewBox(svgPreviewOriginal)

    pathInput.value = d.trim();
    pathInputFixed.value=dNew;

}



function fixPathData(d) {

    let options = {
        arcToCubic: false,
        quadraticToCubic: false,
        toClockwise: true
    };

    // parse and optimize path directions
    let pathData = getFixedPathData(d, options);

    // stringify new pathdata and apply
    let dNew = pathDataToD(pathData);

    return dNew;
}



function fixPaths(paths) {

    updateFixedPath(pathInput.value, path)
}


/**
 * only for illustration
 */

showDirections.addEventListener("input", (e) => {
    if (showDirections.checked) {
        document.body.classList.add("showMarkers");
    } else {
        document.body.classList.remove("showMarkers");
    }
});



btnReversePaths.addEventListener('click', e=>{
    let d = path.getAttribute("d");
    let pathData = reversePathData(d);

    let dNew = pathDataToD(pathData);
    path.setAttribute("d", dNew);
    pathInputFixed.value = dNew;

})




/**
 * adjjust viewBox
 */
function adjustViewBox(svg) {
    let bb = svg.getBBox();
    svg.setAttribute("viewBox", [bb.x, bb.y, bb.width, bb.height].join(" "));
}
