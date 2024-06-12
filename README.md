# fix-path-directions
Correct sub path directions in compound path for apps that don't support fill-rules or
just reverse path directions (e.g for path animations)  

## Fix sub path directions
If you can't use SVG's `fill-rule` attribute e.g because you need to convert your path for usage in a font you can autofix path directions like so:  

### Example 1: auto-fix from stringified pathdata
```
let d = "M 0 0 h 100 v 100 h-100z M 10 10 h80 v80 h-80 z";

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

