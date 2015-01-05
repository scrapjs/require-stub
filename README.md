# Broswer `require()` for development

Provide synchronous `require` in browser.


```
$ npm install require-stub
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

Via getters/setters on global `module.exports` and `exports` variables. Synchronous XMLHttpRequest is used to load scripts. To resolve module paths is used `package.json`, if present, and if not - path is guessed.
Required scripts are evaled, so to provide module scopes.


# Precautions

* Don’t require stuff runtime: it is bad for performance, it produces lots of logs and it badly resolves deps, as far current script is known only during the initial run.
* If something causes recursion — clear session storage.
* Don’t use in production: dynamic evals proved to be ~3x slower than browserified code. Though it is good for perf testing.
* Avoid global variable name the same as any inner module name if it’s value isn’t the module itself.
* If you decide to declare modules as script tags - variable names conflict is unavoidable, so name vars differently.


Best wishes,

Deema.


<a href="UNLICENSE"><img src="http://upload.wikimedia.org/wikipedia/commons/6/62/PD-icon.svg" width="20"/></a>


[![NPM](https://nodei.co/npm/require-stub.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/require-stub/)