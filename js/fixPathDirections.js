/**
 * wrapper to fix path directions from 
 * stringified pathdata
 * parses and normalizes path before
 */
function getFixedPathData(d, options){
    options = {
        //defaults
        ...{
            arcToCubic: false,
            quadraticToCubic: false,
            toClockwise: false,
            returnD: false
        },
        ...options
    }

    let {returnD, toClockwise} = options
    let pathData = Array.isArray(d) ? d : parsePathDataNormalized(d, options)
    let pathDataFixed = fixPathDataDirections(pathData, toClockwise)
    let dNew = pathDataToD(pathDataFixed, 3)

    return returnD ? dNew : pathDataFixed

}

/**
 * fix sub path directions
 * pathdata must be be normalized to
 * absolute and longhand commands
 * toClockwise = force default direction
 */
function fixPathDataDirections(pathData, toClockwise=false, sort=true) {

    pathData = JSON.parse(JSON.stringify(pathData));

    // split compound paths
    let pathDataArr = splitSubpaths(pathData);
    let polys = []

    pathDataArr.forEach((pathData, i) => {
        let vertices = getPathDataPoly(pathData)
        let area = polygonArea(vertices)
        let isClockwise = area>=0
        polys.push({ pts: vertices, bb: getPolyBBox(vertices), cw: isClockwise, index: i, inter: 0, includes: [], includedIn: [] })
    })

    // check poly intersections
    for (let i = 0; i < polys.length; i++) {
        let prev = polys[i]
        let bb0 = prev.bb

        for (let j = 0; j < polys.length; j++) {

            let poly = polys[j]
            let bb = poly.bb

            // skip if the same poly or parent
            if (i === j || poly.includes.includes(i)) continue

            // if mid point is in previous polygon
            let ptMid = { x: bb.left + bb.width / 2, y: bb.top + bb.height / 2 }
            let inPoly = isPointInPolygon(ptMid, prev.pts, bb0)

            if (inPoly) {
                polys[j].inter += 1
                poly.includedIn.push(i)
                prev.includes.push(j)
            }
        }
    }


    // reverse paths
    for (let i = 0; i < polys.length; i++) {

        let poly = polys[i]
        let { cw, includedIn, includes } = poly

        // outer path direction to counter clockwise
        if (!includedIn.length && cw && !toClockwise 
            || !includedIn.length && !cw && toClockwise
         ) {
            pathDataArr[i] = reversePathData(pathDataArr[i]);
            polys[i].cw = polys[i].cw ? false : true
            cw = polys[i].cw
        }

        // reverse inner sub paths
        for(let j=0; j<includes.length; j++){
            let ind = includes[j];
            let child = polys[ind];

            if (child.cw === cw ) {
                pathDataArr[ind] = reversePathData(pathDataArr[ind]);
                polys[ind].cw = polys[ind].cw ? false : true
            }
    
        }
    }

    // sort path data array by position
    if(sort){
        polys.sort((a, b) => a.bb.top - b.bb.top || a.bb.width - b.bb.width || a.bb.left - b.bb.left  );
        pathDataArr = polys.map(poly=>{return pathDataArr[poly.index]})
    }


    return pathDataArr.flat()

}



/**
 * reverse pathdata
 * make sure all command coordinates are absolute and
 * shorthands are converted to long notation
 */
function reversePathData(pathData) {

    // start compiling new path data
    let pathDataNew = [];

    // helper to rearrange control points for all command types
    const reverseControlPoints = (type, values) => {
        let controlPoints = [];
        let endPoints = [];
        if (type !== "A") {
            for (let p = 0; p < values.length; p += 2) {
                controlPoints.push([values[p], values[p + 1]]);
            }
            endPoints = controlPoints.pop();
            controlPoints.reverse();
        }
        // is arc
        else {
            //reverse sweep;
            let sweep = values[4] == 0 ? 1 : 0;
            controlPoints = [values[0], values[1], values[2], values[3], sweep];
            endPoints = [values[5], values[6]];
        }
        return { controlPoints, endPoints };
    };

    let closed =
        pathData[pathData.length - 1].type.toLowerCase() === "z" ? true : false;
    if (closed) {
        // add lineto closing space between Z and M
        pathData = addClosePathLineto(pathData);
        // remove Z closepath
        pathData.pop();
    }

    // define last point as new M if path isn't closed
    let valuesLast = pathData[pathData.length - 1].values;
    let valuesLastL = valuesLast.length;
    let M = closed
        ? pathData[0]
        : {
            type: "M",
            values: [valuesLast[valuesLastL - 2], valuesLast[valuesLastL - 1]]
        };
    // starting M stays the same – unless the path is not closed
    pathDataNew.push(M);

    // reverse path data command order for processing
    pathData.reverse();
    for (let i = 1; i < pathData.length; i++) {
        let com = pathData[i];
        let type = com.type;
        let values = com.values;
        let comPrev = pathData[i - 1];
        let typePrev = comPrev.type;
        let valuesPrev = comPrev.values;

        // get reversed control points and new end coordinates
        let controlPointsPrev = reverseControlPoints(typePrev, valuesPrev).controlPoints;
        let endPoints = reverseControlPoints(type, values).endPoints;

        // create new path data
        let newValues = [];
        newValues = [controlPointsPrev, endPoints].flat();
        pathDataNew.push({
            type: typePrev,
            values: newValues.flat()
        });
    }

    // add previously removed Z close path
    if (closed) {
        pathDataNew.push({
            type: "z",
            values: []
        });
    }

    return pathDataNew;
}

/** Get relationship between a point and a polygon using ray-casting algorithm
* based on timepp's answer
* https://stackoverflow.com/questions/217578/how-can-i-determine-whether-a-2d-point-is-within-a-polygon#63436180
*/
function isPointInPolygon(pt, polygon, bb, skipBB = false) {
    const between = (p, a, b) => (p >= a && p <= b) || (p <= a && p >= b);
    let inside = false;

    // not in bbox - quit || no bbox defined
    if (!skipBB || !bb.bottom) {
        if (bb.left > pt.x || bb.top > pt.y || bb.bottom < pt.y || bb.right < pt.x) {
            return false;
        }
    }

    for (let i = polygon.length - 1, j = 0; j < polygon.length; i = j, j++) {
        const A = polygon[i];
        const B = polygon[j];
        // corner cases
        if ((pt.x == A.x && pt.y == A.y) || (pt.x == B.x && pt.y == B.y))
            return true;
        if (A.y == B.y && pt.y == A.y && between(pt.x, A.x, B.x)) return true;
        if (between(pt.y, A.y, B.y)) {
            // if pt inside the vertical range
            // filter out "ray pass vertex" problem by treating the line a little lower
            if ((pt.y == A.y && B.y >= A.y) || (pt.y == B.y && A.y >= B.y)) continue;
            // calc cross product `ptA X ptB`, pt lays on left side of AB if c > 0
            const c = (A.x - pt.x) * (B.y - pt.y) - (B.x - pt.x) * (A.y - pt.y);
            if (c == 0) return true;
            if (A.y < B.y == c > 0) inside = !inside;
        }
    }
    return inside ? true : false;
}



function getPathDataPoly(pathData) {

    let poly = [];
    for (let i = 0; i < pathData.length; i++) {
        let com = pathData[i]
        let prev = i>0 ? pathData[i-1] : pathData[i];
        let { type, values } = com;
        let p0 =  {x: prev.values[prev.values.length-2], y: prev.values[prev.values.length-1] };
        let p = values.length ? { x: values[values.length - 2], y: values[values.length - 1] } : ''
        let cp1 = values.length ? { x: values[0], y: values[1] } : ''

        switch (type) {

            // convert to cubic to get polygon
            case 'A':
                if(typeof arcToBezier !== 'function'){
                    //console.log('has no arc to cubic conversion');
                    break;
                }
                let cubic = arcToBezier(p0, values)
                cubic.forEach(com=>{
                    let vals = com.values
                    let cp1 = {x:vals[0], y:vals[1]}
                    let cp2 = {x:vals[2], y:vals[3]}
                    let p = {x:vals[4], y:vals[5]}
                    poly.push(cp1, cp2, p)
                })
            break;

            case 'C':
                let cp2 = { x: values[2], y: values[3] }
                poly.push(cp1, cp2)
                break;
            case 'Q':
                poly.push(cp1)
                break;
        }

        // M and L commands
        if (type.toLowerCase() !== 'z') {
            poly.push(p)
        }
    }

    return poly;
}


function getPolyBBox(vertices) {
    let xArr = vertices.map((pt) => {
        return pt.x;
    });
    let yArr = vertices.map((pt) => {
        return pt.y;
    });
    let left = Math.min(...xArr)
    let right = Math.max(...xArr)
    let top = Math.min(...yArr)
    let bottom = Math.max(...yArr)
    let bb = {
        left: left,
        right: right,
        top: top,
        bottom: bottom,
        width: right - left,
        height: bottom - top

    };
    return bb;
}



/**
 * split compound paths into sub path data array
 */
function splitSubpaths(pathData) {

    let subPathArr = [];

    //split segments after M command
    let subPathIndices = pathData.map((com, i) => (com.type === 'M' ? i : -1)).filter(i => i !== -1);

    // no compound path
    if (subPathIndices.length === 1) {
        return [pathData]
    }
    subPathIndices.forEach((index, i) => {
        subPathArr.push(pathData.slice(index, subPathIndices[i + 1]));
    });

    return subPathArr;
}


/**
 * Add closing lineto:
 * needed for path reversing or adding points
 */

function addClosePathLineto(pathData) {
    let closed = pathData[pathData.length - 1].type.toLowerCase() === "z";
    let M = pathData[0];
    let [x0, y0] = [M.values[0], M.values[1]];
    let lastCom = closed ? pathData[pathData.length - 2] : pathData[pathData.length - 1];
    let [xE, yE] = [lastCom.values[lastCom.values.length - 2], lastCom.values[lastCom.values.length - 1]];

    if (closed && (x0 != xE || y0 != yE)) {

        pathData.pop();
        pathData.push(
            {
                type: "L",
                values: [x0, y0]
            },
            {
                type: "Z",
                values: []
            }
        );
    }
    return pathData;
}


function polygonArea(points, absolute = false) {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const addX = points[i].x;
        const addY = points[i === points.length - 1 ? 0 : i + 1].y;
        const subX = points[i === points.length - 1 ? 0 : i + 1].x;
        const subY = points[i].y;
        area += addX * addY * 0.5 - subX * subY * 0.5;
    }
    if (absolute) {
        area = Math.abs(area);
    }
    return area;
}


/**
 * parsing and normalization
 */

/**
    * parse pathData from d attribute
    * the core function to parse the pathData array from a d string
    **/

function parsePathDataNormalized(d, options = {}) {

    d = d
        // remove new lines, tabs an comma with whitespace
        .replace(/[\n\r\t|,]/g, " ")
        // pre trim left and right whitespace
        .trim()
        // add space before minus sign
        .replace(/(\d)-/g, '$1 -')
        // decompose multiple adjacent decimal delimiters like 0.5.5.5 => 0.5 0.5 0.5
        .replace(/(\.)(?=(\d+\.\d+)+)(\d+)/g, "$1$3 ")

    let pathData = [];
    let cmdRegEx = /([mlcqazvhst])([^mlcqazvhst]*)/gi;
    let commands = d.match(cmdRegEx);

    // valid command value lengths
    let comLengths = { m: 2, a: 7, c: 6, h: 1, l: 2, q: 4, s: 4, t: 2, v: 1, z: 0 };

    options = {
        ...{
            toAbsolute: true,
            toLonghands: true,
            arcToCubic: false,
            quadraticToCubic: false,
            arcAccuracy: 1,
        },
        ...options
    }

    let { toAbsolute, toLonghands, arcToCubic, arcAccuracy, quadraticToCubic } = options;
    let hasArcs = /[a]/gi.test(d);
    let hasShorthands = toLonghands ? /[vhst]/gi.test(d) : false;
    let hasRelative = toAbsolute ? /[lcqamts]/g.test(d.substring(1, d.length - 1)) : false;
    let hasQuadratics = quadraticToCubic ? /[qt]/gi.test(d) : false;


    // offsets for absolute conversion
    let offX, offY, lastX, lastY;

    for (let c = 0; c < commands.length; c++) {
        let com = commands[c];
        let type = com.substring(0, 1);
        let typeRel = type.toLowerCase();
        let typeAbs = type.toUpperCase();
        let isRel = type === typeRel;
        let chunkSize = comLengths[typeRel];

        // split values to array
        let values = com.substring(1, com.length)
            .trim()
            .split(" ").filter(Boolean);

        /**
         * A - Arc commands
         * large arc and sweep flags
         * are boolean and can be concatenated like
         * 11 or 01
         * or be concatenated with the final on path points like
         * 1110 10 => 1 1 10 10
         */
        if (typeRel === "a" && values.length != comLengths.a) {

            let n = 0,
                arcValues = [];
            for (let i = 0; i < values.length; i++) {
                let value = values[i];

                // reset counter
                if (n >= chunkSize) {
                    n = 0;
                }
                // if 3. or 4. parameter longer than 1
                if ((n === 3 || n === 4) && value.length > 1) {
                    let largeArc = n === 3 ? value.substring(0, 1) : "";
                    let sweep = n === 3 ? value.substring(1, 2) : value.substring(0, 1);
                    let finalX = n === 3 ? value.substring(2) : value.substring(1);
                    let comN = [largeArc, sweep, finalX].filter(Boolean);
                    arcValues.push(comN);
                    n += comN.length;


                } else {
                    // regular
                    arcValues.push(value);
                    n++;
                }
            }
            values = arcValues.flat().filter(Boolean);
        }

        // string  to number
        values = values.map(Number)

        // if string contains repeated shorthand commands - split them
        let hasMultiple = values.length > chunkSize;
        let chunk = hasMultiple ? values.slice(0, chunkSize) : values;
        let comChunks = [{ type: type, values: chunk }];

        // has implicit or repeated commands – split into chunks
        if (hasMultiple) {
            let typeImplicit = typeRel === "m" ? (isRel ? "l" : "L") : type;
            for (let i = chunkSize; i < values.length; i += chunkSize) {
                let chunk = values.slice(i, i + chunkSize);
                comChunks.push({ type: typeImplicit, values: chunk });
            }
        }

        // no relative, shorthand or arc command - return current 
        if (!hasRelative && !hasShorthands && !hasArcs && !hasQuadratics) {
            comChunks.forEach((com) => {
                pathData.push(com);
            });
        }

        /**
         * convert to absolute 
         * init offset from 1st M
         */
        else {
            if (c === 0) {
                offX = values[0];
                offY = values[1];
                lastX = offX;
                lastY = offY;
            }

            let typeFirst = comChunks[0].type;
            typeAbs = typeFirst.toUpperCase()

            // first M is always absolute
            isRel = typeFirst.toLowerCase() === typeFirst && pathData.length ? true : false;

            for (let i = 0; i < comChunks.length; i++) {
                let com = comChunks[i];
                let type = com.type;
                let values = com.values;
                let valuesL = values.length;
                let comPrev = comChunks[i - 1]
                    ? comChunks[i - 1]
                    : c > 0 && pathData[pathData.length - 1]
                        ? pathData[pathData.length - 1]
                        : comChunks[i];

                let valuesPrev = comPrev.values;
                let valuesPrevL = valuesPrev.length;
                isRel = comChunks.length > 1 ? type.toLowerCase() === type && pathData.length : isRel;

                if (isRel) {
                    com.type = comChunks.length > 1 ? type.toUpperCase() : typeAbs;

                    switch (typeRel) {
                        case "a":
                            com.values = [
                                values[0],
                                values[1],
                                values[2],
                                values[3],
                                values[4],
                                values[5] + offX,
                                values[6] + offY
                            ];
                            break;

                        case "h":
                        case "v":
                            com.values = type === "h" ? [values[0] + offX] : [values[0] + offY];
                            break;

                        case "m":
                        case "l":
                        case "t":
                            com.values = [values[0] + offX, values[1] + offY];
                            break;

                        case "c":
                            com.values = [
                                values[0] + offX,
                                values[1] + offY,
                                values[2] + offX,
                                values[3] + offY,
                                values[4] + offX,
                                values[5] + offY
                            ];
                            break;

                        case "q":
                        case "s":
                            com.values = [
                                values[0] + offX,
                                values[1] + offY,
                                values[2] + offX,
                                values[3] + offY
                            ];
                            break;
                    }
                }
                // is absolute
                else {
                    offX = 0;
                    offY = 0;
                }

                /**
                 * convert shorthands
                 */
                if (hasShorthands) {
                    let cp1X, cp1Y, cpN1X, cpN1Y, cp2X, cp2Y;

                    if (com.type === "H" || com.type === "V") {
                        com.values =
                            com.type === "H" ? [com.values[0], lastY] : [lastX, com.values[0]];
                        com.type = "L";
                    } else if (com.type === "T" || com.type === "S") {
                        [cp1X, cp1Y] = [valuesPrev[0], valuesPrev[1]];
                        [cp2X, cp2Y] =
                            valuesPrevL > 2
                                ? [valuesPrev[2], valuesPrev[3]]
                                : [valuesPrev[0], valuesPrev[1]];

                        // new control point
                        cpN1X = com.type === "T" ? lastX * 2 - cp1X : lastX * 2 - cp2X;
                        cpN1Y = com.type === "T" ? lastY * 2 - cp1Y : lastY * 2 - cp2Y;
                        com.values = [cpN1X, cpN1Y, ...com.values];
                        com.type = com.type === "T" ? "Q" : "C";

                    }
                }

                /**
                 * convert arcs 
                 */
                p0 = { x: lastX, y: lastY }
                if (hasArcs && com.type === 'A') {
                    if (typeRel === 'a') {
                        let comArc = arcToBezier(p0, com.values, arcAccuracy)
                        comArc.forEach(seg => {
                            pathData.push(seg);
                        })
                    }
                }

                else {
                    // add to pathData array
                    pathData.push(com);
                }


                // update offsets
                lastX =
                    valuesL > 1
                        ? values[valuesL - 2] + offX
                        : typeRel === "h"
                            ? values[0] + offX
                            : lastX;
                lastY =
                    valuesL > 1
                        ? values[valuesL - 1] + offY
                        : typeRel === "v"
                            ? values[0] + offY
                            : lastY;
                offX = lastX;
                offY = lastY;
            }
        }
    }


    pathData[0].type = "M";

    /**
    * convert quadratics to cubic
    * and round
    */
    for(let i=0; i<pathData.length; i++){
        let com = pathData[i];
        if (com.type === 'Q' && hasQuadratics && quadraticToCubic) {
            let comPrev = pathData[i - 1];
            let comPrevValues = comPrev.values;
            let comPrevValuesL = comPrevValues.length;
            let p0 = { x: comPrevValues[comPrevValuesL - 2], y: comPrevValues[comPrevValuesL - 1] }
            pathData[i] = quadratic2Cubic(p0, com.values)
        }
        pathData[i].values = pathData[i].values.length>1 ? pathData[i].values.map(val => { return +val.toFixed(9) }) : com.values
    }
    
    return pathData;

}

/**
 * convert quadratic commands to cubic
 */
function quadratic2Cubic(p0, values) {

    let cp1 = {
        x: p0.x + 2 / 3 * (values[0] - p0.x),
        y: p0.y + 2 / 3 * (values[1] - p0.y)
    }
    let cp2 = {
        x: values[2] + 2 / 3 * (values[0] - values[2]),
        y: values[3] + 2 / 3 * (values[1] - values[3])
    }

    return ({ type: "C", values: [cp1.x, cp1.y, cp2.x, cp2.y, values[2], values[3]] });
}

/** 
* convert arctocommands to cubic bezier
* based on puzrin's a2c.js
* https://github.com/fontello/svgpath/blob/master/lib/a2c.js
* returns pathData array
*/

function arcToBezier(p0, values, splitSegments = 1) {
    const TAU = Math.PI * 2;
    let [rx, ry, rotation, largeArcFlag, sweepFlag, x, y] = values;

    if (rx === 0 || ry === 0) {
        return []
    }

    let phi = rotation ? rotation * TAU / 360 : 0;
    let sinphi = phi ? Math.sin(phi) : 0
    let cosphi = phi ? Math.cos(phi) : 1
    let pxp = cosphi * (p0.x - x) / 2 + sinphi * (p0.y - y) / 2
    let pyp = -sinphi * (p0.x - x) / 2 + cosphi * (p0.y - y) / 2

    if (pxp === 0 && pyp === 0) {
        return []
    }
    rx = Math.abs(rx)
    ry = Math.abs(ry)
    let lambda =
        pxp * pxp / (rx * rx) +
        pyp * pyp / (ry * ry)
    if (lambda > 1) {
        let lambdaRt = Math.sqrt(lambda);
        rx *= lambdaRt
        ry *= lambdaRt
    }

    /** 
     * parametrize arc to 
     * get center point start and end angles
     */
    let rxsq = rx * rx,
        rysq = rx === ry ? rxsq : ry * ry

    let pxpsq = pxp * pxp,
        pypsq = pyp * pyp
    let radicant = (rxsq * rysq) - (rxsq * pypsq) - (rysq * pxpsq)

    if (radicant <= 0) {
        radicant = 0
    } else {
        radicant /= (rxsq * pypsq) + (rysq * pxpsq)
        radicant = Math.sqrt(radicant) * (largeArcFlag === sweepFlag ? -1 : 1)
    }

    let centerxp = radicant ? radicant * rx / ry * pyp : 0
    let centeryp = radicant ? radicant * -ry / rx * pxp : 0
    let centerx = cosphi * centerxp - sinphi * centeryp + (p0.x + x) / 2
    let centery = sinphi * centerxp + cosphi * centeryp + (p0.y + y) / 2

    let vx1 = (pxp - centerxp) / rx
    let vy1 = (pyp - centeryp) / ry
    let vx2 = (-pxp - centerxp) / rx
    let vy2 = (-pyp - centeryp) / ry

    // get start and end angle
    const vectorAngle = (ux, uy, vx, vy) => {
        let dot = +(ux * vx + uy * vy).toFixed(9)
        if (dot === 1 || dot === -1) {
            return dot === 1 ? 0 : Math.PI
        }
        dot = dot > 1 ? 1 : (dot < -1 ? -1 : dot)
        let sign = (ux * vy - uy * vx < 0) ? -1 : 1
        return sign * Math.acos(dot);
    }

    let ang1 = vectorAngle(1, 0, vx1, vy1),
        ang2 = vectorAngle(vx1, vy1, vx2, vy2)

    if (sweepFlag === 0 && ang2 > 0) {
        ang2 -= Math.PI * 2
    }
    else if (sweepFlag === 1 && ang2 < 0) {
        ang2 += Math.PI * 2
    }

    let ratio = +(Math.abs(ang2) / (TAU / 4)).toFixed(0)

    // increase segments for more accureate length calculations
    let segments = ratio * splitSegments;
    ang2 /= segments
    let pathDataArc = [];


    // If 90 degree circular arc, use a constant
    // https://pomax.github.io/bezierinfo/#circles_cubic
    // k=0.551784777779014
    const angle90 = 1.5707963267948966;
    const k = 0.551785
    let a = ang2 === angle90 ? k :
        (
            ang2 === -angle90 ? -k : 4 / 3 * Math.tan(ang2 / 4)
        );

    let cos2 = ang2 ? Math.cos(ang2) : 1;
    let sin2 = ang2 ? Math.sin(ang2) : 0;
    let type = 'C'

    const approxUnitArc = (ang1, ang2, a, cos2, sin2) => {
        let x1 = ang1 != ang2 ? Math.cos(ang1) : cos2;
        let y1 = ang1 != ang2 ? Math.sin(ang1) : sin2;
        let x2 = Math.cos(ang1 + ang2);
        let y2 = Math.sin(ang1 + ang2);

        return [
            { x: x1 - y1 * a, y: y1 + x1 * a },
            { x: x2 + y2 * a, y: y2 - x2 * a },
            { x: x2, y: y2 }
        ];
    }

    for (let i = 0; i < segments; i++) {
        let com = { type: type, values: [] }
        let curve = approxUnitArc(ang1, ang2, a, cos2, sin2);

        curve.forEach((pt) => {
            let x = pt.x * rx
            let y = pt.y * ry
            com.values.push(cosphi * x - sinphi * y + centerx, sinphi * x + cosphi * y + centery)
        })
        pathDataArc.push(com);
        ang1 += ang2
    }

    return pathDataArc;
}


/**
* serialize pathData array to 
* d attribute string 
*/
function pathDataToD(pathData) {
    let d = `${pathData.map(com => { return com.type + com.values.join(' ') }).join(' ')}`;
    return d;
}

