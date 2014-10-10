/**
* Require stub for browser.
* Prepend this script in head.
* Set `data-module="name"` attribute on script tag to define module name to register (or it will be parsed as src file name).
*/
(function(global){
if (global.require) {
	throw Error('Turn off `require-stub`: another `require` is on.');
	return;
}

var prefix = 'require-stub-';
var firstRun = !localStorage.getItem(prefix + 'ready');

//try to look up for script (causes 404 requests)
require.lookUpModules = false;

//modules storage
var modules = require.modules = {};
var modulePaths = require.modulePaths = {};
var commonModulePaths = require.commonModulePaths = [
	'{{name}}.js',
	'./{{name}}.js',
	'../{{name}}.js',
	'../src/{{name}}.js',
	'../test/{{name}}.js',
	'../node_modules/{{name}}/{{name}}.js',
	'../node_modules/{{name}}/index.js',
	'../node_modules/{{name}}/main.js',
	'../node_modules/{{name}}/src/{{name}}.js',
	'../node_modules/{{name}}/lib/{{name}}.js',
	'../node_modules/{{name}}/lib/index.js',
	'../node_modules/{{name}}/dist/{{name}}.js',
	'node_modules/{{name}}/{{name}}.js',
	'node_modules/{{name}}/index.js',
	'node_modules/{{name}}/main.js',
	'node_modules/{{name}}/src/{{name}}.js',
	'node_modules/{{name}}/lib/{{name}}.js',
	'node_modules/{{name}}/lib/index.js',
	'node_modules/{{name}}/dist/{{name}}.js'
];

//script run emulation
var fakeCurrentScript, fakeStack = [];

if (firstRun){
	//save the fact that firstRun has passed
	// if (firstRun) localStorage.setItem(prefix + 'ready', true);

	//lookUp for modules first time
	// require.lookUpModules = true;
}



//export function
global.require = require;

//stupid require stub
function require(name){
	if (!name) return;

	name = name.toLowerCase();

	var result = getModule(name);

	// console.group('require', name, result)

	if (!result) {
		if (require.lookUpModules) {
			//try to resolve module
			for (var i = 0; i < commonModulePaths.length; i++){
				var path = commonModulePaths[i].replace(/{{name}}/ig, name);
				var request = resolveFile(path);
				if (request) {
					// console.log('found script', request)
					evalScript({code: request.response, src:path, 'data-module-name': name, 'name': name });
					// console.groupEnd()
					return getModule(name);
				}
			}
		}

		// console.groupEnd()
		throw Error('Can’t find module `' + name + '` in ' + getCurrentScript().src + ', include it first.');
	}

	console.groupEnd()

	return result;
}



//retrieve module from storage by name
function getModule(name){
	var currDir = getDir(getCurrentScript().src);
	var resolvedName =  resolvePath(currDir + name);
	var result = window[name] || modules[name] || modules[modulePaths[resolvedName]] || modules[modulePaths[resolvedName+'.js']];

	return result;
}
//return dir from path
function getDir(path){
	var arr = path.split(/[\\\/]/);
	arr.pop();
	return arr.join('/') + '/';
}
//return absolute path
function resolvePath(path){
	var a = document.createElement('a');
	a.href = path;
	return a.href;
}


//return file by path
function resolveFile(path){
	// console.log('resolve', path)
	//FIXME: XHR is forbidden without server. Try to resolve via script/image/etc
	try {
		request = new XMLHttpRequest();

		// `false` makes the request synchronous
		request.open('GET', path, false);
		request.send();
	}

	catch (e) {
		return false;
	}

	finally {
		if (request.status === 200) {
			// console.log('SUCCESS', request);
			return request;
		}
	}

	return false;
}

//eval & create fake script
function evalScript(obj){
	var name = obj.name;
	// console.group('eval', name)

	fakeCurrentScript = obj;
	fakeStack.push(obj);
	fakeCurrentScript.getAttribute = function(name){
		return this[name];
	}
	eval(obj.code);
	fakeStack.pop();
	fakeCurrentScript = fakeStack[fakeStack.length - 1];

	// console.log('endeval', name, getModule(name))
	// console.groupEnd();
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
var lastExports, lastScript, lastModuleName;

//hook for modules/exports accessors
function exportsHook(v){
	var script = getCurrentScript();

	//if script hasn’t changed - keep current exports
	if (!arguments.length && script === lastScript) return lastExports;

	//if script changed - create a new module with exports
	lastScript = script;
	var moduleName = parseModuleName(script);

	//ignore scripts with undefined moduleName/src
	if (!moduleName) throw Error('Can’t infer module name. Define it via `data-module="name"` attribute on the script.')

	//save new module path
	modulePaths[script.src] = moduleName;
	modulePaths[script.src.toLowerCase()] = moduleName;
	modulePaths[script.getAttribute('src')] = moduleName;

	//@deprecated if module exists - ignore saving
	// if (modules[moduleName]) return modules[moduleName];

	lastModuleName = moduleName;
	lastExports = v || {};

	// console.log('new module', moduleName);
	//else - save a new module (e.g. enot/index.js)
	modules[moduleName] = lastExports;

	//save no-js module name (e.g. enot/index)
	if (/\.js$/.test(moduleName)) moduleName = moduleName.slice(0, -3);
	modules[moduleName] = lastExports;

	//save package name (e.g. enot)
	moduleName = moduleName.split(/[\\\/]/)[0];
	modules[moduleName] = lastExports;


	return lastExports;
}


//try to retrieve module name from script tag
function parseModuleName(script){
	//name is clearly defined
	var moduleName = script.getAttribute('data-module-name');

	//return parsed name, if pointed
	if (moduleName) return moduleName.toLowerCase();

	//plugin is in the node_modules
	var path = script.src;

	//catch dirname after last node_modules dirname, if any
	var idx = path.lastIndexOf('node_modules');
	if (idx >= 0){
		path = path.slice(idx);
		var matchResult = /node_modules[\/\\](.+)/.exec(path);
		moduleName = matchResult[1];
	}

	//else take file name as the module name
	if (!moduleName) {
		moduleName = script.getAttribute('src');

		//clear name
		moduleName = moduleName.split(/[\\\/]/).pop().split('.').shift();
	}

	return moduleName.toLowerCase();
}


//get current script tag
function getCurrentScript(){
	if (fakeCurrentScript) return fakeCurrentScript;

	if (document.currentScript) return document.currentScript;

	var scripts = document.getElementsByTagName('script');
	return scripts[scripts.length - 1];
}


})(window);