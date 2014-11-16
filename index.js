/**
* Require stub for browser.
* Prepend this script in head.
* Set `data-module="name"` attribute on script tag to define module name to register (or it will be parsed as src file name).
*/

//TODO: wrap requirements into scopes (seems that it’s ok now - why?)
//TODO: load remote requirements
//TODO: add splashscreen or some notification


(function(global){
if (global.require) {
	throw Error('Turn off `require-stub`: another `require` is on.');
	return;
}


/** Cache of once found filepaths. Use them first to resolve modules. */
var modulePathsCacheKey = 'rs-paths';
var modulePathsCache = sessionStorage.getItem(modulePathsCacheKey);
if (modulePathsCache) modulePathsCache = JSON.parse(modulePathsCache);
else modulePathsCache = {};


/** try to look up for script (causes 404 requests) */
require.lookUpModules = true;

/** try to guess file path, if no package.json found (causes intense 404 traffic)*/
require.guessPath = true;

/** try to fetch requirement from github, if not found */
require.fetchFromGithub = true;


/** modules storage, moduleName: moduleExports  */
var modules = require.modules = {};

/** paths-names dict, modulePath: moduleName */
var modulePaths = require.modulePaths = {};

/** packages storage: `moduleName:package`, `path:package` */
var packages = {};

/** stack of errors to log */
var errors = [];

/** list of native node modules */
var nativeModules = {
	'assert': false,
	'buffer': true,
	'child_process': true,
	'cluster': true,
	'crypto': false,
	'dns': true,
	'domain': true,
	'events': true,
	'fs': true,
	'http': true,
	'https': true,
	'net': true,
	'os': true,
	'path': true,
	'punycode': true,
	'querystring': true,
	'readline': true,
	'stream': true,
	'string_decoder': true,
	'tls': true,
	'dgram': true,
	'url': true,
	'util': false,
	'vm': true,
	'zlib': true
};


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
	var selfPkg = requestClosestPkg(getAbsolutePath(''), true);

	//clear cache, if current package has changed
	var savedModuleName = sessionStorage.getItem('rs-saved-name');
	if (savedModuleName && selfPkg.name !== savedModuleName || savedModuleName === null) {
		sessionStorage.clear();
		sessionStorage.setItem('rs-saved-name', selfPkg.name);
	}

	if (!selfPkg) console.warn('Can’t find main package.json by `' + rootPath + '` nor by `' +  getAbsolutePath('') + '`.');

} catch (e){
	throw e;
}
finally{
	console.groupEnd();
}



/** export function */
global.require = require;


/** require stub */
function require(name){
	var location = getCurrentScript().src || global.location + '';

	if (!name) throw Error('Bad module name `' + name + '`', location);

	console.groupCollapsed('require(\'' + name + '\') ', location);

	//try to fetch existing module
	var result = getModule(unjs(name.toLowerCase()));
	if (result) {
		console.groupEnd();
		return result;
	}

	//get current script dir
	var currDir = getDir(getAbsolutePath(getCurrentScript().src));
	//get curr package, if any
	var pkg = requestClosestPkg(currDir);


	//if not - try to look up for module
	if (require.lookUpModules) {
		//clean js suffix
		name = unjs(name);

		//try to map to browser version (defined in "browser" dict in "package.json")
		if (pkg && pkg.browser) {
			name = pkg.browser[name] || pkg.browser[name + '.js' ] || name;
		}

		name = unjs(name);

		//clear dir
		if (name.slice(-1) === '/') name = name.slice(0, -1);


		//try to fetch saved in session storage module path
		var path = modulePathsCache[name];
		var sourceCode;
		if (path) {
			sourceCode = requestFile(path);
		}

		//try to reach module by it’s name as path
		//./chai/a.js
		if (!sourceCode) {
			path = getAbsolutePath(currDir + name + '.js');
			var sourceCode = requestFile(path);
		}

		//./chai/a/index.js
		if (!sourceCode) {
			path = getAbsolutePath(currDir + name + '/index.js');
			sourceCode = requestFile(path);
		}

		//if found - eval script
		if (sourceCode) {
			try {
				evalScript({code: sourceCode, src:path, 'data-module-name': name, 'name': name });
			} catch(e) {throw e;}
			finally{
				console.groupEnd();
			}
			return getModule(name);
		}


		//if is not found, try to reach dependency from the current script package.json
		if (pkg) {
			var pkgDir = pkg._dir;
			console.log('load dependency from', pkgDir + 'package.json');

			//try to reach dependency’s package.json and get path from it
			var depPkg = requestPkg(pkgDir + 'node_modules/' + name + '/');
			if (depPkg) {
				if (!depPkg.browser) {
					depPkg.browser = 'index.js';
				}
				else {
					depPkg.browser = unjs(depPkg.browser) + '.js';
				}
				if (!depPkg.main) {
					depPkg.main = 'index.js';
				}
				else {
					depPkg.main = unjs(depPkg.main) + '.js';
				}
				path = depPkg._dir + depPkg.browser;
				sourceCode = requestFile(path);
				if (sourceCode) {
					try{
						evalScript({code: sourceCode, src:path, 'data-module-name': name, 'name': name });
					}catch(e){throw e}
					finally{
						console.groupEnd();
					}
					return getModule(name);
				}
			}
		}

		//try to fetch dependency from all the known (registered) packages
		var tPkg;
		for (var pkgName in packages) {
			tPkg = packages[pkgName];
			if (tPkg.name === name) {
				//fetch browser field beforehead
				path = tPkg._dir + tPkg.browser;
				sourceCode = requestFile(path);
				if (!sourceCode) {
					path = tPkg._dir + tPkg.main;
					sourceCode = requestFile(path);
				}
				if (sourceCode) {
					try{
						evalScript({code: sourceCode, src:path, 'data-module-name': name, 'name': name });
					}catch(e){throw e}
					finally{
						console.groupEnd();
					}
					return getModule(name);
				}
			}
		}


		//if is not found - try to fetch from node_modules folder, if any (no need package.json)
		if (require.guessPath) {
			var commonPaths = [
				'node_modules/{{name}}/index.js',
				'node_modules/{{name}}/{{name}}.js',
				'node_modules/{{name}}/lib/{{name}}.js',
				'node_modules/{{name}}/lib/index.js',
				'node_modules/{{name}}/src/{{name}}.js',
				'node_modules/{{name}}/src/index.js',
				'node_modules/{{name}}/dist/{{name}}.js'
			];

			//try relative node_modules folder
			for (var i = 0, path; i < commonPaths.length; i++){
				path = commonPaths[i].replace(/{{name}}/ig, name);
				path = currDir + path;
				sourceCode = requestFile(path);
				if (sourceCode) {
					try{evalScript({code: sourceCode, src:path, 'data-module-name': name, 'name': name });
					}catch(e){throw e}
					finally{
						console.groupEnd();
					}
					return getModule(name);
				}
			}

			//try initial node_modules folder
			if (currPath !== currDir) {
				for (var i = 0, path; i < commonPaths.length; i++){
					path = commonPaths[i].replace(/{{name}}/ig, name);
					path = currPath + path;
					sourceCode = requestFile(path);
					if (sourceCode) {
						try{evalScript({code: sourceCode, src:path, 'data-module-name': name, 'name': name });
						}catch(e){throw e}
						finally{
							console.groupEnd();
						}
						return getModule(name);
					}
				}
			}

			//try root node_modules folder
			if (rootPath !== currPath && rootPath !== currDir) {
				for (var i = 0, path; i < commonPaths.length; i++){
					path = commonPaths[i].replace(/{{name}}/ig, name);
					path = rootPath + path;
					sourceCode = requestFile(path);
					if (sourceCode) {
						try{evalScript({code: sourceCode, src:path, 'data-module-name': name, 'name': name });
						}catch(e){throw e}
						finally{
							console.groupEnd();
						}
						return getModule(name);
					}
				}
			}
		}


		//if no folder guessed - try to load from github
		if (require.fetchFromGithub) {

		}
	}

	//close require group
	console.groupEnd();


	//force native modules throw error
	if (nativeModules[name]) throw Error('Can’t include native node module `' + name + '` in browser');


	//save error to log
	var scriptSrc = getCurrentScript().src;
	scriptSrc = scriptSrc || global.location + '';
	var error = new Error('Can’t find module `' + name + '`. Possibly the module is not installed or package.json is not provided');

	errors.push(error);

	throw error;
}


/** retrieve module from storage by name */
function getModule(name){
	var currDir = getDir(getCurrentScript().src);
	var resolvedName = getAbsolutePath(currDir + name);
	var result = global[name] || global[name[0].toUpperCase() + name.slice(1)] || modules[name] || modules[modulePaths[resolvedName]] || modules[modulePaths[resolvedName+'.js']];

	return result;
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
			return request.responseText || request.response;
		}
	}

	return false;
}


/** Return closest package to the path */
function requestClosestPkg(path, force) {
	var file;
	if (path[path.length - 1] === '/') path = path.slice(0, -1);
	while (path) {
		pkg = requestPkg(path, force);
		if (pkg) {
			return pkg;
		}
		path = path.slice(0, path.lastIndexOf('/'));
	}
	return false;
}


/**
 * Return package.json parsed by the path requested, or false
 */
function requestPkg(path, force){
	//return cached pkg
	if (!force && packages[path]) {
		return packages[path];
	}

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
		if (!result.browser) result.browser = 'index.js';
		if (!result.main) result.main = 'index.js';

		if (!packages[name]){
			packages[name] = result;
			packages[path] = result;
		}

		//save all nested packages
		if (result.dependencies){
			for (var depName in result.dependencies){
				requestPkg(path + '/node_modules/' + depName);
			}
		}

		return result;
	}
	return false;
}


/**
 * eval & create fake script
 * @param {Object} obj {code: sourceCode, src:path, 'data-module-name': name, 'name': name}
 */
function evalScript(obj){
	var name = obj.name;

	//create exports for the script
	obj.exports = {};

	// console.groupCollapsed('eval', name)

	//we need to keep fake <script> tags in order to comply with inner require calls, referencing .currentScript and .src attributes
	fakeCurrentScript = obj;
	fakeStack.push(obj);
	fakeCurrentScript.getAttribute = function(name){
		return this[name];
	};
	try {
		saveModulePath(name, obj.src);
		eval(obj.code);
	}
	catch (e){
		//add filename
		e.message += '. ' + obj.src;
		throw e;
	}
	finally{
		fakeStack.pop();
		fakeCurrentScript = fakeStack[fakeStack.length - 1];
	}

	// console.log('endeval', name, getModule(name))
	// console.groupEnd();
}


/** Export module emulation */
var module = global.module = {};


// Listen to `module.exports` change
Object.defineProperty(module, 'exports', {
	configurable: false,
	enumerable: false,
	get: hookExports,
	set: hookExports
});

//Listen to `exports` change
Object.defineProperty(global, 'exports', {
	configurable: false,
	enumerable: false,
	get: hookExports,
	set: hookExports
});


//any time exports required winthin the new script - create a new module
var lastExports, lastScript, lastModuleName;


/** hook for modules/exports accessors */
function hookExports(moduleExports){
	var script = getCurrentScript();

	//if script hasn’t changed - keep current exports
	if (!arguments.length && script === lastScript) return lastExports;

	//if script changed - create a new module with exports
	lastScript = script;
	var moduleName = figureOutModuleName(script);

	//ignore scripts with undefined moduleName/src
	if (!moduleName) throw Error('Can’t figure out module name. Define it via `data-module="name"` attribute on the script.')

	//save new module path
	modulePaths[script.src] = moduleName;
	modulePaths[script.src.toLowerCase()] = moduleName;
	modulePaths[script.getAttribute('src')] = moduleName;

	//if exports.something = ...
	lastExports = moduleExports ? moduleExports : script.exports || {};

	lastModuleName = moduleName;

	// console.log('new module', moduleName);
	//else - save a new module (e.g. enot/index.js)
	modules[moduleName] = lastExports;

	//save no-js module name (e.g. enot/index)
	moduleName = unjs(moduleName);
	modules[moduleName] = lastExports;

	//save package name (e.g. enot)
	moduleName = moduleName.split(/[\\\/]/)[0];
	modules[moduleName] = lastExports;

	return lastExports;
}

/** Session storage source code saver */
function saveModulePath (name, val){
	modulePathsCache[name] = val;
	sessionStorage.setItem(modulePathsCacheKey, JSON.stringify(modulePathsCache));
}


/** try to retrieve module name from script tag */
function figureOutModuleName(script){
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


/** get current script tag, taking into account fake scripts running */
function getCurrentScript(){
	if (fakeCurrentScript) return fakeCurrentScript;

	if (document.currentScript) return document.currentScript;

	var scripts = document.getElementsByTagName('script');
	return scripts[scripts.length - 1];
}



/**
 * Get rid of .js suffix
 */
function unjs(name){
	if (/\.js$/.test(name)) return name.slice(0, -3);
	return name;
}


})(window);