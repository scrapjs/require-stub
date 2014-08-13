# Broswer `require()` for testing purposes

Hello, browserify. You’re a great tool, but it is very annoyingly time after time compile your code `--standalone` in order to just launch tests in browser. I don’t want to launch `watchify` task just to launch tests page. I want to doubleclick it, or launch `http-server` it the project’s folder. Also all these sourceMaps - a separate bunch of data which can always break and kill debugging.

So I wrote a simple script to support `require` calls without any async shit, just as node does. It wasn’t that difficult at all.

```shell
npm install require-stub
```

```html
<script src="node_modules/require-stub/index.js"></script>
<script src="node_modules/chai/chai.js" data-module="chai"></script>
<script src="node_modules/enot/index.js" data-module="enot"></script>
<script>
	var chai = require("chai");
	var enot = require("enot");
</script>
```


You can even run PhantomJS with the next config:

`test/index.html`:
```html
<!doctype html>
<meta charset="utf-8">
<title>Enot tests</title>

<link rel="stylesheet" href="../node_modules/mocha/mocha.css" />

<div id="mocha"></div>

<script src="../node_modules/require-stub/index.js"></script>
<script src="../node_modules/mocha/mocha.js"></script>
<script src="../node_modules/chai/chai.js"></script>

<script>
	mocha.setup('bdd');
</script>

<script src="../index.js" data-module="my-module-name"></script>
<script src="index.js"></script>

<script>
	if (window.mochaPhantomJS) {
		mochaPhantomJS.run();
	}
	else {
		mocha.checkLeaks();
		mocha.run();
	}
</script>
```

```
mocha-phantomjs test/index.html
```

######You ask how?

Via getters/setters on global `module.exports` ans `exports` variables.

You’re welcome :)!

## License

MIT