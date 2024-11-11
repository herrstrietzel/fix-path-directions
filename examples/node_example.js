const fixPathDirections = require('fix-path-directions');
const {getFixedPathData, getFixedPathDataString, fixPathDataDirections, reversePathData, parsePathDataNormalized, pathDataToD} = fixPathDirections;


let d = "M50 0a50 50 0 110 100 50 50 0 110-100m0 30a20 20 0 110 40 20 20 0 110-40m0-10q12.42 0 21.21 8.79t8.79 21.21-8.79 21.21-21.21 8.79-21.21-8.79-8.79-21.21 8.79-21.21 21.21-8.79m-40-20a5 5 0 110 10 5 5 0 110-10m80 0a5 5 0 110 10 5 5 0 110-10m0 2.5a2.5 2.5 0 110 5 2.5 2.5 0 110-5m-45 42.5h10v10h-10zm-5-5h20v20h-20zm10-30c22.07 0 40 17.93 40 40s-17.93 40-40 40-40-17.93-40-40 17.93-40 40-40";

// return d path data string
let pathDataFixed = getFixedPathDataString(d);

console.log(pathDataFixed);