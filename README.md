# Orthodoxical `require()` for browsers

Hello, browserify. You’re a great tool, but it is very annoyingly time after time compile your code `--standalone` in order to just launch tests in browser. I don’t want to launch `watchify` task just to launch tests page. I want to doubleclick it, or launch `http-server`. Also all these sourceMaps - a separate bunch of data which can always break and kill debugging.

So I wrote a simple script to support `require` calls without any async shit, just as node does.

Look:
```js
<script src="node_modules/require-stub/index.js"></script>
<script src="node_modules/chai/chai.js" data-module="chai"></script>
<script>
	var chai = require("chai");
</script>
```

You ask how?
Via experimental `Object.observe` in Chrome and via `beforescriptexecuted` in Firefox.
Yes, it’s not very stable these days, it only works in Chrome with `experimental js` flag is on. It also would work in any browser supporting `Object.observe`, but I haven’t checked. It’s not the production-ready solution, but if you want to develop your code via tests in browser - it’s great for that.

You’re welcome :)!