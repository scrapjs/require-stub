# Broswer `require()` for testing purposes

Hello, browserify. You’re a great tool, but it is very annoyingly time after time compile your code `--standalone` in order to just launch tests in browser. I don’t want to launch `watchify` task just to launch tests page. I want to doubleclick it, or launch `http-server`. Also all these sourceMaps - a separate bunch of data which can always break and kill debugging.

So I wrote a simple script to support `require` calls without any async shit, just as node does.

```shell
npm install require-stub
```

```html
<script src="node_modules/require-stub/index.js"></script>
<script src="node_modules/chai/chai.js" data-module="chai"></script>
<script>
	var chai = require("chai");
</script>
```

######You ask how?

Via getters/setters on global `module.exports` variable.

You’re welcome :)!

## License

MIT
