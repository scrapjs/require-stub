# Broswer `require()` for testing purposes

Hello, browserify.


You’re a great tool for production usage of require modules! 

But sometimes in development it is very annoying to compile your code `--standalone` in order just to launch tests in browser. I don’t want to run `watchify` task for getting my `test.html` either — it [tends to break](https://github.com/substack/watchify/issues/83) and it always has a lag of compilation. Also all these sourceMaps — a separate bunch of data increasing the size of files and which can always break and kill debugging.

I want just to doubleclick the `test.html`, or launch `http-server` in the project’s folder, and develop via tests as I used to when I didn’t know about node modules.

So I wrote a simple script to support `require` calls synchronously. Include your modules as scripts avoiding circular dependencies and that’s all.


```shell
npm install require-stub
```

```html
<script src="node_modules/require-stub/index.js"></script>
<script src="node_modules/chai/chai.js"></script>
<script src="node_modules/enot/index.js"></script>
<script>
	var chai = require("chai");
	var enot = require("enot");
</script>
```


If something goes wrong, try to set `data-module-name` on script:

```html
<script src="../index.js" data-module-name="special-module"></script>
<script>
require('special-module');
</script>
```

If that doesn’t help, seems that you have a circular dependency within modules, so try to avoid it.
If you’re sure that it’s not, then report a [bug](https://github.com/dfcreative/require-stub/issues).



###### How does it work?

Via getters/setters on global `module.exports` ans `exports` variables.

Best wishes,

Deema ©.
