[![npm version](https://img.shields.io/npm/v/fix-path-directions.svg)](https://www.npmjs.com/package/fix-path-directions)


# fix-path-directions
Correct sub path directions in compound path for apps that don't support fill-rules or
just reverse path directions (e.g for path animations)  

## Install
### Browser
```
<script src="https://www.unpkg.com/fix-path-directions@latest/js/fixPathDirections.js"></script>
``` 
or  
```
<script src="https://cdn.jsdelivr.net/npm/fix-path-directions@latest/js/fixPathDirections.min.js"></script>
``` 

### Node
```
npm install fix-path-directions
```

```
const fixPathDirections = require('fix-path-directions');
const {getFixedPathData, getFixedPathDataString, fixPathDataDirections, reversePathData, parsePathDataNormalized, pathDataToD} = fixPathDirections;
```


## Fix sub path directions
If you can't use SVG's `fill-rule` attribute e.g because you need to convert your path for usage in a font you can autofix path directions like so:  

### Example 1: auto-fix from stringified pathdata
Stringified path data is automatically normalized to absolute and unshortened commands.

```
let d = "M50 0a50 50 0 110 100 50 50 0 110-100m0 30a20 20 0 110 40 20 20 0 110-40m0-10q12.42 0 21.21 8.79t8.79 21.21-8.79 21.21-21.21 8.79-21.21-8.79-8.79-21.21 8.79-21.21 21.21-8.79m-40-20a5 5 0 110 10 5 5 0 110-10m80 0a5 5 0 110 10 5 5 0 110-10m0 2.5a2.5 2.5 0 110 5 2.5 2.5 0 110-5m-45 42.5h10v10h-10zm-5-5h20v20h-20zm10-30c22.07 0 40 17.93 40 40s-17.93 40-40 40-40-17.93-40-40 17.93-40 40-40";

// return d path data string
let pathDataFixed = getFixedPathDataString(d);

// apply to path element
path.setAttribute("d", pathDataFixed);
``` 

See `examples/simple.html`


### Example 2: auto-fix from stringified pathdata - with options
... However, you may also want to apply more fine-grained normalization options. 
You don't need to apply heavy command type conversions like `arc` to `cubic bezier` or conversions between quadratic and cubic Béziers.

```
// define normalization options
let options = {
  //convert arcs to cubics
  arcToCubic: false,
  //convert quadratic béziers to cubics
  quadraticToCubic: false,
  // outer shapes should be in clockwise direction
  toClockwise: false,
  returnD: true
};
// auto-fix path directions
let pathDataFixed = getFixedPathData(d, options);

// apply to path element
path.setAttribute("d", pathDataFixed);
```

### Example 3: reverse path direction

```
let d = "M 0 100 Q 50 0 100 100";

let options = {
  arcToCubic: false,
  quadraticToCubic: true,
  toClockwise: false,
  returnD: true
};
let pathDataReversed = reversePathData(d, options);
path.setAttribute("d", pathDataReversed);
```

### Example 4: optimize path data
You may also optimize the pathdata to get a more compact path data output by adding a pathdata compatible helper script like  `pathDataConvert.js` (from [svg-parse-path-normalized](https://github.com/herrstrietzel/svg-parse-path-normalized) ).
```
<!-- optional conversions -->
<script src="https://cdn.jsdelivr.net/npm/svg-parse-path-normalized@latest/js/pathDataConvert.min.js"></script>
```

```
let options = {toShorthands:true, toRelative:true, decimals:1}
let pathDataFixed = getFixedPathData(d).convert(options).toD(1, true)
path.setAttribute("d", pathDataFixed);
```

See `examples/simple_optimized.html`


## Demos
* [Fix directions UI](https://codepen.io/herrstrietzel/pen/jOoGrxO?editors=1010)
* [Auto-fix compound path simple](https://codepen.io/herrstrietzel/pen/mdYBrge?editors=1010)
* [Reverse path directions](https://codepen.io/herrstrietzel/pen/xxNXRbe?editors=1010)


## Credits
* Jarek Foksa for his [great polyfill](https://github.com/jarek-foksa/path-data-polyfill) heavily inspring to adopt the new pathData interface methodology and for contributing to the specification
* Dmitry Baranovskiy for (raphael.j/snap.svg) [pathToAbsolute/Relative functions](https://github.com/DmitryBaranovskiy/raphael/blob/master/raphael.js#L1848) 
* Vitaly Puzrin (fontello) for the arc to cubic conversion method  [a2c.js](https://github.com/fontello/svgpath/blob/master/lib/a2c.js) and [cubic to quadratic approximation](https://github.com/fontello/cubic2quad/blob/master/test/cubic2quad.js)
* Mike "POMAX" Kammermans for his great [A Primer on Bézier Curves](https://pomax.github.io/bezierinfo)


## Related projects
* [svg-parse-path-normalized](https://github.com/herrstrietzel/svg-parse-path-normalized) – Parse path data from string including fine-grained normalizing options
* [svg-getpointatlength](https://github.com/herrstrietzel/svg-getpointatlength) – Calculates a path's length or points at length based on raw pathdata
* [svg-pathdata-getbbox](svg-pathdata-getbbox) – Calculates a path bounding box based on its raw pathdata

