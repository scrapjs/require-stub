/**
* Require stub for browser.
* Prepend this script in head.
* Set `data-module="name"` attribute on script tag to define module name to register (or it will be parsed as src file name).
* Works only in browsers supporting Object.observe (Chrome with flags)
*/

//module/exports changing observer to expose global variables
var module = {};
var exports = {};

var modules = {};
var modulePaths = {};

//stupid require stub
function require(name){
	// console.log('require', name+'.js', modulePaths[name+'.js'])
	return modules[name] || modules[modulePaths[name]] || modules[modulePaths[name+'.js']];
}

if (Object.observe) {
	Object.observe(module, function(changes){
		for (var i = changes.length; i--;){
			var change = changes[i];
			if (change.name === "exports" && change.type === "add"){
				var exports = change.object.exports;
				var script = document.currentScript;

				//ignore inline scripts
				if (!document.currentScript.src) return;

				//parse module name
				var moduleName = script.getAttribute('data-module');
				if (!moduleName) {
					moduleName = script.getAttribute('src');

					//clear name
					moduleName = moduleName.split(/[\\\/]/).pop().split('.').shift();
				}

				//save module path
				modulePaths[script.src] = moduleName;
				modulePaths[script.getAttribute('src')] = moduleName;

				//expose module to modules list (in order to get by require)
				modules[moduleName] = exports;
				delete module.exports;
			}
		}

		Object.observe(exports, function(){
			//TODO: save exports changes to current module
		})

	});
}

else {
	//TODO: listen to `onbeforescriptexecute` on Firefox.
}