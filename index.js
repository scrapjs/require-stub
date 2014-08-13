/**
* Require stub for browser.
* Prepend this script in head.
* Set `data-module="name"` attribute on script tag to define module name to register (or it will be parsed as src file name).
*/

var modules = {};
var modulePaths = {};

//stupid require stub
function require(name){
	console.log('require', name, modules)
	return window[name] || modules[name] || modules[modulePaths[name]] || modules[modulePaths[name+'.js']];
}

/** Setters method */
var module = window.module = {};
var currentExports;

Object.defineProperty(module, 'exports', {
	configurable: true,
	enumerable: true,
	get: function(){
		return currentExports;
	},
	set: function(v){
		// console.log("set module", v)

		//save value
		currentExports = v;

		//save script
		var script = document.currentScript;
		var moduleName = parseModuleName(script);

 		//ignore scripts with undefined moduleName/src
		if (!moduleName) return;

		//save module path
		// console.log("save mod", moduleName, script)
		modulePaths[script.src] = moduleName;
		modulePaths[script.getAttribute('src')] = moduleName;

		modules[moduleName] = v;
	}
})

//try to retrieve module name from script tag
function parseModuleName(script){
	var moduleName = script.getAttribute('data-module');
	if (!moduleName) {
		moduleName = script.getAttribute('src');

		//clear name
		moduleName = moduleName.split(/[\\\/]/).pop().split('.').shift();
	}
	return moduleName;
}