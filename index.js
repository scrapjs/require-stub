/**
 * Require stub for browser.
 * Prepend this script in head.
 *
 * @module require-stub
 */


//TODO: require html as a string
//TODO: load remote requirements (github ones, like harthur/color)
//TODO: add splashscreen or some notification of initial loading
//TODO: make it work in web-workers


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
require.fetchFromGithub = false;

/** load dev deps (may cause a shitload of XHTTP traffic) */
require.loadDevDeps = false;


/** modules storage, moduleName: moduleScriptObject (name, src, exports)  */
var modules = require.modules = {};

/** paths-names dict, modulePath: moduleName */
var modulePaths = require.modulePaths = {};

/** packages storage: `moduleName:package`, `path:package` */
var packages = {};

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
	var selfPkg = requestClosestPkg(getAbsolutePath(''), true);

	//load browser builtins
	var currDir = getDir(getAbsolutePath(getCurrentScript().src));
	requestPkg(currDir);


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
function require(name) {
	var location = getCurrentScript().src || global.location + '';

	if (!name) throw Error('Bad module name `' + name + '`', location);

	console.groupCollapsed('require(\'' + name + '\') ', location);


	//if package redirect - use redirect name
	if (typeof packages[name] === 'string') {
		name = packages[name];
	}


	//try to fetch existing module
	var result = getModuleExports(unext(name.toLowerCase()));
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
		var sourceCode, path;

		//try to map to browser version (defined in "browser" dict in "package.json")
		if (pkg && pkg.browser && typeof pkg.browser !== 'string') {
			name = pkg.browser[name] || pkg.browser[unext(name) + '.js' ] || name;
		}

		//lower
		name = name.toLowerCase();

		//try to fetch saved in session storage module path
		//has to be after real paths in order to avoid recursions
		if (!sourceCode) {
			path = modulePathsCache[name];
			if (path) sourceCode = requestFile(path);
		}

		//if name starts with path symbols - try to reach relative path
		if (!sourceCode && /^\.\.|^[\\\/]|^\.[\\\/]/.test(name)) {
			//if it has extension - request file straightly
			//to ignore things like ., .., ./..
			// ./chai.js, /chai.js
			path = getAbsolutePath(currDir + name);
			if (path.slice(-3) === '.js' || path.slice(-5) === '.json'){
				sourceCode = requestFile(path);
			}

			// ./chai → ./chai.js
			if (!sourceCode) {
				path = getAbsolutePath(currDir + name + '.js');
				sourceCode = requestFile(path);
			}

			// ./chai → ./chai.json
			if (!sourceCode) {
				path = getAbsolutePath(currDir + name + '.json');
				sourceCode = requestFile(path);
			}

			// ./chai → ./chai/index.js
			if (!sourceCode) {
				path = getAbsolutePath(currDir + name + '/index.js');
				sourceCode = requestFile(path);
			}

			//if relative path triggered - set proper name
			// ./chai → module/chai/index.js
			if (sourceCode) {
				// name = name.replace(/^\.\//)
				name = name.replace(/\.[\\\/]/, currDir);
				name = name.replace(pkg._dir, pkg.name + '/');
			}
		}


		//if there is a package named by the first component of the required path - try to fetch module’s file 'a/b'
		if (!sourceCode) {
			var parts = name.split('/');

			if (parts.length > 1) {
				var modulePrefix = parts[0], tpkg;

				//ensure package is loaded, e. g. require('some-lib/x/y.js')
				tpkg = requestPkg(modulePrefix) || requestPkg(currDir + 'node_modules/' + modulePrefix);

				if (tpkg) {
					//require('util/') or require('util/inherits');
					var innerPath = getEntry(tpkg, parts.slice(1).join('/'));
					path = getAbsolutePath(tpkg._dir + innerPath);
					sourceCode = requestFile(path);
				}
			}
		}


		//try to fetch dependency from all the known (registered) packages
		if (!sourceCode) {
			var tPkg;
			if (packages[name] && typeof packages[name] !== 'string') {
				tPkg = packages[name];

				//ignore shimmed reference
				if (tPkg.browser && (tPkg.browser[name] === false || tPkg[normalizePath[name]] === false)) {
					console.groupEnd();
					return getModuleExports(name);
				}

				path = tPkg._dir + getEntry(tPkg);
				sourceCode = requestFile(path);
			}

			else {
				for (var pkgName in packages) {
					tPkg = packages[pkgName];
					if (tPkg && tPkg.name === name) {
						//fetch browser field beforehead
						path = tPkg._dir + getEntry(tPkg);
						sourceCode = requestFile(path);
						if (sourceCode) break;
					}
				}
			}
		}

		//if is not found, try to reach dependency from the current script's package.json (for modules which are not deps)
		if (!sourceCode && pkg) {
			var pkgDir = pkg._dir;

			//try to reach dependency’s package.json and get path from it
			var depPkg = requestPkg(pkgDir + 'node_modules/' + name);

			if (depPkg) {
				depPkg = normalizePkg(depPkg);
				path = depPkg._dir + getEntry(depPkg);
				sourceCode = requestFile(path);
			}
		}


		//if no folder guessed - try to load from github
		if (require.fetchFromGithub) {}
	}

	//if found - eval script
	if (sourceCode) {
		try {
			evalScript({code: sourceCode, src:path, 'data-module-name': name, 'name': name });
		} catch (e) {
			throw e;
		}
		finally{
			console.groupEnd();
		}

		return getModuleExports(name);
	}

	//close require group
	console.groupEnd();


	//save error to log
	var scriptSrc = getCurrentScript().src;
	scriptSrc = scriptSrc || global.location + '';
	var error = new Error('Can’t find module `' + name + '`. Possibly the module is not installed or package.json is not provided');

	errors.push(error);

	throw error;
}


/** retrieve module from storage by name */
function getModuleExports(name){
	var currDir = getDir(getCurrentScript().src);
	var resolvedName = getAbsolutePath(currDir + name);
	var md = modules[name] || modules[modulePaths[resolvedName]] || modules[modulePaths[resolvedName+'.js']];

	if (md) return md.exports;
}


/**
 * eval & create fake script
 * @param {Object} obj {code: sourceCode, src:path, 'data-module-name': name, 'name': name}
 */
var depth = 0, maxDepth = 30;
function evalScript(obj){
	var name = obj.name;

	//save module here (eval is a final step, so module is found)
	saveModulePath(name, obj.src);


	// console.groupCollapsed('eval', name, obj.src)

	//we need to keep fake <script> tags in order to comply with inner require calls, referencing .currentScript and .src attributes
	fakeCurrentScript = obj;
	fakeStack.push(obj);
	fakeCurrentScript.getAttribute = function(name){
		return this[name];
	};

	//create exports for the script (used within hookExports)
	if (!('exports' in obj)) obj.exports = {};

	//some module-related things
	if (!obj.paths) obj.paths = [];


	//save new module path
	modulePaths[obj.src] = name;
	modulePaths[obj.src.toLowerCase()] = name;
	modulePaths[obj.getAttribute('src')] = name;
	modules[name] = obj;
	modules[unext(name)] = obj;
	if (/(?:\/|index(?:\.js|\.json)?)$/.test(name)) {
		modules[name.split(/[\\\/]/)[0]] = obj;
	}


	try {
		//try to eval json first
		if (obj.src.slice(-5) === '.json') {
			obj.exports = JSON.parse(obj.code);
		}

		//eval fake script
		else {
			if (depth++ > maxDepth) throw Error('Too deep');
			var code = obj.code;

			code = ';(function(module, exports){' + code + '\n})(require.modules[\'' + name + '\'], require.modules[\'' + name + '\'].exports);';

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


/** Session storage source code paths saver */
function saveModulePath(name, val){
	modulePathsCache[name] = val;
	sessionStorage.setItem(modulePathsCacheKey, JSON.stringify(modulePathsCache));
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
	if (path[path.length - 1] === '/') path = path.slice(0, -1);
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
		normalizePkg(result);

		if (!packages[name]){
			packages[name] = result;
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
				if (!browserName) continue;

				parts = browserName.split('.');
				ext = parts[parts.length - 1];
				if (parts.length > 1 && /json|js|html/.test(ext)) {
					packages[depName] = browserName.replace(/^\./, name);
				}
				//require bound pkg
				else {
					packages[depName] = requestPkg(browserName);
				}
			}
		}
		if (require.loadDevDeps) {
			if (result.devDependencies){
				for (var depName in result.devDependencies){
					requestPkg(path + '/node_modules/' + depName);
				}
			}
		}

		return result;
	}
	return;
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

/** Get entry file from the package */
function getEntry(pkg, name){
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

		//map name, if map
		if (pkg.browser && typeof pkg.browser !== 'string') {
			name = pkg.browser[name] || pkg.browser[normalizePath(name)] || name;
		}
	}

	return normalizePath(name);
}


/**
 * Get rid of .extension
 */
function unext(name){
	if (/\.[a-z]+$/.test(name)) return name.split('.').slice(0, -1).join('.');
	return name;
}




/** Shim global module & exports */
// Listen to `module.exports` change
Object.defineProperty(global, 'module', {
	configurable: false,
	enumerable: false,
	get: warn,
	set: warn
});

//Listen to `exports` change
Object.defineProperty(global, 'exports', {
	configurable: false,
	enumerable: false,
	get: warn,
	set: warn
});

/** Simple exports hook */
function warn(moduleExports){
	throw Error('Please, use `require` to load ' + getCurrentScript().src + '.');
}



/** Define globals */
global.process = require('process');
global.Buffer = require('buffer').Buffer;


//FIXME: __filename, __dirname


})(window);