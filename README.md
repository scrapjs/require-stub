# Broswer `require()` for testing purposes

[![NPM](https://nodei.co/npm/require-stub.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/require-stub/)

In development it is very annoying to browserify code `--standalone` in order just to launch tests in browser. Either running `watchify` task for getting `test.html` — it [tends to break](https://github.com/substack/watchify/issues/83) and it always has a lag of compilation. Also all these sourceMaps — a separate bunch of data increasing the size of files and which can always [break debugging](https://github.com/visionmedia/mocha/issues/550).

I want just to doubleclick the `test.html`, or launch `http-server` in the project’s folder, and develop via tests as I used to when I didn’t know about node modules.

So here is a script to support `require` calls synchronously in-browser. Don’t use it in production, under any circumstances.


```shell
npm install require-stub
```

```html
<!-- provide `reqiure` -->
<script src="node_modules/require-stub/index.js"></script>

<!-- use require -->
<script>
	var chai = require("chai");
	var enot = require("enot");

	//request from package.json
	var other = require("other-module");
</script>
```

If you find something isn’t working, report a [bug](https://github.com/dfcreative/require-stub/issues).



###### How does it work?

Via getters/setters on global `module.exports` ans `exports` variables. To load scripts used synchronous XMLHttpRequest. To resolve module paths used `package.json`, if present, and if not - path is guessed.
Required scripts are evaled, so to provide module scopes.


Best wishes,

Deema.


---

Unlicensed.
