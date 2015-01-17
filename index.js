/**
 * Require stub for browser.
 * Prepend this script in head.
 *
 * @module require-stub
 */


//TODO: use browserify to make build
//TODO: replace requestFile with require-file module
//TODO: harness extensions to handle files properly
//TODO: use https://github.com/lydell/resolve-url to resolve files
//TODO: require html as a string
//TODO: require yml/yaml as a string
//TODO: load remote requirements (github ones, like harthur/color)
//TODO: add splashscreen or some notification of initial loading
//TODO: make it work in web-workers
//TODO: package.json-less initial page tests
//TODO: lazify requirements (request pkg only when required)


;(function(global){
if (global.require) {
	throw Error('Turn off `require-stub`: another global `require` is on.');
}


/** try to look up for script (causes 404 requests) */
require.lookUpModules = true;

/** try to fetch requirement from github, if not found */
require.fetchFromGithub = false;

/** load dev deps (may cause a shitload of XHTTP traffic) */
require.loadDevDeps = false;

/** List of extension handlers for eval */
require.extensions = {
	'.json': function(){

	},
	'.js': function(){

	},
	'.html': function(){

	}
};


/** paths-names dict, `modulePath: module` */
var modulePaths = require.modulePaths = {};

/** packages storage: `moduleName:package` */
var packages = {};

/** package paths dict, `path:package` */
var packagePaths = {};

/** stack of errors to log */
var errors = [];

/** Dict of failed to load files */
var failedPaths = {};


//script run emulation
var fakeCurrentScript, fakeStack = [];


//try to load initial module package
try {
	console.groupCollapsed('package.json');

	// http://localhost:8000/
	var rootPath = getAbsolutePath('/');
	// http://localhost:8000/test/
	var currPath = getAbsolutePath('');

	//reach root (initial) package.json (closest one to the current url)
	var rootPkg = requestClosestPkg(getAbsolutePath(''), true);

	//load browser builtins
	var currDir = getDir(getAbsolutePath(getCurrentScript().src));
	requestPkg(currDir);

	if (!rootPkg) console.warn('Can’t find main package.json by `' + rootPath + '` nor by `' +  getAbsolutePath('') + '`.');
}
catch (e){
	throw e;
}
finally{
	console.groupEnd();
}


/** export function */
global.require = require;


/** require stub */
function require(name, currentModule) {
	if (!name) throw Error('Bad module name `' + name + '`', location);

	var origName = name;

	currentModule = currentModule || {};
	var location = currentModule.src || getCurrentScript().src || global.location + '';

	//overtake requiring non-relative names
	if (!isRelativePath(name)) {
		if (modulePaths[name]) return modulePaths[name].exports;
	}

	//if package redirects - use redirected name
	if (typeof packages[name] === 'string') {
		name = packages[name];
	}

	//try to fetch existing module
	if (modulePaths[name]) return modulePaths[name].exports;

	//if none - try to look up for module
	if (require.lookUpModules) {
		var sourceCode, path;

		console.groupCollapsed('require(\'' + origName + '\') ');

		//get current script dir
		var currDir = getDir(getAbsolutePath(location));

		//get curr package, if any
		var currPkg = requestClosestPkg(currDir);

		//map name within current package
		name = getMappedName(currPkg, name);

		//1. Relative path (starts with .) `./module, ./lib/module`, `..`
		if (isRelativePath(name)) {
			//find package. resolve to absolute path
			path = getAbsolutePath(currDir + name);
		}

		//1.1 Absolute paths
		else if (/^https?:|^[\\\/]/.test(name)) {
			path = getAbsolutePath(name);
		}


		//2. Compound package path `chai/lib/util`, `chai/`
		else {
			var parts = name.split('/');

			//find package to resolve relative to
			var targetPkg = packages[parts[0]] || requestPkg(currDir + 'node_modules/' + parts[0]);

			//if target package with current dir isn’t found - try to reach from root dir
			if (!targetPkg) targetPkg = requestPkg(rootPkg._dir + 'node_modules/' + parts[0]);

			if (!targetPkg) {
				console.groupEnd();
				throw new Error('Can’t find package.json for `' + name + '`.');
			}

			name = getMappedName(targetPkg, parts.slice(1).join('/'));

			//find package, resolve to absolute path
			path = getAbsolutePath(
				targetPkg._dir + name
			);
		}


		//4. Request file by path
		path = normalizePath(path);

		//path includes extension
		sourceCode = !!modulePaths[path] || requestFile(path);

		// ./chai → ./chai.js
		if (!sourceCode) {
			path = unext(path) + '.js';
			sourceCode = !!modulePaths[path] || requestFile(path);
		}

		// ./chai → ./chai.json
		if (!sourceCode) {
			path = unext(path) + '.json';
			sourceCode = !!modulePaths[path] || requestFile(path);
		}

		// ./chai → ./chai/index.js
		if (!sourceCode) {
			path = unext(path) + '/index.js';
			sourceCode = !!modulePaths[path] || requestFile(path);
		}


		//if source code was obtained before
		if (sourceCode === true) {
			console.groupEnd();
			return modulePaths[path].exports;
		}
		//if found - eval script
		else if (sourceCode) {
			try {
				evalScript({code: sourceCode, src:path, name: name });
			} catch (e) {
				throw e;
			}
			finally{
				console.groupEnd();
			}
			return modulePaths[path].exports;
		}

		console.groupEnd();
	}



	//save error to log
	var error = new Error('Can’t find module `' + name + '`. Possibly the module is not installed or package.json is not provided');

	errors.push(error);

	throw error;
}


/**
 * eval & create fake script
 * @param {Object} obj {code: sourceCode, src:path, 'name': name}
 */
var depth = 0, maxDepth = 30;
function evalScript(obj){
	var name = obj.name;

	// console.groupCollapsed('eval', name, obj)

	//we need to keep fake <script> tags in order to comply with inner require calls, referencing .currentScript and .src attributes
	fakeCurrentScript = obj;
	fakeStack.push(obj);
	fakeCurrentScript.getAttribute = function(name){
		return this[name];
	};

	//create exports for the script
	if (!('exports' in obj)) obj.exports = {};

	//some module-related things
	if (!obj.paths) obj.paths = [];


	//save new module & path
	modulePaths[obj.src] = obj;


	try {
		//try to eval json first
		if (obj.src.slice(-5) === '.json') {
			obj.exports = JSON.parse(obj.code);
		}

		//eval fake script
		else {
			if (depth++ > maxDepth) throw Error('Too deep');
			var code = obj.code;
			code = ';(function(module, exports, require, __filename, __dirname){' + code + '\n})(require.modulePaths[\'' + obj.src + '\'], require.modulePaths[\'' + obj.src + '\'].exports, function(name){return require(name, require.modulePaths[\'' + obj.src + '\'])}, \'' + obj.src + '\', \'' + getDir(obj.src) + '\');';

			//add source urls
			code += '\n//# sourceURL=' + obj.src;
			code += '\n//@ sourceURL=' + obj.src;

			eval(code);
			depth--;
		}
	}

	catch (e){
		//add filename to message
		e.message += ' in ' + obj.src;
		throw e;
	}

	finally {
		fakeStack.pop();
		fakeCurrentScript = fakeStack[fakeStack.length - 1];
		// console.groupEnd();
	}
}



/** get current script tag, taking into account fake scripts running */
function getCurrentScript(){
	if (fakeCurrentScript) return fakeCurrentScript;

	if (document.currentScript) return document.currentScript;

	var scripts = document.getElementsByTagName('script');
	return scripts[scripts.length - 1];
}



/** return dir from path */
function getDir(path){
	var arr = path.split(/[\\\/]/);
	arr.pop();
	return arr.join('/') + '/';
}


/** return absolute path */
function getAbsolutePath(path){
	var a = document.createElement('a');
	a.href = path;
	var absPath = a.href.split('?')[0];
	absPath = absPath.split('#')[0];
	return absPath;
	// return a.origin + a.pathname;
}


/** return file by path */
function requestFile(path){
	if (failedPaths[path]) return false;

	//FIXME: XHR is forbidden without server. Try to resolve via script/image/etc
	try {
		request = new XMLHttpRequest();

		// `false` makes the request synchronous
		request.open('GET', path, false);
		request.send();
	}

	catch (e) {
		failedPaths[path] = true;
		return false;
	}

	finally {
		//return successfull path
		if (request.status === 200) {
			//newline keeps non-falsy result
			return (request.responseText || request.response) + '\n';
		}
		//save failed path to ignore
		else {
			failedPaths[path] = true;
		}
	}

	return false;
}


/** Return closest package to the path */
function requestClosestPkg(path, force) {
	var file;
	while (path) {
		pkg = requestPkg(path, force);
		if (pkg) {
			return pkg;
		}
		path = path.slice(0, path.lastIndexOf('/'));
	}
	return {};
}


/**
 * Return package.json parsed by the path requested, or false
 */
function requestPkg(path, force){
	//return cached pkg
	if (!force && packagePaths[path]) {
		return packagePaths[path];
	}

	// console.groupCollapsed('requestPkg', path);

	//clean dir, add file pointer
	if (path[path.length - 1] === '/') path = path.slice(0, -1);
	file = requestFile(path + '/package.json');

	if (file) {
		var result = JSON.parse(file);

		//save path to package.json
		result._dir = path + '/';

		//save package
		var name = result.name || path.slice(path.lastIndexOf('/') + 1);

		//preset pkg name
		if (!result.name) result.name = name;
		normalizePkg(result);

		if (!packages[name]){
			packages[name] = result;

			//save path to fetch later
			packagePaths[path] = result;
			packagePaths[result._dir] = result;
		}

		//save all nested packages
		if (result.dependencies){
			for (var depName in result.dependencies){
				requestPkg(path + '/node_modules/' + depName);
			}
		}
		//save each browser binding as available package
		if (result.browser && typeof result.browser !== 'string'){
			var browserName, ext, parts;
			for (var depName in result.browser){
				browserName = result.browser[depName];

				//save package mapping, if it isn’t a path
				if (!packages[depName] && !isRelativePath(depName) && depName.split('/').length === 1) {
					//save empty module
					if (browserName === false) {
						continue;
					}
					//in case of to-package redirect save redirect
					else if (!isRelativePath(browserName)){
						requestPkg(path + '/node_modules/' + browserName);
						packages[depName] = browserName;
					}
					//in case of module reference - create faky package
					else {
						packages[depName] = getAbsolutePath(path + '/' + browserName);
					}
				}
			}
		}
		//FIXME: load devdeps harmlessly
		if (require.loadDevDeps) {
			if (result.devDependencies){
				for (var depName in result.devDependencies){
					requestPkg(path + '/node_modules/' + depName);
				}
			}
		}

		// console.groupEnd();
		return result;
	}

	// console.groupEnd();
	return;
}

/** whether path is relative */
function isRelativePath(str){
	return /^[\.]/.test(str);
}


/** Normalize package fields */
function normalizePkg(pkg){
	if (!pkg.main) {
		pkg.main = 'index';
	}

	// pkg.main = normalizePath(pkg.main);

	if (!pkg.browser) {
		pkg.browser = pkg.main;
	}

	if (typeof pkg.browser === 'string') {
		pkg.browser = normalizePath(pkg.browser);
	}


	return pkg;
}

/** Ensure path points to a file w/o shortcuts */
function normalizePath(path){
	if (path[path.length - 1] === '/' || path[path.length - 1] === '\\'){
		path += 'index.js';
	}
	else if (path.slice(-3) !== '.js' && path.slice(-5) !== '.json' && path.slice(-5) !== '.html') {
		path = unext(path) + '.js';
	}

	return path;
}

/** Map module name to the proper one for the package */
function getMappedName(pkg, name){
	if (pkg) {
		//get entry name, if none
		if (!name) {
			if (typeof pkg.browser === 'string') {
				name = pkg.browser;
			}
		}
		if (!name) {
			name = pkg.main || 'index';
		}

		//map name, if map is present
		if (pkg.browser && typeof pkg.browser !== 'string' && pkg.browser[name] || pkg.browser[normalizePath(name)]) {
			//FIXME: try to map `package/sub/module` → `./sub/module` and vv
			name = pkg.browser[name] || pkg.browser[normalizePath(name)] || name;

			if (isRelativePath(name)) name = getAbsolutePath(pkg._dir + name);
		}
	} else {
		if (!name) name = 'index';
	}

	return name;
}


/**
 * Get rid of .extension
 */
function unext(name){
	if (/\.[a-z]+$/.test(name)) return name.split('.').slice(0, -1).join('.');
	return name;
}


/** Define lazy globals */
Object.defineProperties(global, {
	process: {
		enumerable: true,
		configurable: true,
		get: function(){
			return require('process');
		}
	},
	Buffer: {
		enumerable: true,
		configurable: true,
		get: function(){
			return require('buffer').Buffer;
		}
	}
});


})(window);