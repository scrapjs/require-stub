# Broswer `require()` for testing purposes

Hello, browserify.


You’re a great tool for production usage of require modules! 

But sometimes in development it is very annoying to compile your code `--standalone` in order just to launch tests in browser. I don’t want to run `watchify` task for getting my `test.html` either — it [tends to break](https://github.com/substack/watchify/issues/83) and it always has a lag of compilation. Also all these sourceMaps — a separate bunch of data increasing the size of files and which can always break and kill debugging.

I want just to doubleclick the `test.html`, or launch `http-server` in the project’s folder, and develop via tests as I used to when I didn’t know about node modules.

So I wrote a simple script to support `require` calls without any async things, just as node does. Just include your modules as scripts avoiding circular dependencies.


```shell
npm install require-stub
```

```html
<script src="node_modules/require-stub/index.js"></script>
<script src="node_modules/chai/chai.js" data-module-name="chai"></script>
<script src="node_modules/enot/index.js" data-module-name="enot"></script>
<script>
	var chai = require("chai");
	var enot = require("enot");
</script>
```

You can even run require in PhantomJS:

```
mocha-phantomjs test/index.html
```




######You ask how?

Via getters/setters on global `module.exports` ans `exports` variables.

Love,

Deema ©.
