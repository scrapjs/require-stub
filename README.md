# Broswer `require()`

Provide synchronous `require` in browser for development purposes. A convenient replacement for watchify (dynamic, no configs needed). Strives to be compliant with browserify, in that code using `require-stub` is fully browserifyable.


```
$ npm install --save-dev require-stub
```

```html
<!-- provide `reqiure` -->
<script src="node_modules/require-stub/index.js"></script>

<!-- use require -->
<script>
	var assert = require("chai").assert;
	var Emitter = require("emitter");
</script>
```

If you find something doesn’t work, report a [bug](https://github.com/dfcreative/require-stub/issues).



##### How does it work?

Via synchronous XMLHttpRequest. To resolve module paths used `package.json` closest to the current page. To stub native packages is used [browser-builtins](https://github.com/alexgorbatchev/node-browser-builtins). Required scripts are evaled, so to provide module scopes.


# Precautions

* Don’t use in production: dynamic evals proved to be ~3x slower than browserified code. But it is good for perf testing.


# Similar efforts

* [breq](https://www.npmjs.com/package/breq) — resolves relative requirements.
* [TKRequire](https://github.com/trausti/TKRequire.js) — resolves relative requirements.
* [smoothie.js](https://github.com/flowyapps/smoothie) — resolves relative requirements.


Best wishes,

Deema.


<a href="UNLICENSE"><img src="http://upload.wikimedia.org/wikipedia/commons/6/62/PD-icon.svg" width="20"/></a>


[![NPM](https://nodei.co/npm/require-stub.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/require-stub/)