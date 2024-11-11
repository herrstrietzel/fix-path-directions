# fix-path-directions
Correct sub path directions in compound path for apps that don't support fill-rules or
just reverse path directions (e.g for path animations)  

## Fix sub path directions
If you can't use SVG's `fill-rule` attribute e.g because you need to convert your path for usage in a font you can autofix path directions like so:  

### Example 1: auto-fix from stringified pathdata
```
let d = "M50 0a50 50 0 110 100 50 50 0 110-100m0 30a20 20 0 110 40 20 20 0 110-40m0-10q12.42 0 21.21 8.79t8.79 21.21-8.79 21.21-21.21 8.79-21.21-8.79-8.79-21.21 8.79-21.21 21.21-8.79m-40-20a5 5 0 110 10 5 5 0 110-10m80 0a5 5 0 110 10 5 5 0 110-10m0 2.5a2.5 2.5 0 110 5 2.5 2.5 0 110-5m-45 42.5h10v10h-10zm-5-5h20v20h-20zm10-30c22.07 0 40 17.93 40 40s-17.93 40-40 40-40-17.93-40-40 17.93-40 40-40";

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

### Example 2: reverse path direction

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


## Demos
* [Fix directions UI](https://codepen.io/herrstrietzel/pen/jOoGrxO?editors=1010)
* [Auto-fix compound path simple](https://codepen.io/herrstrietzel/pen/mdYBrge?editors=1010)
* [Reverse path directions](https://codepen.io/herrstrietzel/pen/xxNXRbe?editors=1010)

