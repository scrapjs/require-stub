# Broswer `require()`

Provide synchronous `require` in browser. For development purposes only.


```
$ npm install require-stub
```

```html
<!-- provide `reqiure` -->
<script src="node_modules/require-stub/index.js"></script>

<!-- use require -->
<script>
	var assert = require("chai").assert;
	var emitter = require("emitter");

	//request from package.json
	var other = require("other-module");
</script>
```

If you find something doesn’t work, report a [bug](https://github.com/dfcreative/require-stub/issues).



###### How does it work?

Via synchronous XMLHttpRequest. To resolve module paths used `package.json` closest to the running page. To stub native packages used [browser-builtins](https://github.com/alexgorbatchev/node-browser-builtins). Required scripts are evaled, so to provide module scopes.


# Precautions

* Don’t require stuff runtime: it is bad for performance and it produces extra logs.
* If something causes recursion (very rare case) — clear session storage.
* Don’t use in production: dynamic evals proved to be ~3x and more slower than browserified code. But it is good for perf testing.
* For automated tests use [mochify](https://github.com/mantoni/mochify.js).

Best wishes,

Deema.


<a href="UNLICENSE"><img src="http://upload.wikimedia.org/wikipedia/commons/6/62/PD-icon.svg" width="20"/></a>


[![NPM](https://nodei.co/npm/require-stub.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/require-stub/)