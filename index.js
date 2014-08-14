/**
* Require stub for browser.
* Prepend this script in head.
* Set `data-module="name"` attribute on script tag to define module name to register (or it will be parsed as src file name).
*/

var modules = {};
var modulePaths = {};

//stupid require stub
function require(name){
	var result = window[name] || modules[name] || modules[modulePaths[name]] || modules[modulePaths[name+'.js']];
	// console.log('require', name, result)

	if (!result) throw Error('Can’t find module `' + name + '`. Please make sure the proper script tag is attached and data-module-name attribute is defined.');

	return result;
}

var module = window.module = {};

// Listen to `module.exports` change
Object.defineProperty(module, 'exports', {
	configurable: false,
	enumerable: false,
	get: exportsHook,
	set: exportsHook
});

//Listen to `exports` change
Object.defineProperty(window, 'exports', {
	configurable: false,
	enumerable: false,
	get: exportsHook,
	set: exportsHook
});


//any time exports required winthin the new script - create a new module
var currentExports, currentScript, currentModuleName;

function exportsHook(v){
	var script = getCurrentScript();

	//if script hasn’t changed - keep current exports
	if (!arguments.length && script === currentScript) return currentExports;

	//if script changed - create a new module with exports
	currentScript = script;
	var moduleName = parseModuleName(script);

	//ignore scripts with undefined moduleName/src
	if (!moduleName) throw Error('Can’t infer module name. Define it via `data-module="name"` attribute on script.')

	currentModuleName = moduleName;
	currentExports = v || {};

	//save new module
	modulePaths[script.src] = moduleName;
	modulePaths[script.getAttribute('src')] = moduleName;

	modules[moduleName] = currentExports;

	return currentExports;
}




//try to retrieve module name from script tag
function parseModuleName(script){
	//name is clearly defined
	var moduleName = script.getAttribute('data-module-name');

	//plugin is in the node_modules
	var path = script.src;
	//FIXME: catch dirname
	var matchResult = /node_modules[\/\\]([a-zA-Z0-9-_\.\s\&\$\#\@\(\)\:]+)/.exec(path);

	if (matchResult) {
		moduleName = matchResult[1];
	}

	//else take file name as the module name
	if (!moduleName) {
		moduleName = script.getAttribute('src');

		//clear name
		moduleName = moduleName.split(/[\\\/]/).pop().split('.').shift();
	}

	return moduleName;
}

function getCurrentScript(){
	if (document.currentScript) return document.currentScript;

	var scripts = document.getElementsByTagName('script');
	return scripts[scripts.length - 1];
}