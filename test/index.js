describe('require-stub cases', function(){
	it('external module', function(){
		var modular = require('modular');
		assert.equal(modular, 123);
	});

	it('external exports', function(){
		var exporter = require('exporter');
		assert.equal(exporter.x, 123)
	});

	it('external module.exports', function(){
		var me = require('modular-exporter');
		assert.equal(me.x, 1);

		var me2 = require('modular-exporter-2');
		assert.equal(me2.x, 2)
		assert.equal(me.x, 1)
	});

	it('external relaitve path', function(){
		var spec = require('./special-module');
		assert.equal(spec, 4);
	});

	it.skip('external name', function(){
	// <script src="./other-module.js" data-module-name="other"></script>
	// <script>
	// 	var oth = require('other');
	// 	assert.equal(oth, 2);
	// </script>
	});


	it('inline undefined', function(){
		assert.throws(function(){
			exports.x = 12
		})
	});

	it.skip('inline exports', function(){
	// <script data-module-name="inliner">
	// 	exports.x = 12
	// </script>
	// <script>
	// 	var inl = require('inliner');
	// 	assert.equal(inl.x, 12)
	// </script>
	});

	it.skip('Short module name', function(){
	// <script src="./src/short-module.js"></script>
	// 	var a = require('short-module');
	// 	assert.equal(a, 1)
	// </script>
	});

	it('Nested module', function(){
		assert.equal(require('innerinner'), 1)
	});

	it.skip('Not hiding the inter-error', function(){
		window.addEventListener('load', function(){
			console.info('Uncaught AssertionError: expected 1 to equal 2 is ok')
		});
		assert.equal(1,2);
	});

	it('CamelCased module', function(){
		assert.equal(require('./camelmodule'), 'CamelModuleExports')
		assert.equal(require('./CamelModule'), 'CamelModuleExports')
	});

	it('require nonexisting module', function(){
		assert.throws(function(){
			require('abc');
		});
	});

	it('guess-path module', function(){
		var a = require('./guess-path');
		assert.equal(a, 1);
	});


	it('package.json paths', function(){
		// window.addEventListener('load', function(){
		// 	console.info('Can’t find module `none` is ok')
		// });

		assert.throws(function(){
			var x = require('x');
			assert.equal(x.x, 1);
			assert.equal(x.y, 2);
			var y = require('y');
			assert.equal(y, 2);

			var z = require('z');
			assert.equal(z, 2);
		});
	});


	it('interfering namespaces', function(){
		var i1 = require('./i1');
		assert.deepEqual(i1, {i:1});

		var i2 = require('./i2');
		assert.deepEqual(i2, {i:2});
		assert.deepEqual(i1, {i:1});
		assert.notEqual(i1, i2);
	});


	it('exports.something = require(\'something\') case', function(){
		var e1 = require('./e1');

		assert.equal(e1.a, 1);
		assert.equal(e1.b.c, 2);
		assert.equal(e1.b.d, 3);
	});


	it('submodule', function(){
		var sm = require('mymod/some');
		assert.equal(sm, 1);
	});


	it('json path', function(){
		var ijson = require('./i');
		assert.deepEqual(ijson, {a:1});
	});


	it('inner module camel name', function(){
		var i = require('x/Some');
		assert.equal(i, 123);
	});


	it('conflicting relative module names', function(){
		var x = require('ext-e1');
		assert.equal(x, 345);
	});


	it.skip('require index in root dir', function(){
		var x = require('./');
		assert.equal(x, 123);
	});


	it('require name as string method', function(){
		var c = require('contains');
	});

	it('core modules', function(){
		require('assert');
		require('buffer');
		require('child_process');
		require('cluster');
		require('crypto');
		require('dns');
		require('domain');
		require('events');
		require('fs');
		require('http');
		require('https');
		require('net');
		require('os');
		require('path');
		require('punycode');
		require('querystring');
		require('readline');
		require('stream');
		require('string_decoder');
		require('tls');
		require('dgram');
		require('url');
		require('util');
		require('vm');
		require('zlib');
	});


	it('circular dep', function(){
		var a = require('./circular-a');
		var b = require('./circular-b');
		assert.equal(a,b);
		assert.equal(a.x, 1);
		assert.equal(a.y, 2);
	});

	it('Require exposed case', function(){
		window['./exports-prop'] = require('./exports-prop').z;
		assert.equal(window['./exports-prop'], 2);
		var abcd = require('./exports-prop').z;
		assert.equal(abcd, 2);
	});
});