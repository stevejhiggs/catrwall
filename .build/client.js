/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _client = __webpack_require__(1);

	var _client2 = _interopRequireDefault(_client);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var hz = (0, _client2['default'])({
	  secure: false
	});

	hz.connect();

	var cats = hz('cats');
	cats.fetch().subscribe(function (items) {
	  items.forEach(function (item) {
	    // Each result from the chat collection
	    //  will pass through this function
	    console.log(item);
	  });
	},
	// If an error occurs, this function
	//  will execute with the `err` message
	function (err) {
	  console.log(err);
	});

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _Observable = __webpack_require__(2);

	__webpack_require__(18);

	__webpack_require__(24);

	__webpack_require__(34);

	__webpack_require__(36);

	__webpack_require__(42);

	__webpack_require__(44);

	__webpack_require__(46);

	var _require = __webpack_require__(48);

	// Extra operators not used, but useful to Horizon end-users


	var Collection = _require.Collection;
	var UserDataTerm = _require.UserDataTerm;

	var HorizonSocket = __webpack_require__(159);

	var _require2 = __webpack_require__(168);

	var log = _require2.log;
	var logError = _require2.logError;
	var enableLogging = _require2.enableLogging;

	var _require3 = __webpack_require__(201);

	var authEndpoint = _require3.authEndpoint;
	var TokenStorage = _require3.TokenStorage;
	var clearAuthTokens = _require3.clearAuthTokens;

	var defaultHost = typeof window !== 'undefined' && window.location && '' + window.location.host || 'localhost:8181';
	var defaultSecure = typeof window !== 'undefined' && window.location && window.location.protocol === 'https:' || false;

	function Horizon() {
	  var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

	  var _ref$host = _ref.host;
	  var host = _ref$host === undefined ? defaultHost : _ref$host;
	  var _ref$secure = _ref.secure;
	  var secure = _ref$secure === undefined ? defaultSecure : _ref$secure;
	  var _ref$path = _ref.path;
	  var path = _ref$path === undefined ? 'horizon' : _ref$path;
	  var _ref$lazyWrites = _ref.lazyWrites;
	  var lazyWrites = _ref$lazyWrites === undefined ? false : _ref$lazyWrites;
	  var _ref$authType = _ref.authType;
	  var authType = _ref$authType === undefined ? 'unauthenticated' : _ref$authType;

	  // If we're in a redirection from OAuth, store the auth token for
	  // this user in localStorage.

	  var tokenStorage = new TokenStorage({ authType: authType, path: path });
	  tokenStorage.setAuthFromQueryParams();

	  var socket = new HorizonSocket(host, secure, path, tokenStorage.handshake.bind(tokenStorage));

	  // Store whatever token we get back from the server when we get a
	  // handshake response
	  socket.handshake.subscribe({
	    next: function next(handshake) {
	      if (authType !== 'unauthenticated') {
	        tokenStorage.set(handshake.token);
	      }
	    },
	    error: function error(err) {
	      if (/JsonWebTokenError|TokenExpiredError/.test(err.message)) {
	        console.error('Horizon: clearing token storage since auth failed');
	        tokenStorage.remove();
	      }
	    }
	  });

	  // This is the object returned by the Horizon function. It's a
	  // function so we can construct a collection simply by calling it
	  // like horizon('my_collection')
	  function horizon(name) {
	    return new Collection(sendRequest, name, lazyWrites);
	  }

	  horizon.currentUser = function () {
	    return new UserDataTerm(horizon, socket.handshake, socket);
	  };

	  horizon.disconnect = function () {
	    socket.complete();
	  };

	  // Dummy subscription to force it to connect to the
	  // server. Optionally provide an error handling function if the
	  // socket experiences an error.
	  // Note: Users of the Observable interface shouldn't need this
	  horizon.connect = function () {
	    var onError = arguments.length <= 0 || arguments[0] === undefined ? function (err) {
	      console.error('Received an error: ' + err);
	    } : arguments[0];

	    socket.subscribe(function () {}, onError);
	  };

	  // Either subscribe to status updates, or return an observable with
	  // the current status and all subsequent status changes.
	  horizon.status = subscribeOrObservable(socket.status);

	  // Convenience method for finding out when disconnected
	  horizon.onDisconnected = subscribeOrObservable(socket.status.filter(function (x) {
	    return x.type === 'disconnected';
	  }));

	  // Convenience method for finding out when ready
	  horizon.onReady = subscribeOrObservable(socket.status.filter(function (x) {
	    return x.type === 'ready';
	  }));

	  // Convenience method for finding out when an error occurs
	  horizon.onSocketError = subscribeOrObservable(socket.status.filter(function (x) {
	    return x.type === 'error';
	  }));

	  horizon.utensils = {
	    sendRequest: sendRequest,
	    tokenStorage: tokenStorage,
	    handshake: socket.handshake
	  };
	  Object.freeze(horizon.utensils);

	  horizon._authMethods = null;
	  horizon._horizonPath = path;
	  horizon.authEndpoint = authEndpoint;
	  horizon.hasAuthToken = tokenStorage.hasAuthToken.bind(tokenStorage);

	  return horizon;

	  // Sends a horizon protocol request to the server, and pulls the data
	  // portion of the response out.
	  function sendRequest(type, options) {
	    // Both remove and removeAll use the type 'remove' in the protocol
	    var normalizedType = type === 'removeAll' ? 'remove' : type;
	    return socket.makeRequest({ type: normalizedType, options: options }) // send the raw request
	    .concatMap(function (resp) {
	      // unroll arrays being returned
	      if (resp.data) {
	        return _Observable.Observable.from(resp.data);
	      } else {
	        // Still need to emit a document even if we have no new data
	        return _Observable.Observable.from([{ state: resp.state, type: resp.type }]);
	      }
	    })['catch'](function (e) {
	      return _Observable.Observable.create(function (subscriber) {
	        subscriber.error(e);
	      });
	    }); // on error, strip error message
	  }
	}

	function subscribeOrObservable(observable) {
	  return function () {
	    if (arguments.length > 0) {
	      return observable.subscribe.apply(observable, arguments);
	    } else {
	      return observable;
	    }
	  };
	}

	Horizon.log = log;
	Horizon.logError = logError;
	Horizon.enableLogging = enableLogging;
	Horizon.Socket = HorizonSocket;
	Horizon.clearAuthTokens = clearAuthTokens;

	module.exports = Horizon;
	//# sourceMappingURL=index.js.map

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var root_1 = __webpack_require__(3);
	var toSubscriber_1 = __webpack_require__(5);
	var $$observable = __webpack_require__(16);
	/**
	 * A representation of any set of values over any amount of time. This the most basic building block
	 * of RxJS.
	 *
	 * @class Observable<T>
	 */
	var Observable = function () {
	    /**
	     * @constructor
	     * @param {Function} subscribe the function that is  called when the Observable is
	     * initially subscribed to. This function is given a Subscriber, to which new values
	     * can be `next`ed, or an `error` method can be called to raise an error, or
	     * `complete` can be called to notify of a successful completion.
	     */
	    function Observable(subscribe) {
	        this._isScalar = false;
	        if (subscribe) {
	            this._subscribe = subscribe;
	        }
	    }
	    /**
	     * Creates a new Observable, with this Observable as the source, and the passed
	     * operator defined as the new observable's operator.
	     * @method lift
	     * @param {Operator} operator the operator defining the operation to take on the observable
	     * @return {Observable} a new observable with the Operator applied
	     */
	    Observable.prototype.lift = function (operator) {
	        var observable = new Observable();
	        observable.source = this;
	        observable.operator = operator;
	        return observable;
	    };
	    /**
	     * Registers handlers for handling emitted values, error and completions from the observable, and
	     *  executes the observable's subscriber function, which will take action to set up the underlying data stream
	     * @method subscribe
	     * @param {PartialObserver|Function} observerOrNext (optional) either an observer defining all functions to be called,
	     *  or the first of three possible handlers, which is the handler for each value emitted from the observable.
	     * @param {Function} error (optional) a handler for a terminal event resulting from an error. If no error handler is provided,
	     *  the error will be thrown as unhandled
	     * @param {Function} complete (optional) a handler for a terminal event resulting from successful completion.
	     * @return {ISubscription} a subscription reference to the registered handlers
	     */
	    Observable.prototype.subscribe = function (observerOrNext, error, complete) {
	        var operator = this.operator;
	        var sink = toSubscriber_1.toSubscriber(observerOrNext, error, complete);
	        sink.add(operator ? operator.call(sink, this) : this._subscribe(sink));
	        if (sink.syncErrorThrowable) {
	            sink.syncErrorThrowable = false;
	            if (sink.syncErrorThrown) {
	                throw sink.syncErrorValue;
	            }
	        }
	        return sink;
	    };
	    /**
	     * @method forEach
	     * @param {Function} next a handler for each value emitted by the observable
	     * @param {PromiseConstructor} [PromiseCtor] a constructor function used to instantiate the Promise
	     * @return {Promise} a promise that either resolves on observable completion or
	     *  rejects with the handled error
	     */
	    Observable.prototype.forEach = function (next, PromiseCtor) {
	        var _this = this;
	        if (!PromiseCtor) {
	            if (root_1.root.Rx && root_1.root.Rx.config && root_1.root.Rx.config.Promise) {
	                PromiseCtor = root_1.root.Rx.config.Promise;
	            } else if (root_1.root.Promise) {
	                PromiseCtor = root_1.root.Promise;
	            }
	        }
	        if (!PromiseCtor) {
	            throw new Error('no Promise impl found');
	        }
	        return new PromiseCtor(function (resolve, reject) {
	            var subscription = _this.subscribe(function (value) {
	                if (subscription) {
	                    // if there is a subscription, then we can surmise
	                    // the next handling is asynchronous. Any errors thrown
	                    // need to be rejected explicitly and unsubscribe must be
	                    // called manually
	                    try {
	                        next(value);
	                    } catch (err) {
	                        reject(err);
	                        subscription.unsubscribe();
	                    }
	                } else {
	                    // if there is NO subscription, then we're getting a nexted
	                    // value synchronously during subscription. We can just call it.
	                    // If it errors, Observable's `subscribe` imple will ensure the
	                    // unsubscription logic is called, then synchronously rethrow the error.
	                    // After that, Promise will trap the error and send it
	                    // down the rejection path.
	                    next(value);
	                }
	            }, reject, resolve);
	        });
	    };
	    Observable.prototype._subscribe = function (subscriber) {
	        return this.source.subscribe(subscriber);
	    };
	    /**
	     * An interop point defined by the es7-observable spec https://github.com/zenparsing/es-observable
	     * @method Symbol.observable
	     * @return {Observable} this instance of the observable
	     */
	    Observable.prototype[$$observable] = function () {
	        return this;
	    };
	    // HACK: Since TypeScript inherits static properties too, we have to
	    // fight against TypeScript here so Subject can have a different static create signature
	    /**
	     * Creates a new cold Observable by calling the Observable constructor
	     * @static true
	     * @owner Observable
	     * @method create
	     * @param {Function} subscribe? the subscriber function to be passed to the Observable constructor
	     * @return {Observable} a new cold observable
	     */
	    Observable.create = function (subscribe) {
	        return new Observable(subscribe);
	    };
	    return Observable;
	}();
	exports.Observable = Observable;
	//# sourceMappingURL=Observable.js.map

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(module, global) {"use strict";

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

	var objectTypes = {
	    'boolean': false,
	    'function': true,
	    'object': true,
	    'number': false,
	    'string': false,
	    'undefined': false
	};
	exports.root = objectTypes[typeof self === 'undefined' ? 'undefined' : _typeof(self)] && self || objectTypes[typeof window === 'undefined' ? 'undefined' : _typeof(window)] && window;
	/* tslint:disable:no-unused-variable */
	var freeExports = objectTypes[ false ? 'undefined' : _typeof(exports)] && exports && !exports.nodeType && exports;
	var freeModule = objectTypes[ false ? 'undefined' : _typeof(module)] && module && !module.nodeType && module;
	var freeGlobal = objectTypes[typeof global === 'undefined' ? 'undefined' : _typeof(global)] && global;
	if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal)) {
	    exports.root = freeGlobal;
	}
	//# sourceMappingURL=root.js.map
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4)(module), (function() { return this; }())))

/***/ },
/* 4 */
/***/ function(module, exports) {

	"use strict";

	module.exports = function (module) {
		if (!module.webpackPolyfill) {
			module.deprecate = function () {};
			module.paths = [];
			// module.parent = undefined by default
			module.children = [];
			module.webpackPolyfill = 1;
		}
		return module;
	};

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

	var Subscriber_1 = __webpack_require__(6);
	var rxSubscriber_1 = __webpack_require__(14);
	function toSubscriber(nextOrObserver, error, complete) {
	    if (nextOrObserver && (typeof nextOrObserver === 'undefined' ? 'undefined' : _typeof(nextOrObserver)) === 'object') {
	        if (nextOrObserver instanceof Subscriber_1.Subscriber) {
	            return nextOrObserver;
	        } else if (typeof nextOrObserver[rxSubscriber_1.$$rxSubscriber] === 'function') {
	            return nextOrObserver[rxSubscriber_1.$$rxSubscriber]();
	        }
	    }
	    return new Subscriber_1.Subscriber(nextOrObserver, error, complete);
	}
	exports.toSubscriber = toSubscriber;
	//# sourceMappingURL=toSubscriber.js.map

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var isFunction_1 = __webpack_require__(7);
	var Subscription_1 = __webpack_require__(8);
	var rxSubscriber_1 = __webpack_require__(14);
	var Observer_1 = __webpack_require__(15);
	/**
	 * Implements the {@link Observer} interface and extends the
	 * {@link Subscription} class. While the {@link Observer} is the public API for
	 * consuming the values of an {@link Observable}, all Observers get converted to
	 * a Subscriber, in order to provide Subscription-like capabilities such as
	 * `unsubscribe`. Subscriber is a common type in RxJS, and crucial for
	 * implementing operators, but it is rarely used as a public API.
	 *
	 * @class Subscriber<T>
	 */
	var Subscriber = function (_super) {
	    __extends(Subscriber, _super);
	    /**
	     * @param {Observer|function(value: T): void} [destinationOrNext] A partially
	     * defined Observer or a `next` callback function.
	     * @param {function(e: ?any): void} [error] The `error` callback of an
	     * Observer.
	     * @param {function(): void} [complete] The `complete` callback of an
	     * Observer.
	     */
	    function Subscriber(destinationOrNext, error, complete) {
	        _super.call(this);
	        this.syncErrorValue = null;
	        this.syncErrorThrown = false;
	        this.syncErrorThrowable = false;
	        this.isStopped = false;
	        switch (arguments.length) {
	            case 0:
	                this.destination = Observer_1.empty;
	                break;
	            case 1:
	                if (!destinationOrNext) {
	                    this.destination = Observer_1.empty;
	                    break;
	                }
	                if ((typeof destinationOrNext === 'undefined' ? 'undefined' : _typeof(destinationOrNext)) === 'object') {
	                    if (destinationOrNext instanceof Subscriber) {
	                        this.destination = destinationOrNext;
	                        this.destination.add(this);
	                    } else {
	                        this.syncErrorThrowable = true;
	                        this.destination = new SafeSubscriber(this, destinationOrNext);
	                    }
	                    break;
	                }
	            default:
	                this.syncErrorThrowable = true;
	                this.destination = new SafeSubscriber(this, destinationOrNext, error, complete);
	                break;
	        }
	    }
	    /**
	     * A static factory for a Subscriber, given a (potentially partial) definition
	     * of an Observer.
	     * @param {function(x: ?T): void} [next] The `next` callback of an Observer.
	     * @param {function(e: ?any): void} [error] The `error` callback of an
	     * Observer.
	     * @param {function(): void} [complete] The `complete` callback of an
	     * Observer.
	     * @return {Subscriber<T>} A Subscriber wrapping the (partially defined)
	     * Observer represented by the given arguments.
	     */
	    Subscriber.create = function (next, error, complete) {
	        var subscriber = new Subscriber(next, error, complete);
	        subscriber.syncErrorThrowable = false;
	        return subscriber;
	    };
	    /**
	     * The {@link Observer} callback to receive notifications of type `next` from
	     * the Observable, with a value. The Observable may call this method 0 or more
	     * times.
	     * @param {T} [value] The `next` value.
	     * @return {void}
	     */
	    Subscriber.prototype.next = function (value) {
	        if (!this.isStopped) {
	            this._next(value);
	        }
	    };
	    /**
	     * The {@link Observer} callback to receive notifications of type `error` from
	     * the Observable, with an attached {@link Error}. Notifies the Observer that
	     * the Observable has experienced an error condition.
	     * @param {any} [err] The `error` exception.
	     * @return {void}
	     */
	    Subscriber.prototype.error = function (err) {
	        if (!this.isStopped) {
	            this.isStopped = true;
	            this._error(err);
	        }
	    };
	    /**
	     * The {@link Observer} callback to receive a valueless notification of type
	     * `complete` from the Observable. Notifies the Observer that the Observable
	     * has finished sending push-based notifications.
	     * @return {void}
	     */
	    Subscriber.prototype.complete = function () {
	        if (!this.isStopped) {
	            this.isStopped = true;
	            this._complete();
	        }
	    };
	    Subscriber.prototype.unsubscribe = function () {
	        if (this.isUnsubscribed) {
	            return;
	        }
	        this.isStopped = true;
	        _super.prototype.unsubscribe.call(this);
	    };
	    Subscriber.prototype._next = function (value) {
	        this.destination.next(value);
	    };
	    Subscriber.prototype._error = function (err) {
	        this.destination.error(err);
	        this.unsubscribe();
	    };
	    Subscriber.prototype._complete = function () {
	        this.destination.complete();
	        this.unsubscribe();
	    };
	    Subscriber.prototype[rxSubscriber_1.$$rxSubscriber] = function () {
	        return this;
	    };
	    return Subscriber;
	}(Subscription_1.Subscription);
	exports.Subscriber = Subscriber;
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @ignore
	 * @extends {Ignored}
	 */
	var SafeSubscriber = function (_super) {
	    __extends(SafeSubscriber, _super);
	    function SafeSubscriber(_parent, observerOrNext, error, complete) {
	        _super.call(this);
	        this._parent = _parent;
	        var next;
	        var context = this;
	        if (isFunction_1.isFunction(observerOrNext)) {
	            next = observerOrNext;
	        } else if (observerOrNext) {
	            context = observerOrNext;
	            next = observerOrNext.next;
	            error = observerOrNext.error;
	            complete = observerOrNext.complete;
	            if (isFunction_1.isFunction(context.unsubscribe)) {
	                this.add(context.unsubscribe.bind(context));
	            }
	            context.unsubscribe = this.unsubscribe.bind(this);
	        }
	        this._context = context;
	        this._next = next;
	        this._error = error;
	        this._complete = complete;
	    }
	    SafeSubscriber.prototype.next = function (value) {
	        if (!this.isStopped && this._next) {
	            var _parent = this._parent;
	            if (!_parent.syncErrorThrowable) {
	                this.__tryOrUnsub(this._next, value);
	            } else if (this.__tryOrSetError(_parent, this._next, value)) {
	                this.unsubscribe();
	            }
	        }
	    };
	    SafeSubscriber.prototype.error = function (err) {
	        if (!this.isStopped) {
	            var _parent = this._parent;
	            if (this._error) {
	                if (!_parent.syncErrorThrowable) {
	                    this.__tryOrUnsub(this._error, err);
	                    this.unsubscribe();
	                } else {
	                    this.__tryOrSetError(_parent, this._error, err);
	                    this.unsubscribe();
	                }
	            } else if (!_parent.syncErrorThrowable) {
	                this.unsubscribe();
	                throw err;
	            } else {
	                _parent.syncErrorValue = err;
	                _parent.syncErrorThrown = true;
	                this.unsubscribe();
	            }
	        }
	    };
	    SafeSubscriber.prototype.complete = function () {
	        if (!this.isStopped) {
	            var _parent = this._parent;
	            if (this._complete) {
	                if (!_parent.syncErrorThrowable) {
	                    this.__tryOrUnsub(this._complete);
	                    this.unsubscribe();
	                } else {
	                    this.__tryOrSetError(_parent, this._complete);
	                    this.unsubscribe();
	                }
	            } else {
	                this.unsubscribe();
	            }
	        }
	    };
	    SafeSubscriber.prototype.__tryOrUnsub = function (fn, value) {
	        try {
	            fn.call(this._context, value);
	        } catch (err) {
	            this.unsubscribe();
	            throw err;
	        }
	    };
	    SafeSubscriber.prototype.__tryOrSetError = function (parent, fn, value) {
	        try {
	            fn.call(this._context, value);
	        } catch (err) {
	            parent.syncErrorValue = err;
	            parent.syncErrorThrown = true;
	            return true;
	        }
	        return false;
	    };
	    SafeSubscriber.prototype._unsubscribe = function () {
	        var _parent = this._parent;
	        this._context = null;
	        this._parent = null;
	        _parent.unsubscribe();
	    };
	    return SafeSubscriber;
	}(Subscriber);
	//# sourceMappingURL=Subscriber.js.map

/***/ },
/* 7 */
/***/ function(module, exports) {

	"use strict";

	function isFunction(x) {
	    return typeof x === 'function';
	}
	exports.isFunction = isFunction;
	//# sourceMappingURL=isFunction.js.map

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

	var isArray_1 = __webpack_require__(9);
	var isObject_1 = __webpack_require__(10);
	var isFunction_1 = __webpack_require__(7);
	var tryCatch_1 = __webpack_require__(11);
	var errorObject_1 = __webpack_require__(12);
	var UnsubscriptionError_1 = __webpack_require__(13);
	/**
	 * Represents a disposable resource, such as the execution of an Observable. A
	 * Subscription has one important method, `unsubscribe`, that takes no argument
	 * and just disposes the resource held by the subscription.
	 *
	 * Additionally, subscriptions may be grouped together through the `add()`
	 * method, which will attach a child Subscription to the current Subscription.
	 * When a Subscription is unsubscribed, all its children (and its grandchildren)
	 * will be unsubscribed as well.
	 *
	 * @class Subscription
	 */
	var Subscription = function () {
	    /**
	     * @param {function(): void} [unsubscribe] A function describing how to
	     * perform the disposal of resources when the `unsubscribe` method is called.
	     */
	    function Subscription(unsubscribe) {
	        /**
	         * A flag to indicate whether this Subscription has already been unsubscribed.
	         * @type {boolean}
	         */
	        this.isUnsubscribed = false;
	        if (unsubscribe) {
	            this._unsubscribe = unsubscribe;
	        }
	    }
	    /**
	     * Disposes the resources held by the subscription. May, for instance, cancel
	     * an ongoing Observable execution or cancel any other type of work that
	     * started when the Subscription was created.
	     * @return {void}
	     */
	    Subscription.prototype.unsubscribe = function () {
	        var hasErrors = false;
	        var errors;
	        if (this.isUnsubscribed) {
	            return;
	        }
	        this.isUnsubscribed = true;
	        var _a = this,
	            _unsubscribe = _a._unsubscribe,
	            _subscriptions = _a._subscriptions;
	        this._subscriptions = null;
	        if (isFunction_1.isFunction(_unsubscribe)) {
	            var trial = tryCatch_1.tryCatch(_unsubscribe).call(this);
	            if (trial === errorObject_1.errorObject) {
	                hasErrors = true;
	                (errors = errors || []).push(errorObject_1.errorObject.e);
	            }
	        }
	        if (isArray_1.isArray(_subscriptions)) {
	            var index = -1;
	            var len = _subscriptions.length;
	            while (++index < len) {
	                var sub = _subscriptions[index];
	                if (isObject_1.isObject(sub)) {
	                    var trial = tryCatch_1.tryCatch(sub.unsubscribe).call(sub);
	                    if (trial === errorObject_1.errorObject) {
	                        hasErrors = true;
	                        errors = errors || [];
	                        var err = errorObject_1.errorObject.e;
	                        if (err instanceof UnsubscriptionError_1.UnsubscriptionError) {
	                            errors = errors.concat(err.errors);
	                        } else {
	                            errors.push(err);
	                        }
	                    }
	                }
	            }
	        }
	        if (hasErrors) {
	            throw new UnsubscriptionError_1.UnsubscriptionError(errors);
	        }
	    };
	    /**
	     * Adds a tear down to be called during the unsubscribe() of this
	     * Subscription.
	     *
	     * If the tear down being added is a subscription that is already
	     * unsubscribed, is the same reference `add` is being called on, or is
	     * `Subscription.EMPTY`, it will not be added.
	     *
	     * If this subscription is already in an `isUnsubscribed` state, the passed
	     * tear down logic will be executed immediately.
	     *
	     * @param {TeardownLogic} teardown The additional logic to execute on
	     * teardown.
	     * @return {Subscription} Returns the Subscription used or created to be
	     * added to the inner subscriptions list. This Subscription can be used with
	     * `remove()` to remove the passed teardown logic from the inner subscriptions
	     * list.
	     */
	    Subscription.prototype.add = function (teardown) {
	        if (!teardown || teardown === this || teardown === Subscription.EMPTY) {
	            return;
	        }
	        var sub = teardown;
	        switch (typeof teardown === 'undefined' ? 'undefined' : _typeof(teardown)) {
	            case 'function':
	                sub = new Subscription(teardown);
	            case 'object':
	                if (sub.isUnsubscribed || typeof sub.unsubscribe !== 'function') {
	                    break;
	                } else if (this.isUnsubscribed) {
	                    sub.unsubscribe();
	                } else {
	                    (this._subscriptions || (this._subscriptions = [])).push(sub);
	                }
	                break;
	            default:
	                throw new Error('Unrecognized teardown ' + teardown + ' added to Subscription.');
	        }
	        return sub;
	    };
	    /**
	     * Removes a Subscription from the internal list of subscriptions that will
	     * unsubscribe during the unsubscribe process of this Subscription.
	     * @param {Subscription} subscription The subscription to remove.
	     * @return {void}
	     */
	    Subscription.prototype.remove = function (subscription) {
	        // HACK: This might be redundant because of the logic in `add()`
	        if (subscription == null || subscription === this || subscription === Subscription.EMPTY) {
	            return;
	        }
	        var subscriptions = this._subscriptions;
	        if (subscriptions) {
	            var subscriptionIndex = subscriptions.indexOf(subscription);
	            if (subscriptionIndex !== -1) {
	                subscriptions.splice(subscriptionIndex, 1);
	            }
	        }
	    };
	    Subscription.EMPTY = function (empty) {
	        empty.isUnsubscribed = true;
	        return empty;
	    }(new Subscription());
	    return Subscription;
	}();
	exports.Subscription = Subscription;
	//# sourceMappingURL=Subscription.js.map

/***/ },
/* 9 */
/***/ function(module, exports) {

	"use strict";

	exports.isArray = Array.isArray || function (x) {
	  return x && typeof x.length === 'number';
	};
	//# sourceMappingURL=isArray.js.map

/***/ },
/* 10 */
/***/ function(module, exports) {

	"use strict";

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

	function isObject(x) {
	    return x != null && (typeof x === "undefined" ? "undefined" : _typeof(x)) === 'object';
	}
	exports.isObject = isObject;
	//# sourceMappingURL=isObject.js.map

/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var errorObject_1 = __webpack_require__(12);
	var tryCatchTarget;
	function tryCatcher() {
	    try {
	        return tryCatchTarget.apply(this, arguments);
	    } catch (e) {
	        errorObject_1.errorObject.e = e;
	        return errorObject_1.errorObject;
	    }
	}
	function tryCatch(fn) {
	    tryCatchTarget = fn;
	    return tryCatcher;
	}
	exports.tryCatch = tryCatch;
	;
	//# sourceMappingURL=tryCatch.js.map

/***/ },
/* 12 */
/***/ function(module, exports) {

	"use strict";
	// typeof any so that it we don't have to cast when comparing a result to the error object

	exports.errorObject = { e: {} };
	//# sourceMappingURL=errorObject.js.map

/***/ },
/* 13 */
/***/ function(module, exports) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	/**
	 * An error thrown when one or more errors have occurred during the
	 * `unsubscribe` of a {@link Subscription}.
	 */
	var UnsubscriptionError = function (_super) {
	    __extends(UnsubscriptionError, _super);
	    function UnsubscriptionError(errors) {
	        _super.call(this);
	        this.errors = errors;
	        this.name = 'UnsubscriptionError';
	        this.message = errors ? errors.length + " errors occurred during unsubscription:\n" + errors.map(function (err, i) {
	            return i + 1 + ") " + err.toString();
	        }).join('\n') : '';
	    }
	    return UnsubscriptionError;
	}(Error);
	exports.UnsubscriptionError = UnsubscriptionError;
	//# sourceMappingURL=UnsubscriptionError.js.map

/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var root_1 = __webpack_require__(3);
	var _Symbol = root_1.root.Symbol;
	exports.$$rxSubscriber = typeof _Symbol === 'function' && typeof _Symbol['for'] === 'function' ? _Symbol['for']('rxSubscriber') : '@@rxSubscriber';
	//# sourceMappingURL=rxSubscriber.js.map

/***/ },
/* 15 */
/***/ function(module, exports) {

	"use strict";

	exports.empty = {
	    isUnsubscribed: true,
	    next: function next(value) {},
	    error: function error(err) {
	        throw err;
	    },
	    complete: function complete() {}
	};
	//# sourceMappingURL=Observer.js.map

/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {/* global window */
	'use strict';

	module.exports = __webpack_require__(17)(global || window || undefined);
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 17 */
/***/ function(module, exports) {

	'use strict';

	module.exports = function symbolObservablePonyfill(root) {
		var result;
		var _Symbol = root.Symbol;

		if (typeof _Symbol === 'function') {
			if (_Symbol.observable) {
				result = _Symbol.observable;
			} else {
				result = _Symbol('observable');
				_Symbol.observable = result;
			}
		} else {
			result = '@@observable';
		}

		return result;
	};

/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var Observable_1 = __webpack_require__(2);
	var of_1 = __webpack_require__(19);
	Observable_1.Observable.of = of_1.of;
	//# sourceMappingURL=of.js.map

/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var ArrayObservable_1 = __webpack_require__(20);
	exports.of = ArrayObservable_1.ArrayObservable.of;
	//# sourceMappingURL=of.js.map

/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var Observable_1 = __webpack_require__(2);
	var ScalarObservable_1 = __webpack_require__(21);
	var EmptyObservable_1 = __webpack_require__(22);
	var isScheduler_1 = __webpack_require__(23);
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @extends {Ignored}
	 * @hide true
	 */
	var ArrayObservable = function (_super) {
	    __extends(ArrayObservable, _super);
	    function ArrayObservable(array, scheduler) {
	        _super.call(this);
	        this.array = array;
	        this.scheduler = scheduler;
	        if (!scheduler && array.length === 1) {
	            this._isScalar = true;
	            this.value = array[0];
	        }
	    }
	    ArrayObservable.create = function (array, scheduler) {
	        return new ArrayObservable(array, scheduler);
	    };
	    /**
	     * Creates an Observable that emits some values you specify as arguments,
	     * immediately one after the other, and then emits a complete notification.
	     *
	     * <span class="informal">Emits the arguments you provide, then completes.
	     * </span>
	     *
	     * <img src="./img/of.png" width="100%">
	     *
	     * This static operator is useful for creating a simple Observable that only
	     * emits the arguments given, and the complete notification thereafter. It can
	     * be used for composing with other Observables, such as with {@link concat}.
	     * By default, it uses a `null` Scheduler, which means the `next`
	     * notifications are sent synchronously, although with a different Scheduler
	     * it is possible to determine when those notifications will be delivered.
	     *
	     * @example <caption>Emit 10, 20, 30, then 'a', 'b', 'c', then start ticking every second.</caption>
	     * var numbers = Rx.Observable.of(10, 20, 30);
	     * var letters = Rx.Observable.of('a', 'b', 'c');
	     * var interval = Rx.Observable.interval(1000);
	     * var result = numbers.concat(letters).concat(interval);
	     * result.subscribe(x => console.log(x));
	     *
	     * @see {@link create}
	     * @see {@link empty}
	     * @see {@link never}
	     * @see {@link throw}
	     *
	     * @param {...T} values Arguments that represent `next` values to be emitted.
	     * @param {Scheduler} [scheduler] A {@link Scheduler} to use for scheduling
	     * the emissions of the `next` notifications.
	     * @return {Observable<T>} An Observable that emits each given input value.
	     * @static true
	     * @name of
	     * @owner Observable
	     */
	    ArrayObservable.of = function () {
	        var array = [];
	        for (var _i = 0; _i < arguments.length; _i++) {
	            array[_i - 0] = arguments[_i];
	        }
	        var scheduler = array[array.length - 1];
	        if (isScheduler_1.isScheduler(scheduler)) {
	            array.pop();
	        } else {
	            scheduler = null;
	        }
	        var len = array.length;
	        if (len > 1) {
	            return new ArrayObservable(array, scheduler);
	        } else if (len === 1) {
	            return new ScalarObservable_1.ScalarObservable(array[0], scheduler);
	        } else {
	            return new EmptyObservable_1.EmptyObservable(scheduler);
	        }
	    };
	    ArrayObservable.dispatch = function (state) {
	        var array = state.array,
	            index = state.index,
	            count = state.count,
	            subscriber = state.subscriber;
	        if (index >= count) {
	            subscriber.complete();
	            return;
	        }
	        subscriber.next(array[index]);
	        if (subscriber.isUnsubscribed) {
	            return;
	        }
	        state.index = index + 1;
	        this.schedule(state);
	    };
	    ArrayObservable.prototype._subscribe = function (subscriber) {
	        var index = 0;
	        var array = this.array;
	        var count = array.length;
	        var scheduler = this.scheduler;
	        if (scheduler) {
	            return scheduler.schedule(ArrayObservable.dispatch, 0, {
	                array: array, index: index, count: count, subscriber: subscriber
	            });
	        } else {
	            for (var i = 0; i < count && !subscriber.isUnsubscribed; i++) {
	                subscriber.next(array[i]);
	            }
	            subscriber.complete();
	        }
	    };
	    return ArrayObservable;
	}(Observable_1.Observable);
	exports.ArrayObservable = ArrayObservable;
	//# sourceMappingURL=ArrayObservable.js.map

/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var Observable_1 = __webpack_require__(2);
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @extends {Ignored}
	 * @hide true
	 */
	var ScalarObservable = function (_super) {
	    __extends(ScalarObservable, _super);
	    function ScalarObservable(value, scheduler) {
	        _super.call(this);
	        this.value = value;
	        this.scheduler = scheduler;
	        this._isScalar = true;
	    }
	    ScalarObservable.create = function (value, scheduler) {
	        return new ScalarObservable(value, scheduler);
	    };
	    ScalarObservable.dispatch = function (state) {
	        var done = state.done,
	            value = state.value,
	            subscriber = state.subscriber;
	        if (done) {
	            subscriber.complete();
	            return;
	        }
	        subscriber.next(value);
	        if (subscriber.isUnsubscribed) {
	            return;
	        }
	        state.done = true;
	        this.schedule(state);
	    };
	    ScalarObservable.prototype._subscribe = function (subscriber) {
	        var value = this.value;
	        var scheduler = this.scheduler;
	        if (scheduler) {
	            return scheduler.schedule(ScalarObservable.dispatch, 0, {
	                done: false, value: value, subscriber: subscriber
	            });
	        } else {
	            subscriber.next(value);
	            if (!subscriber.isUnsubscribed) {
	                subscriber.complete();
	            }
	        }
	    };
	    return ScalarObservable;
	}(Observable_1.Observable);
	exports.ScalarObservable = ScalarObservable;
	//# sourceMappingURL=ScalarObservable.js.map

/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var Observable_1 = __webpack_require__(2);
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @extends {Ignored}
	 * @hide true
	 */
	var EmptyObservable = function (_super) {
	    __extends(EmptyObservable, _super);
	    function EmptyObservable(scheduler) {
	        _super.call(this);
	        this.scheduler = scheduler;
	    }
	    /**
	     * Creates an Observable that emits no items to the Observer and immediately
	     * emits a complete notification.
	     *
	     * <span class="informal">Just emits 'complete', and nothing else.
	     * </span>
	     *
	     * <img src="./img/empty.png" width="100%">
	     *
	     * This static operator is useful for creating a simple Observable that only
	     * emits the complete notification. It can be used for composing with other
	     * Observables, such as in a {@link mergeMap}.
	     *
	     * @example <caption>Emit the number 7, then complete.</caption>
	     * var result = Rx.Observable.empty().startWith(7);
	     * result.subscribe(x => console.log(x));
	     *
	     * @example <caption>Map and flatten only odd numbers to the sequence 'a', 'b', 'c'</caption>
	     * var interval = Rx.Observable.interval(1000);
	     * var result = interval.mergeMap(x =>
	     *   x % 2 === 1 ? Rx.Observable.of('a', 'b', 'c') : Rx.Observable.empty()
	     * );
	     * result.subscribe(x => console.log(x));
	     *
	     * @see {@link create}
	     * @see {@link never}
	     * @see {@link of}
	     * @see {@link throw}
	     *
	     * @param {Scheduler} [scheduler] A {@link Scheduler} to use for scheduling
	     * the emission of the complete notification.
	     * @return {Observable} An "empty" Observable: emits only the complete
	     * notification.
	     * @static true
	     * @name empty
	     * @owner Observable
	     */
	    EmptyObservable.create = function (scheduler) {
	        return new EmptyObservable(scheduler);
	    };
	    EmptyObservable.dispatch = function (arg) {
	        var subscriber = arg.subscriber;
	        subscriber.complete();
	    };
	    EmptyObservable.prototype._subscribe = function (subscriber) {
	        var scheduler = this.scheduler;
	        if (scheduler) {
	            return scheduler.schedule(EmptyObservable.dispatch, 0, { subscriber: subscriber });
	        } else {
	            subscriber.complete();
	        }
	    };
	    return EmptyObservable;
	}(Observable_1.Observable);
	exports.EmptyObservable = EmptyObservable;
	//# sourceMappingURL=EmptyObservable.js.map

/***/ },
/* 23 */
/***/ function(module, exports) {

	"use strict";

	function isScheduler(value) {
	    return value && typeof value.schedule === 'function';
	}
	exports.isScheduler = isScheduler;
	//# sourceMappingURL=isScheduler.js.map

/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var Observable_1 = __webpack_require__(2);
	var from_1 = __webpack_require__(25);
	Observable_1.Observable.from = from_1.from;
	//# sourceMappingURL=from.js.map

/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var FromObservable_1 = __webpack_require__(26);
	exports.from = FromObservable_1.FromObservable.create;
	//# sourceMappingURL=from.js.map

/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var isArray_1 = __webpack_require__(9);
	var isFunction_1 = __webpack_require__(7);
	var isPromise_1 = __webpack_require__(27);
	var isScheduler_1 = __webpack_require__(23);
	var PromiseObservable_1 = __webpack_require__(28);
	var IteratorObservable_1 = __webpack_require__(29);
	var ArrayObservable_1 = __webpack_require__(20);
	var ArrayLikeObservable_1 = __webpack_require__(31);
	var iterator_1 = __webpack_require__(30);
	var Observable_1 = __webpack_require__(2);
	var observeOn_1 = __webpack_require__(32);
	var $$observable = __webpack_require__(16);
	var isArrayLike = function isArrayLike(x) {
	    return x && typeof x.length === 'number';
	};
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @extends {Ignored}
	 * @hide true
	 */
	var FromObservable = function (_super) {
	    __extends(FromObservable, _super);
	    function FromObservable(ish, scheduler) {
	        _super.call(this, null);
	        this.ish = ish;
	        this.scheduler = scheduler;
	    }
	    /**
	     * Creates an Observable from an Array, an array-like object, a Promise, an
	     * iterable object, or an Observable-like object.
	     *
	     * <span class="informal">Converts almost anything to an Observable.</span>
	     *
	     * <img src="./img/from.png" width="100%">
	     *
	     * Convert various other objects and data types into Observables. `from`
	     * converts a Promise or an array-like or an
	     * [iterable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#iterable)
	     * object into an Observable that emits the items in that promise or array or
	     * iterable. A String, in this context, is treated as an array of characters.
	     * Observable-like objects (contains a function named with the ES2015 Symbol
	     * for Observable) can also be converted through this operator.
	     *
	     * @example <caption>Converts an array to an Observable</caption>
	     * var array = [10, 20, 30];
	     * var result = Rx.Observable.from(array);
	     * result.subscribe(x => console.log(x));
	     *
	     * @example <caption>Convert an infinite iterable (from a generator) to an Observable</caption>
	     * function* generateDoubles(seed) {
	     *   var i = seed;
	     *   while (true) {
	     *     yield i;
	     *     i = 2 * i; // double it
	     *   }
	     * }
	     *
	     * var iterator = generateDoubles(3);
	     * var result = Rx.Observable.from(iterator).take(10);
	     * result.subscribe(x => console.log(x));
	     *
	     * @see {@link create}
	     * @see {@link fromEvent}
	     * @see {@link fromEventPattern}
	     * @see {@link fromPromise}
	     *
	     * @param {ObservableInput<T>} ish A subscribable object, a Promise, an
	     * Observable-like, an Array, an iterable or an array-like object to be
	     * converted.
	     * @param {function(x: any, i: number): T} [mapFn] A "map" function to call
	     * when converting array-like objects, where `x` is a value from the
	     * array-like and `i` is the index of that value in the sequence.
	     * @param {any} [thisArg] The context object to use when calling the `mapFn`,
	     * if provided.
	     * @param {Scheduler} [scheduler] The scheduler on which to schedule the
	     * emissions of values.
	     * @return {Observable<T>} The Observable whose values are originally from the
	     * input object that was converted.
	     * @static true
	     * @name from
	     * @owner Observable
	     */
	    FromObservable.create = function (ish, mapFnOrScheduler, thisArg, lastScheduler) {
	        var scheduler = null;
	        var mapFn = null;
	        if (isFunction_1.isFunction(mapFnOrScheduler)) {
	            scheduler = lastScheduler || null;
	            mapFn = mapFnOrScheduler;
	        } else if (isScheduler_1.isScheduler(scheduler)) {
	            scheduler = mapFnOrScheduler;
	        }
	        if (ish != null) {
	            if (typeof ish[$$observable] === 'function') {
	                if (ish instanceof Observable_1.Observable && !scheduler) {
	                    return ish;
	                }
	                return new FromObservable(ish, scheduler);
	            } else if (isArray_1.isArray(ish)) {
	                return new ArrayObservable_1.ArrayObservable(ish, scheduler);
	            } else if (isPromise_1.isPromise(ish)) {
	                return new PromiseObservable_1.PromiseObservable(ish, scheduler);
	            } else if (typeof ish[iterator_1.$$iterator] === 'function' || typeof ish === 'string') {
	                return new IteratorObservable_1.IteratorObservable(ish, null, null, scheduler);
	            } else if (isArrayLike(ish)) {
	                return new ArrayLikeObservable_1.ArrayLikeObservable(ish, mapFn, thisArg, scheduler);
	            }
	        }
	        throw new TypeError((ish !== null && (typeof ish === 'undefined' ? 'undefined' : _typeof(ish)) || ish) + ' is not observable');
	    };
	    FromObservable.prototype._subscribe = function (subscriber) {
	        var ish = this.ish;
	        var scheduler = this.scheduler;
	        if (scheduler == null) {
	            return ish[$$observable]().subscribe(subscriber);
	        } else {
	            return ish[$$observable]().subscribe(new observeOn_1.ObserveOnSubscriber(subscriber, scheduler, 0));
	        }
	    };
	    return FromObservable;
	}(Observable_1.Observable);
	exports.FromObservable = FromObservable;
	//# sourceMappingURL=FromObservable.js.map

/***/ },
/* 27 */
/***/ function(module, exports) {

	"use strict";

	function isPromise(value) {
	    return value && typeof value.subscribe !== 'function' && typeof value.then === 'function';
	}
	exports.isPromise = isPromise;
	//# sourceMappingURL=isPromise.js.map

/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var root_1 = __webpack_require__(3);
	var Observable_1 = __webpack_require__(2);
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @extends {Ignored}
	 * @hide true
	 */
	var PromiseObservable = function (_super) {
	    __extends(PromiseObservable, _super);
	    function PromiseObservable(promise, scheduler) {
	        if (scheduler === void 0) {
	            scheduler = null;
	        }
	        _super.call(this);
	        this.promise = promise;
	        this.scheduler = scheduler;
	    }
	    /**
	     * Converts a Promise to an Observable.
	     *
	     * <span class="informal">Returns an Observable that just emits the Promise's
	     * resolved value, then completes.</span>
	     *
	     * Converts an ES2015 Promise or a Promises/A+ spec compliant Promise to an
	     * Observable. If the Promise resolves with a value, the output Observable
	     * emits that resolved value as a `next`, and then completes. If the Promise
	     * is rejected, then the output Observable emits the corresponding Error.
	     *
	     * @example <caption>Convert the Promise returned by Fetch to an Observable</caption>
	     * var result = Rx.Observable.fromPromise(fetch('http://myserver.com/'));
	     * result.subscribe(x => console.log(x), e => console.error(e));
	     *
	     * @see {@link bindCallback}
	     * @see {@link from}
	     *
	     * @param {Promise<T>} promise The promise to be converted.
	     * @param {Scheduler} [scheduler] An optional Scheduler to use for scheduling
	     * the delivery of the resolved value (or the rejection).
	     * @return {Observable<T>} An Observable which wraps the Promise.
	     * @static true
	     * @name fromPromise
	     * @owner Observable
	     */
	    PromiseObservable.create = function (promise, scheduler) {
	        if (scheduler === void 0) {
	            scheduler = null;
	        }
	        return new PromiseObservable(promise, scheduler);
	    };
	    PromiseObservable.prototype._subscribe = function (subscriber) {
	        var _this = this;
	        var promise = this.promise;
	        var scheduler = this.scheduler;
	        if (scheduler == null) {
	            if (this._isScalar) {
	                if (!subscriber.isUnsubscribed) {
	                    subscriber.next(this.value);
	                    subscriber.complete();
	                }
	            } else {
	                promise.then(function (value) {
	                    _this.value = value;
	                    _this._isScalar = true;
	                    if (!subscriber.isUnsubscribed) {
	                        subscriber.next(value);
	                        subscriber.complete();
	                    }
	                }, function (err) {
	                    if (!subscriber.isUnsubscribed) {
	                        subscriber.error(err);
	                    }
	                }).then(null, function (err) {
	                    // escape the promise trap, throw unhandled errors
	                    root_1.root.setTimeout(function () {
	                        throw err;
	                    });
	                });
	            }
	        } else {
	            if (this._isScalar) {
	                if (!subscriber.isUnsubscribed) {
	                    return scheduler.schedule(dispatchNext, 0, { value: this.value, subscriber: subscriber });
	                }
	            } else {
	                promise.then(function (value) {
	                    _this.value = value;
	                    _this._isScalar = true;
	                    if (!subscriber.isUnsubscribed) {
	                        subscriber.add(scheduler.schedule(dispatchNext, 0, { value: value, subscriber: subscriber }));
	                    }
	                }, function (err) {
	                    if (!subscriber.isUnsubscribed) {
	                        subscriber.add(scheduler.schedule(dispatchError, 0, { err: err, subscriber: subscriber }));
	                    }
	                }).then(null, function (err) {
	                    // escape the promise trap, throw unhandled errors
	                    root_1.root.setTimeout(function () {
	                        throw err;
	                    });
	                });
	            }
	        }
	    };
	    return PromiseObservable;
	}(Observable_1.Observable);
	exports.PromiseObservable = PromiseObservable;
	function dispatchNext(arg) {
	    var value = arg.value,
	        subscriber = arg.subscriber;
	    if (!subscriber.isUnsubscribed) {
	        subscriber.next(value);
	        subscriber.complete();
	    }
	}
	function dispatchError(arg) {
	    var err = arg.err,
	        subscriber = arg.subscriber;
	    if (!subscriber.isUnsubscribed) {
	        subscriber.error(err);
	    }
	}
	//# sourceMappingURL=PromiseObservable.js.map

/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var root_1 = __webpack_require__(3);
	var isObject_1 = __webpack_require__(10);
	var tryCatch_1 = __webpack_require__(11);
	var Observable_1 = __webpack_require__(2);
	var isFunction_1 = __webpack_require__(7);
	var iterator_1 = __webpack_require__(30);
	var errorObject_1 = __webpack_require__(12);
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @extends {Ignored}
	 * @hide true
	 */
	var IteratorObservable = function (_super) {
	    __extends(IteratorObservable, _super);
	    function IteratorObservable(iterator, project, thisArg, scheduler) {
	        _super.call(this);
	        if (iterator == null) {
	            throw new Error('iterator cannot be null.');
	        }
	        if (isObject_1.isObject(project)) {
	            this.thisArg = project;
	            this.scheduler = thisArg;
	        } else if (isFunction_1.isFunction(project)) {
	            this.project = project;
	            this.thisArg = thisArg;
	            this.scheduler = scheduler;
	        } else if (project != null) {
	            throw new Error('When provided, `project` must be a function.');
	        }
	        this.iterator = getIterator(iterator);
	    }
	    IteratorObservable.create = function (iterator, project, thisArg, scheduler) {
	        return new IteratorObservable(iterator, project, thisArg, scheduler);
	    };
	    IteratorObservable.dispatch = function (state) {
	        var index = state.index,
	            hasError = state.hasError,
	            thisArg = state.thisArg,
	            project = state.project,
	            iterator = state.iterator,
	            subscriber = state.subscriber;
	        if (hasError) {
	            subscriber.error(state.error);
	            return;
	        }
	        var result = iterator.next();
	        if (result.done) {
	            subscriber.complete();
	            return;
	        }
	        if (project) {
	            result = tryCatch_1.tryCatch(project).call(thisArg, result.value, index);
	            if (result === errorObject_1.errorObject) {
	                state.error = errorObject_1.errorObject.e;
	                state.hasError = true;
	            } else {
	                subscriber.next(result);
	                state.index = index + 1;
	            }
	        } else {
	            subscriber.next(result.value);
	            state.index = index + 1;
	        }
	        if (subscriber.isUnsubscribed) {
	            return;
	        }
	        this.schedule(state);
	    };
	    IteratorObservable.prototype._subscribe = function (subscriber) {
	        var index = 0;
	        var _a = this,
	            iterator = _a.iterator,
	            project = _a.project,
	            thisArg = _a.thisArg,
	            scheduler = _a.scheduler;
	        if (scheduler) {
	            return scheduler.schedule(IteratorObservable.dispatch, 0, {
	                index: index, thisArg: thisArg, project: project, iterator: iterator, subscriber: subscriber
	            });
	        } else {
	            do {
	                var result = iterator.next();
	                if (result.done) {
	                    subscriber.complete();
	                    break;
	                } else if (project) {
	                    result = tryCatch_1.tryCatch(project).call(thisArg, result.value, index++);
	                    if (result === errorObject_1.errorObject) {
	                        subscriber.error(errorObject_1.errorObject.e);
	                        break;
	                    }
	                    subscriber.next(result);
	                } else {
	                    subscriber.next(result.value);
	                }
	                if (subscriber.isUnsubscribed) {
	                    break;
	                }
	            } while (true);
	        }
	    };
	    return IteratorObservable;
	}(Observable_1.Observable);
	exports.IteratorObservable = IteratorObservable;
	var StringIterator = function () {
	    function StringIterator(str, idx, len) {
	        if (idx === void 0) {
	            idx = 0;
	        }
	        if (len === void 0) {
	            len = str.length;
	        }
	        this.str = str;
	        this.idx = idx;
	        this.len = len;
	    }
	    StringIterator.prototype[iterator_1.$$iterator] = function () {
	        return this;
	    };
	    StringIterator.prototype.next = function () {
	        return this.idx < this.len ? {
	            done: false,
	            value: this.str.charAt(this.idx++)
	        } : {
	            done: true,
	            value: undefined
	        };
	    };
	    return StringIterator;
	}();
	var ArrayIterator = function () {
	    function ArrayIterator(arr, idx, len) {
	        if (idx === void 0) {
	            idx = 0;
	        }
	        if (len === void 0) {
	            len = toLength(arr);
	        }
	        this.arr = arr;
	        this.idx = idx;
	        this.len = len;
	    }
	    ArrayIterator.prototype[iterator_1.$$iterator] = function () {
	        return this;
	    };
	    ArrayIterator.prototype.next = function () {
	        return this.idx < this.len ? {
	            done: false,
	            value: this.arr[this.idx++]
	        } : {
	            done: true,
	            value: undefined
	        };
	    };
	    return ArrayIterator;
	}();
	function getIterator(obj) {
	    var i = obj[iterator_1.$$iterator];
	    if (!i && typeof obj === 'string') {
	        return new StringIterator(obj);
	    }
	    if (!i && obj.length !== undefined) {
	        return new ArrayIterator(obj);
	    }
	    if (!i) {
	        throw new TypeError('Object is not iterable');
	    }
	    return obj[iterator_1.$$iterator]();
	}
	var maxSafeInteger = Math.pow(2, 53) - 1;
	function toLength(o) {
	    var len = +o.length;
	    if (isNaN(len)) {
	        return 0;
	    }
	    if (len === 0 || !numberIsFinite(len)) {
	        return len;
	    }
	    len = sign(len) * Math.floor(Math.abs(len));
	    if (len <= 0) {
	        return 0;
	    }
	    if (len > maxSafeInteger) {
	        return maxSafeInteger;
	    }
	    return len;
	}
	function numberIsFinite(value) {
	    return typeof value === 'number' && root_1.root.isFinite(value);
	}
	function sign(value) {
	    var valueAsNumber = +value;
	    if (valueAsNumber === 0) {
	        return valueAsNumber;
	    }
	    if (isNaN(valueAsNumber)) {
	        return valueAsNumber;
	    }
	    return valueAsNumber < 0 ? -1 : 1;
	}
	//# sourceMappingURL=IteratorObservable.js.map

/***/ },
/* 30 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var root_1 = __webpack_require__(3);
	var _Symbol = root_1.root.Symbol;
	if (typeof _Symbol === 'function') {
	    if (_Symbol.iterator) {
	        exports.$$iterator = _Symbol.iterator;
	    } else if (typeof _Symbol['for'] === 'function') {
	        exports.$$iterator = _Symbol['for']('iterator');
	    }
	} else {
	    if (root_1.root.Set && typeof new root_1.root.Set()['@@iterator'] === 'function') {
	        // Bug for mozilla version
	        exports.$$iterator = '@@iterator';
	    } else if (root_1.root.Map) {
	        // es6-shim specific logic
	        var keys = Object.getOwnPropertyNames(root_1.root.Map.prototype);
	        for (var i = 0; i < keys.length; ++i) {
	            var key = keys[i];
	            if (key !== 'entries' && key !== 'size' && root_1.root.Map.prototype[key] === root_1.root.Map.prototype['entries']) {
	                exports.$$iterator = key;
	                break;
	            }
	        }
	    } else {
	        exports.$$iterator = '@@iterator';
	    }
	}
	//# sourceMappingURL=iterator.js.map

/***/ },
/* 31 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var Observable_1 = __webpack_require__(2);
	var ScalarObservable_1 = __webpack_require__(21);
	var EmptyObservable_1 = __webpack_require__(22);
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @extends {Ignored}
	 * @hide true
	 */
	var ArrayLikeObservable = function (_super) {
	    __extends(ArrayLikeObservable, _super);
	    function ArrayLikeObservable(arrayLike, mapFn, thisArg, scheduler) {
	        _super.call(this);
	        this.arrayLike = arrayLike;
	        this.scheduler = scheduler;
	        if (!mapFn && !scheduler && arrayLike.length === 1) {
	            this._isScalar = true;
	            this.value = arrayLike[0];
	        }
	        if (mapFn) {
	            this.mapFn = mapFn.bind(thisArg);
	        }
	    }
	    ArrayLikeObservable.create = function (arrayLike, mapFn, thisArg, scheduler) {
	        var length = arrayLike.length;
	        if (length === 0) {
	            return new EmptyObservable_1.EmptyObservable();
	        } else if (length === 1 && !mapFn) {
	            return new ScalarObservable_1.ScalarObservable(arrayLike[0], scheduler);
	        } else {
	            return new ArrayLikeObservable(arrayLike, mapFn, thisArg, scheduler);
	        }
	    };
	    ArrayLikeObservable.dispatch = function (state) {
	        var arrayLike = state.arrayLike,
	            index = state.index,
	            length = state.length,
	            mapFn = state.mapFn,
	            subscriber = state.subscriber;
	        if (subscriber.isUnsubscribed) {
	            return;
	        }
	        if (index >= length) {
	            subscriber.complete();
	            return;
	        }
	        var result = mapFn ? mapFn(arrayLike[index], index) : arrayLike[index];
	        subscriber.next(result);
	        state.index = index + 1;
	        this.schedule(state);
	    };
	    ArrayLikeObservable.prototype._subscribe = function (subscriber) {
	        var index = 0;
	        var _a = this,
	            arrayLike = _a.arrayLike,
	            mapFn = _a.mapFn,
	            scheduler = _a.scheduler;
	        var length = arrayLike.length;
	        if (scheduler) {
	            return scheduler.schedule(ArrayLikeObservable.dispatch, 0, {
	                arrayLike: arrayLike, index: index, length: length, mapFn: mapFn, subscriber: subscriber
	            });
	        } else {
	            for (var i = 0; i < length && !subscriber.isUnsubscribed; i++) {
	                var result = mapFn ? mapFn(arrayLike[i], i) : arrayLike[i];
	                subscriber.next(result);
	            }
	            subscriber.complete();
	        }
	    };
	    return ArrayLikeObservable;
	}(Observable_1.Observable);
	exports.ArrayLikeObservable = ArrayLikeObservable;
	//# sourceMappingURL=ArrayLikeObservable.js.map

/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var Subscriber_1 = __webpack_require__(6);
	var Notification_1 = __webpack_require__(33);
	/**
	 * @see {@link Notification}
	 *
	 * @param scheduler
	 * @param delay
	 * @return {Observable<R>|WebSocketSubject<T>|Observable<T>}
	 * @method observeOn
	 * @owner Observable
	 */
	function observeOn(scheduler, delay) {
	    if (delay === void 0) {
	        delay = 0;
	    }
	    return this.lift(new ObserveOnOperator(scheduler, delay));
	}
	exports.observeOn = observeOn;
	var ObserveOnOperator = function () {
	    function ObserveOnOperator(scheduler, delay) {
	        if (delay === void 0) {
	            delay = 0;
	        }
	        this.scheduler = scheduler;
	        this.delay = delay;
	    }
	    ObserveOnOperator.prototype.call = function (subscriber, source) {
	        return source._subscribe(new ObserveOnSubscriber(subscriber, this.scheduler, this.delay));
	    };
	    return ObserveOnOperator;
	}();
	exports.ObserveOnOperator = ObserveOnOperator;
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @ignore
	 * @extends {Ignored}
	 */
	var ObserveOnSubscriber = function (_super) {
	    __extends(ObserveOnSubscriber, _super);
	    function ObserveOnSubscriber(destination, scheduler, delay) {
	        if (delay === void 0) {
	            delay = 0;
	        }
	        _super.call(this, destination);
	        this.scheduler = scheduler;
	        this.delay = delay;
	    }
	    ObserveOnSubscriber.dispatch = function (arg) {
	        var notification = arg.notification,
	            destination = arg.destination;
	        notification.observe(destination);
	    };
	    ObserveOnSubscriber.prototype.scheduleMessage = function (notification) {
	        this.add(this.scheduler.schedule(ObserveOnSubscriber.dispatch, this.delay, new ObserveOnMessage(notification, this.destination)));
	    };
	    ObserveOnSubscriber.prototype._next = function (value) {
	        this.scheduleMessage(Notification_1.Notification.createNext(value));
	    };
	    ObserveOnSubscriber.prototype._error = function (err) {
	        this.scheduleMessage(Notification_1.Notification.createError(err));
	    };
	    ObserveOnSubscriber.prototype._complete = function () {
	        this.scheduleMessage(Notification_1.Notification.createComplete());
	    };
	    return ObserveOnSubscriber;
	}(Subscriber_1.Subscriber);
	exports.ObserveOnSubscriber = ObserveOnSubscriber;
	var ObserveOnMessage = function () {
	    function ObserveOnMessage(notification, destination) {
	        this.notification = notification;
	        this.destination = destination;
	    }
	    return ObserveOnMessage;
	}();
	exports.ObserveOnMessage = ObserveOnMessage;
	//# sourceMappingURL=observeOn.js.map

/***/ },
/* 33 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var Observable_1 = __webpack_require__(2);
	/**
	 * Represents a push-based event or value that an {@link Observable} can emit.
	 * This class is particularly useful for operators that manage notifications,
	 * like {@link materialize}, {@link dematerialize}, {@link observeOn}, and
	 * others. Besides wrapping the actual delivered value, it also annotates it
	 * with metadata of, for instance, what type of push message it is (`next`,
	 * `error`, or `complete`).
	 *
	 * @see {@link materialize}
	 * @see {@link dematerialize}
	 * @see {@link observeOn}
	 *
	 * @class Notification<T>
	 */
	var Notification = function () {
	    function Notification(kind, value, exception) {
	        this.kind = kind;
	        this.value = value;
	        this.exception = exception;
	        this.hasValue = kind === 'N';
	    }
	    /**
	     * Delivers to the given `observer` the value wrapped by this Notification.
	     * @param {Observer} observer
	     * @return
	     */
	    Notification.prototype.observe = function (observer) {
	        switch (this.kind) {
	            case 'N':
	                return observer.next && observer.next(this.value);
	            case 'E':
	                return observer.error && observer.error(this.exception);
	            case 'C':
	                return observer.complete && observer.complete();
	        }
	    };
	    /**
	     * Given some {@link Observer} callbacks, deliver the value represented by the
	     * current Notification to the correctly corresponding callback.
	     * @param {function(value: T): void} next An Observer `next` callback.
	     * @param {function(err: any): void} [error] An Observer `error` callback.
	     * @param {function(): void} [complete] An Observer `complete` callback.
	     * @return {any}
	     */
	    Notification.prototype['do'] = function (next, error, complete) {
	        var kind = this.kind;
	        switch (kind) {
	            case 'N':
	                return next && next(this.value);
	            case 'E':
	                return error && error(this.exception);
	            case 'C':
	                return complete && complete();
	        }
	    };
	    /**
	     * Takes an Observer or its individual callback functions, and calls `observe`
	     * or `do` methods accordingly.
	     * @param {Observer|function(value: T): void} nextOrObserver An Observer or
	     * the `next` callback.
	     * @param {function(err: any): void} [error] An Observer `error` callback.
	     * @param {function(): void} [complete] An Observer `complete` callback.
	     * @return {any}
	     */
	    Notification.prototype.accept = function (nextOrObserver, error, complete) {
	        if (nextOrObserver && typeof nextOrObserver.next === 'function') {
	            return this.observe(nextOrObserver);
	        } else {
	            return this['do'](nextOrObserver, error, complete);
	        }
	    };
	    /**
	     * Returns a simple Observable that just delivers the notification represented
	     * by this Notification instance.
	     * @return {any}
	     */
	    Notification.prototype.toObservable = function () {
	        var kind = this.kind;
	        switch (kind) {
	            case 'N':
	                return Observable_1.Observable.of(this.value);
	            case 'E':
	                return Observable_1.Observable['throw'](this.exception);
	            case 'C':
	                return Observable_1.Observable.empty();
	        }
	    };
	    /**
	     * A shortcut to create a Notification instance of the type `next` from a
	     * given value.
	     * @param {T} value The `next` value.
	     * @return {Notification<T>} The "next" Notification representing the
	     * argument.
	     */
	    Notification.createNext = function (value) {
	        if (typeof value !== 'undefined') {
	            return new Notification('N', value);
	        }
	        return this.undefinedValueNotification;
	    };
	    /**
	     * A shortcut to create a Notification instance of the type `error` from a
	     * given error.
	     * @param {any} [err] The `error` exception.
	     * @return {Notification<T>} The "error" Notification representing the
	     * argument.
	     */
	    Notification.createError = function (err) {
	        return new Notification('E', undefined, err);
	    };
	    /**
	     * A shortcut to create a Notification instance of the type `complete`.
	     * @return {Notification<any>} The valueless "complete" Notification.
	     */
	    Notification.createComplete = function () {
	        return this.completeNotification;
	    };
	    Notification.completeNotification = new Notification('C');
	    Notification.undefinedValueNotification = new Notification('N', undefined);
	    return Notification;
	}();
	exports.Notification = Notification;
	//# sourceMappingURL=Notification.js.map

/***/ },
/* 34 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var Observable_1 = __webpack_require__(2);
	var catch_1 = __webpack_require__(35);
	Observable_1.Observable.prototype['catch'] = catch_1._catch;
	//# sourceMappingURL=catch.js.map

/***/ },
/* 35 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var Subscriber_1 = __webpack_require__(6);
	/**
	 * Catches errors on the observable to be handled by returning a new observable or throwing an error.
	 * @param {function} selector a function that takes as arguments `err`, which is the error, and `caught`, which
	 *  is the source observable, in case you'd like to "retry" that observable by returning it again. Whatever observable
	 *  is returned by the `selector` will be used to continue the observable chain.
	 * @return {Observable} an observable that originates from either the source or the observable returned by the
	 *  catch `selector` function.
	 * @method catch
	 * @owner Observable
	 */
	function _catch(selector) {
	    var operator = new CatchOperator(selector);
	    var caught = this.lift(operator);
	    return operator.caught = caught;
	}
	exports._catch = _catch;
	var CatchOperator = function () {
	    function CatchOperator(selector) {
	        this.selector = selector;
	    }
	    CatchOperator.prototype.call = function (subscriber, source) {
	        return source._subscribe(new CatchSubscriber(subscriber, this.selector, this.caught));
	    };
	    return CatchOperator;
	}();
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @ignore
	 * @extends {Ignored}
	 */
	var CatchSubscriber = function (_super) {
	    __extends(CatchSubscriber, _super);
	    function CatchSubscriber(destination, selector, caught) {
	        _super.call(this, destination);
	        this.selector = selector;
	        this.caught = caught;
	    }
	    // NOTE: overriding `error` instead of `_error` because we don't want
	    // to have this flag this subscriber as `isStopped`.
	    CatchSubscriber.prototype.error = function (err) {
	        if (!this.isStopped) {
	            var result = void 0;
	            try {
	                result = this.selector(err, this.caught);
	            } catch (err) {
	                this.destination.error(err);
	                return;
	            }
	            this._innerSub(result);
	        }
	    };
	    CatchSubscriber.prototype._innerSub = function (result) {
	        this.unsubscribe();
	        this.destination.remove(this);
	        result.subscribe(this.destination);
	    };
	    return CatchSubscriber;
	}(Subscriber_1.Subscriber);
	//# sourceMappingURL=catch.js.map

/***/ },
/* 36 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var Observable_1 = __webpack_require__(2);
	var concatMap_1 = __webpack_require__(37);
	Observable_1.Observable.prototype.concatMap = concatMap_1.concatMap;
	//# sourceMappingURL=concatMap.js.map

/***/ },
/* 37 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var mergeMap_1 = __webpack_require__(38);
	/**
	 * Projects each source value to an Observable which is merged in the output
	 * Observable, in a serialized fashion waiting for each one to complete before
	 * merging the next.
	 *
	 * <span class="informal">Maps each value to an Observable, then flattens all of
	 * these inner Observables using {@link concatAll}.</span>
	 *
	 * <img src="./img/concatMap.png" width="100%">
	 *
	 * Returns an Observable that emits items based on applying a function that you
	 * supply to each item emitted by the source Observable, where that function
	 * returns an (so-called "inner") Observable. Each new inner Observable is
	 * concatenated with the previous inner Observable.
	 *
	 * __Warning:__ if source values arrive endlessly and faster than their
	 * corresponding inner Observables can complete, it will result in memory issues
	 * as inner Observables amass in an unbounded buffer waiting for their turn to
	 * be subscribed to.
	 *
	 * Note: `concatMap` is equivalent to `mergeMap` with concurrency parameter set
	 * to `1`.
	 *
	 * @example <caption>For each click event, tick every second from 0 to 3, with no concurrency</caption>
	 * var clicks = Rx.Observable.fromEvent(document, 'click');
	 * var result = clicks.concatMap(ev => Rx.Observable.interval(1000).take(4));
	 * result.subscribe(x => console.log(x));
	 *
	 * @see {@link concat}
	 * @see {@link concatAll}
	 * @see {@link concatMapTo}
	 * @see {@link exhaustMap}
	 * @see {@link mergeMap}
	 * @see {@link switchMap}
	 *
	 * @param {function(value: T, ?index: number): Observable} project A function
	 * that, when applied to an item emitted by the source Observable, returns an
	 * Observable.
	 * @param {function(outerValue: T, innerValue: I, outerIndex: number, innerIndex: number): any} [resultSelector]
	 * A function to produce the value on the output Observable based on the values
	 * and the indices of the source (outer) emission and the inner Observable
	 * emission. The arguments passed to this function are:
	 * - `outerValue`: the value that came from the source
	 * - `innerValue`: the value that came from the projected Observable
	 * - `outerIndex`: the "index" of the value that came from the source
	 * - `innerIndex`: the "index" of the value from the projected Observable
	 * @return {Observable} an observable of values merged from the projected
	 * Observables as they were subscribed to, one at a time. Optionally, these
	 * values may have been projected from a passed `projectResult` argument.
	 * @return {Observable} An Observable that emits the result of applying the
	 * projection function (and the optional `resultSelector`) to each item emitted
	 * by the source Observable and taking values from each projected inner
	 * Observable sequentially.
	 * @method concatMap
	 * @owner Observable
	 */
	function concatMap(project, resultSelector) {
	  return this.lift(new mergeMap_1.MergeMapOperator(project, resultSelector, 1));
	}
	exports.concatMap = concatMap;
	//# sourceMappingURL=concatMap.js.map

/***/ },
/* 38 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var subscribeToResult_1 = __webpack_require__(39);
	var OuterSubscriber_1 = __webpack_require__(41);
	/**
	 * Projects each source value to an Observable which is merged in the output
	 * Observable.
	 *
	 * <span class="informal">Maps each value to an Observable, then flattens all of
	 * these inner Observables using {@link mergeAll}.</span>
	 *
	 * <img src="./img/mergeMap.png" width="100%">
	 *
	 * Returns an Observable that emits items based on applying a function that you
	 * supply to each item emitted by the source Observable, where that function
	 * returns an Observable, and then merging those resulting Observables and
	 * emitting the results of this merger.
	 *
	 * @example <caption>Map and flatten each letter to an Observable ticking every 1 second</caption>
	 * var letters = Rx.Observable.of('a', 'b', 'c');
	 * var result = letters.mergeMap(x =>
	 *   Rx.Observable.interval(1000).map(i => x+i)
	 * );
	 * result.subscribe(x => console.log(x));
	 *
	 * @see {@link concatMap}
	 * @see {@link exhaustMap}
	 * @see {@link merge}
	 * @see {@link mergeAll}
	 * @see {@link mergeMapTo}
	 * @see {@link mergeScan}
	 * @see {@link switchMap}
	 *
	 * @param {function(value: T, ?index: number): Observable} project A function
	 * that, when applied to an item emitted by the source Observable, returns an
	 * Observable.
	 * @param {function(outerValue: T, innerValue: I, outerIndex: number, innerIndex: number): any} [resultSelector]
	 * A function to produce the value on the output Observable based on the values
	 * and the indices of the source (outer) emission and the inner Observable
	 * emission. The arguments passed to this function are:
	 * - `outerValue`: the value that came from the source
	 * - `innerValue`: the value that came from the projected Observable
	 * - `outerIndex`: the "index" of the value that came from the source
	 * - `innerIndex`: the "index" of the value from the projected Observable
	 * @param {number} [concurrent=Number.POSITIVE_INFINITY] Maximum number of input
	 * Observables being subscribed to concurrently.
	 * @return {Observable} An Observable that emits the result of applying the
	 * projection function (and the optional `resultSelector`) to each item emitted
	 * by the source Observable and merging the results of the Observables obtained
	 * from this transformation.
	 * @method mergeMap
	 * @owner Observable
	 */
	function mergeMap(project, resultSelector, concurrent) {
	    if (concurrent === void 0) {
	        concurrent = Number.POSITIVE_INFINITY;
	    }
	    if (typeof resultSelector === 'number') {
	        concurrent = resultSelector;
	        resultSelector = null;
	    }
	    return this.lift(new MergeMapOperator(project, resultSelector, concurrent));
	}
	exports.mergeMap = mergeMap;
	var MergeMapOperator = function () {
	    function MergeMapOperator(project, resultSelector, concurrent) {
	        if (concurrent === void 0) {
	            concurrent = Number.POSITIVE_INFINITY;
	        }
	        this.project = project;
	        this.resultSelector = resultSelector;
	        this.concurrent = concurrent;
	    }
	    MergeMapOperator.prototype.call = function (observer, source) {
	        return source._subscribe(new MergeMapSubscriber(observer, this.project, this.resultSelector, this.concurrent));
	    };
	    return MergeMapOperator;
	}();
	exports.MergeMapOperator = MergeMapOperator;
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @ignore
	 * @extends {Ignored}
	 */
	var MergeMapSubscriber = function (_super) {
	    __extends(MergeMapSubscriber, _super);
	    function MergeMapSubscriber(destination, project, resultSelector, concurrent) {
	        if (concurrent === void 0) {
	            concurrent = Number.POSITIVE_INFINITY;
	        }
	        _super.call(this, destination);
	        this.project = project;
	        this.resultSelector = resultSelector;
	        this.concurrent = concurrent;
	        this.hasCompleted = false;
	        this.buffer = [];
	        this.active = 0;
	        this.index = 0;
	    }
	    MergeMapSubscriber.prototype._next = function (value) {
	        if (this.active < this.concurrent) {
	            this._tryNext(value);
	        } else {
	            this.buffer.push(value);
	        }
	    };
	    MergeMapSubscriber.prototype._tryNext = function (value) {
	        var result;
	        var index = this.index++;
	        try {
	            result = this.project(value, index);
	        } catch (err) {
	            this.destination.error(err);
	            return;
	        }
	        this.active++;
	        this._innerSub(result, value, index);
	    };
	    MergeMapSubscriber.prototype._innerSub = function (ish, value, index) {
	        this.add(subscribeToResult_1.subscribeToResult(this, ish, value, index));
	    };
	    MergeMapSubscriber.prototype._complete = function () {
	        this.hasCompleted = true;
	        if (this.active === 0 && this.buffer.length === 0) {
	            this.destination.complete();
	        }
	    };
	    MergeMapSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
	        if (this.resultSelector) {
	            this._notifyResultSelector(outerValue, innerValue, outerIndex, innerIndex);
	        } else {
	            this.destination.next(innerValue);
	        }
	    };
	    MergeMapSubscriber.prototype._notifyResultSelector = function (outerValue, innerValue, outerIndex, innerIndex) {
	        var result;
	        try {
	            result = this.resultSelector(outerValue, innerValue, outerIndex, innerIndex);
	        } catch (err) {
	            this.destination.error(err);
	            return;
	        }
	        this.destination.next(result);
	    };
	    MergeMapSubscriber.prototype.notifyComplete = function (innerSub) {
	        var buffer = this.buffer;
	        this.remove(innerSub);
	        this.active--;
	        if (buffer.length > 0) {
	            this._next(buffer.shift());
	        } else if (this.active === 0 && this.hasCompleted) {
	            this.destination.complete();
	        }
	    };
	    return MergeMapSubscriber;
	}(OuterSubscriber_1.OuterSubscriber);
	exports.MergeMapSubscriber = MergeMapSubscriber;
	//# sourceMappingURL=mergeMap.js.map

/***/ },
/* 39 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var root_1 = __webpack_require__(3);
	var isArray_1 = __webpack_require__(9);
	var isPromise_1 = __webpack_require__(27);
	var Observable_1 = __webpack_require__(2);
	var iterator_1 = __webpack_require__(30);
	var InnerSubscriber_1 = __webpack_require__(40);
	var $$observable = __webpack_require__(16);
	function subscribeToResult(outerSubscriber, result, outerValue, outerIndex) {
	    var destination = new InnerSubscriber_1.InnerSubscriber(outerSubscriber, outerValue, outerIndex);
	    if (destination.isUnsubscribed) {
	        return;
	    }
	    if (result instanceof Observable_1.Observable) {
	        if (result._isScalar) {
	            destination.next(result.value);
	            destination.complete();
	            return;
	        } else {
	            return result.subscribe(destination);
	        }
	    }
	    if (isArray_1.isArray(result)) {
	        for (var i = 0, len = result.length; i < len && !destination.isUnsubscribed; i++) {
	            destination.next(result[i]);
	        }
	        if (!destination.isUnsubscribed) {
	            destination.complete();
	        }
	    } else if (isPromise_1.isPromise(result)) {
	        result.then(function (value) {
	            if (!destination.isUnsubscribed) {
	                destination.next(value);
	                destination.complete();
	            }
	        }, function (err) {
	            return destination.error(err);
	        }).then(null, function (err) {
	            // Escaping the Promise trap: globally throw unhandled errors
	            root_1.root.setTimeout(function () {
	                throw err;
	            });
	        });
	        return destination;
	    } else if (typeof result[iterator_1.$$iterator] === 'function') {
	        for (var _i = 0, _a = result; _i < _a.length; _i++) {
	            var item = _a[_i];
	            destination.next(item);
	            if (destination.isUnsubscribed) {
	                break;
	            }
	        }
	        if (!destination.isUnsubscribed) {
	            destination.complete();
	        }
	    } else if (typeof result[$$observable] === 'function') {
	        var obs = result[$$observable]();
	        if (typeof obs.subscribe !== 'function') {
	            destination.error('invalid observable');
	        } else {
	            return obs.subscribe(new InnerSubscriber_1.InnerSubscriber(outerSubscriber, outerValue, outerIndex));
	        }
	    } else {
	        destination.error(new TypeError('unknown type returned'));
	    }
	}
	exports.subscribeToResult = subscribeToResult;
	//# sourceMappingURL=subscribeToResult.js.map

/***/ },
/* 40 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var Subscriber_1 = __webpack_require__(6);
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @ignore
	 * @extends {Ignored}
	 */
	var InnerSubscriber = function (_super) {
	    __extends(InnerSubscriber, _super);
	    function InnerSubscriber(parent, outerValue, outerIndex) {
	        _super.call(this);
	        this.parent = parent;
	        this.outerValue = outerValue;
	        this.outerIndex = outerIndex;
	        this.index = 0;
	    }
	    InnerSubscriber.prototype._next = function (value) {
	        this.parent.notifyNext(this.outerValue, value, this.outerIndex, this.index++, this);
	    };
	    InnerSubscriber.prototype._error = function (error) {
	        this.parent.notifyError(error, this);
	        this.unsubscribe();
	    };
	    InnerSubscriber.prototype._complete = function () {
	        this.parent.notifyComplete(this);
	        this.unsubscribe();
	    };
	    return InnerSubscriber;
	}(Subscriber_1.Subscriber);
	exports.InnerSubscriber = InnerSubscriber;
	//# sourceMappingURL=InnerSubscriber.js.map

/***/ },
/* 41 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var Subscriber_1 = __webpack_require__(6);
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @ignore
	 * @extends {Ignored}
	 */
	var OuterSubscriber = function (_super) {
	    __extends(OuterSubscriber, _super);
	    function OuterSubscriber() {
	        _super.apply(this, arguments);
	    }
	    OuterSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
	        this.destination.next(innerValue);
	    };
	    OuterSubscriber.prototype.notifyError = function (error, innerSub) {
	        this.destination.error(error);
	    };
	    OuterSubscriber.prototype.notifyComplete = function (innerSub) {
	        this.destination.complete();
	    };
	    return OuterSubscriber;
	}(Subscriber_1.Subscriber);
	exports.OuterSubscriber = OuterSubscriber;
	//# sourceMappingURL=OuterSubscriber.js.map

/***/ },
/* 42 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var Observable_1 = __webpack_require__(2);
	var map_1 = __webpack_require__(43);
	Observable_1.Observable.prototype.map = map_1.map;
	//# sourceMappingURL=map.js.map

/***/ },
/* 43 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var Subscriber_1 = __webpack_require__(6);
	/**
	 * Applies a given `project` function to each value emitted by the source
	 * Observable, and emits the resulting values as an Observable.
	 *
	 * <span class="informal">Like [Array.prototype.map()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map),
	 * it passes each source value through a transformation function to get
	 * corresponding output values.</span>
	 *
	 * <img src="./img/map.png" width="100%">
	 *
	 * Similar to the well known `Array.prototype.map` function, this operator
	 * applies a projection to each value and emits that projection in the output
	 * Observable.
	 *
	 * @example <caption>Map every every click to the clientX position of that click</caption>
	 * var clicks = Rx.Observable.fromEvent(document, 'click');
	 * var positions = clicks.map(ev => ev.clientX);
	 * positions.subscribe(x => console.log(x));
	 *
	 * @see {@link mapTo}
	 * @see {@link pluck}
	 *
	 * @param {function(value: T, index: number): R} project The function to apply
	 * to each `value` emitted by the source Observable. The `index` parameter is
	 * the number `i` for the i-th emission that has happened since the
	 * subscription, starting from the number `0`.
	 * @param {any} [thisArg] An optional argument to define what `this` is in the
	 * `project` function.
	 * @return {Observable<R>} An Observable that emits the values from the source
	 * Observable transformed by the given `project` function.
	 * @method map
	 * @owner Observable
	 */
	function map(project, thisArg) {
	    if (typeof project !== 'function') {
	        throw new TypeError('argument is not a function. Are you looking for `mapTo()`?');
	    }
	    return this.lift(new MapOperator(project, thisArg));
	}
	exports.map = map;
	var MapOperator = function () {
	    function MapOperator(project, thisArg) {
	        this.project = project;
	        this.thisArg = thisArg;
	    }
	    MapOperator.prototype.call = function (subscriber, source) {
	        return source._subscribe(new MapSubscriber(subscriber, this.project, this.thisArg));
	    };
	    return MapOperator;
	}();
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @ignore
	 * @extends {Ignored}
	 */
	var MapSubscriber = function (_super) {
	    __extends(MapSubscriber, _super);
	    function MapSubscriber(destination, project, thisArg) {
	        _super.call(this, destination);
	        this.project = project;
	        this.count = 0;
	        this.thisArg = thisArg || this;
	    }
	    // NOTE: This looks unoptimized, but it's actually purposefully NOT
	    // using try/catch optimizations.
	    MapSubscriber.prototype._next = function (value) {
	        var result;
	        try {
	            result = this.project.call(this.thisArg, value, this.count++);
	        } catch (err) {
	            this.destination.error(err);
	            return;
	        }
	        this.destination.next(result);
	    };
	    return MapSubscriber;
	}(Subscriber_1.Subscriber);
	//# sourceMappingURL=map.js.map

/***/ },
/* 44 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var Observable_1 = __webpack_require__(2);
	var filter_1 = __webpack_require__(45);
	Observable_1.Observable.prototype.filter = filter_1.filter;
	//# sourceMappingURL=filter.js.map

/***/ },
/* 45 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var Subscriber_1 = __webpack_require__(6);
	/**
	 * Filter items emitted by the source Observable by only emitting those that
	 * satisfy a specified predicate.
	 *
	 * <span class="informal">Like
	 * [Array.prototype.filter()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter),
	 * it only emits a value from the source if it passes a criterion function.</span>
	 *
	 * <img src="./img/filter.png" width="100%">
	 *
	 * Similar to the well-known `Array.prototype.filter` method, this operator
	 * takes values from the source Observable, passes them through a `predicate`
	 * function and only emits those values that yielded `true`.
	 *
	 * @example <caption>Emit only click events whose target was a DIV element</caption>
	 * var clicks = Rx.Observable.fromEvent(document, 'click');
	 * var clicksOnDivs = clicks.filter(ev => ev.target.tagName === 'DIV');
	 * clicksOnDivs.subscribe(x => console.log(x));
	 *
	 * @see {@link distinct}
	 * @see {@link distinctKey}
	 * @see {@link distinctUntilChanged}
	 * @see {@link distinctUntilKeyChanged}
	 * @see {@link ignoreElements}
	 * @see {@link partition}
	 * @see {@link skip}
	 *
	 * @param {function(value: T, index: number): boolean} predicate A function that
	 * evaluates each value emitted by the source Observable. If it returns `true`,
	 * the value is emitted, if `false` the value is not passed to the output
	 * Observable. The `index` parameter is the number `i` for the i-th source
	 * emission that has happened since the subscription, starting from the number
	 * `0`.
	 * @param {any} [thisArg] An optional argument to determine the value of `this`
	 * in the `predicate` function.
	 * @return {Observable} An Observable of values from the source that were
	 * allowed by the `predicate` function.
	 * @method filter
	 * @owner Observable
	 */
	function filter(predicate, thisArg) {
	    return this.lift(new FilterOperator(predicate, thisArg));
	}
	exports.filter = filter;
	var FilterOperator = function () {
	    function FilterOperator(predicate, thisArg) {
	        this.predicate = predicate;
	        this.thisArg = thisArg;
	    }
	    FilterOperator.prototype.call = function (subscriber, source) {
	        return source._subscribe(new FilterSubscriber(subscriber, this.predicate, this.thisArg));
	    };
	    return FilterOperator;
	}();
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @ignore
	 * @extends {Ignored}
	 */
	var FilterSubscriber = function (_super) {
	    __extends(FilterSubscriber, _super);
	    function FilterSubscriber(destination, predicate, thisArg) {
	        _super.call(this, destination);
	        this.predicate = predicate;
	        this.thisArg = thisArg;
	        this.count = 0;
	        this.predicate = predicate;
	    }
	    // the try catch block below is left specifically for
	    // optimization and perf reasons. a tryCatcher is not necessary here.
	    FilterSubscriber.prototype._next = function (value) {
	        var result;
	        try {
	            result = this.predicate.call(this.thisArg, value, this.count++);
	        } catch (err) {
	            this.destination.error(err);
	            return;
	        }
	        if (result) {
	            this.destination.next(value);
	        }
	    };
	    return FilterSubscriber;
	}(Subscriber_1.Subscriber);
	//# sourceMappingURL=filter.js.map

/***/ },
/* 46 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var Observable_1 = __webpack_require__(2);
	var defaultIfEmpty_1 = __webpack_require__(47);
	Observable_1.Observable.prototype.defaultIfEmpty = defaultIfEmpty_1.defaultIfEmpty;
	//# sourceMappingURL=defaultIfEmpty.js.map

/***/ },
/* 47 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var Subscriber_1 = __webpack_require__(6);
	/**
	 * Emits a given value if the source Observable completes without emitting any
	 * `next` value, otherwise mirrors the source Observable.
	 *
	 * <span class="informal">If the source Observable turns out to be empty, then
	 * this operator will emit a default value.</span>
	 *
	 * <img src="./img/defaultIfEmpty.png" width="100%">
	 *
	 * `defaultIfEmpty` emits the values emitted by the source Observable or a
	 * specified default value if the source Observable is empty (completes without
	 * having emitted any `next` value).
	 *
	 * @example <caption>If no clicks happen in 5 seconds, then emit "no clicks"</caption>
	 * var clicks = Rx.Observable.fromEvent(document, 'click');
	 * var clicksBeforeFive = clicks.takeUntil(Rx.Observable.interval(5000));
	 * var result = clicksBeforeFive.defaultIfEmpty('no clicks');
	 * result.subscribe(x => console.log(x));
	 *
	 * @see {@link empty}
	 * @see {@link last}
	 *
	 * @param {any} [defaultValue=null] The default value used if the source
	 * Observable is empty.
	 * @return {Observable} An Observable that emits either the specified
	 * `defaultValue` if the source Observable emits no items, or the values emitted
	 * by the source Observable.
	 * @method defaultIfEmpty
	 * @owner Observable
	 */
	function defaultIfEmpty(defaultValue) {
	    if (defaultValue === void 0) {
	        defaultValue = null;
	    }
	    return this.lift(new DefaultIfEmptyOperator(defaultValue));
	}
	exports.defaultIfEmpty = defaultIfEmpty;
	var DefaultIfEmptyOperator = function () {
	    function DefaultIfEmptyOperator(defaultValue) {
	        this.defaultValue = defaultValue;
	    }
	    DefaultIfEmptyOperator.prototype.call = function (subscriber, source) {
	        return source._subscribe(new DefaultIfEmptySubscriber(subscriber, this.defaultValue));
	    };
	    return DefaultIfEmptyOperator;
	}();
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @ignore
	 * @extends {Ignored}
	 */
	var DefaultIfEmptySubscriber = function (_super) {
	    __extends(DefaultIfEmptySubscriber, _super);
	    function DefaultIfEmptySubscriber(destination, defaultValue) {
	        _super.call(this, destination);
	        this.defaultValue = defaultValue;
	        this.isEmpty = true;
	    }
	    DefaultIfEmptySubscriber.prototype._next = function (value) {
	        this.isEmpty = false;
	        this.destination.next(value);
	    };
	    DefaultIfEmptySubscriber.prototype._complete = function () {
	        if (this.isEmpty) {
	            this.destination.next(this.defaultValue);
	        }
	        this.destination.complete();
	    };
	    return DefaultIfEmptySubscriber;
	}(Subscriber_1.Subscriber);
	//# sourceMappingURL=defaultIfEmpty.js.map

/***/ },
/* 48 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;
	exports.UserDataTerm = exports.Limit = exports.Order = exports.Below = exports.Above = exports.FindAll = exports.Find = exports.Collection = exports.TermBase = undefined;

	var _possibleConstructorReturn2 = __webpack_require__(49);

	var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

	var _inherits2 = __webpack_require__(118);

	var _inherits3 = _interopRequireDefault(_inherits2);

	var _typeof2 = __webpack_require__(50);

	var _typeof3 = _interopRequireDefault(_typeof2);

	var _classCallCheck2 = __webpack_require__(126);

	var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

	exports.applyChange = applyChange;

	var _Observable = __webpack_require__(2);

	__webpack_require__(127);

	__webpack_require__(129);

	__webpack_require__(142);

	__webpack_require__(44);

	__webpack_require__(42);

	__webpack_require__(144);

	__webpack_require__(146);

	var _snakeCase = __webpack_require__(149);

	var _snakeCase2 = _interopRequireDefault(_snakeCase);

	var _checkArgs = __webpack_require__(155);

	var _checkArgs2 = _interopRequireDefault(_checkArgs);

	var _validIndexValue = __webpack_require__(157);

	var _validIndexValue2 = _interopRequireDefault(_validIndexValue);

	var _serialization = __webpack_require__(158);

	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : { 'default': obj };
	}

	/**
	 @this TermBase

	 Validation check to throw an exception if a method is chained onto a
	 query that already has it. It belongs to TermBase, but we don't want
	 to pollute the objects with it (since it isn't useful to api users),
	 so it's dynamically bound with :: inside methods that use it.
	*/
	function checkIfLegalToChain(key) {
	  if (this._legalMethods.indexOf(key) === -1) {
	    throw new Error(key + ' cannot be called on the current query');
	  }
	  if ((0, _snakeCase2['default'])(key) in this._query) {
	    throw new Error(key + ' has already been called on this query');
	  }
	}

	// Abstract base class for terms

	var TermBase = exports.TermBase = function () {
	  function TermBase(sendRequest, query, legalMethods) {
	    (0, _classCallCheck3['default'])(this, TermBase);

	    this._sendRequest = sendRequest;
	    this._query = query;
	    this._legalMethods = legalMethods;
	  }
	  // Returns a sequence of the result set. Every time it changes the
	  // updated sequence will be emitted. If raw change objects are
	  // needed, pass the option 'rawChanges: true'. An observable is
	  // returned which will lazily emit the query when it is subscribed
	  // to


	  TermBase.prototype.watch = function watch() {
	    var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

	    var _ref$rawChanges = _ref.rawChanges;
	    var rawChanges = _ref$rawChanges === undefined ? false : _ref$rawChanges;

	    var raw = this._sendRequest('subscribe', this._query);
	    if (rawChanges) {
	      return raw;
	    } else {
	      return makePresentable(raw, this._query);
	    }
	  };
	  // Grab a snapshot of the current query (non-changefeed). Emits an
	  // array with all results. An observable is returned which will
	  // lazily emit the query when subscribed to


	  TermBase.prototype.fetch = function fetch() {
	    var raw = this._sendRequest('query', this._query).map(function (val) {
	      delete val.$hz_v$;
	      return val;
	    });
	    if (this._query.find) {
	      return raw;
	    } else {
	      return raw.toArray();
	    }
	  };

	  TermBase.prototype.findAll = function findAll() {
	    for (var _len = arguments.length, fieldValues = Array(_len), _key = 0; _key < _len; _key++) {
	      fieldValues[_key] = arguments[_key];
	    }

	    checkIfLegalToChain.call(this, 'findAll');
	    (0, _checkArgs2['default'])('findAll', arguments, { maxArgs: 100 });
	    return new FindAll(this._sendRequest, this._query, fieldValues);
	  };

	  TermBase.prototype.find = function find(idOrObject) {
	    checkIfLegalToChain.call(this, 'find');
	    (0, _checkArgs2['default'])('find', arguments);
	    return new Find(this._sendRequest, this._query, idOrObject);
	  };

	  TermBase.prototype.order = function order(fields) {
	    var direction = arguments.length <= 1 || arguments[1] === undefined ? 'ascending' : arguments[1];

	    checkIfLegalToChain.call(this, 'order');
	    (0, _checkArgs2['default'])('order', arguments, { minArgs: 1, maxArgs: 2 });
	    return new Order(this._sendRequest, this._query, fields, direction);
	  };

	  TermBase.prototype.above = function above(aboveSpec) {
	    var bound = arguments.length <= 1 || arguments[1] === undefined ? 'closed' : arguments[1];

	    checkIfLegalToChain.call(this, 'above');
	    (0, _checkArgs2['default'])('above', arguments, { minArgs: 1, maxArgs: 2 });
	    return new Above(this._sendRequest, this._query, aboveSpec, bound);
	  };

	  TermBase.prototype.below = function below(belowSpec) {
	    var bound = arguments.length <= 1 || arguments[1] === undefined ? 'open' : arguments[1];

	    checkIfLegalToChain.call(this, 'below');
	    (0, _checkArgs2['default'])('below', arguments, { minArgs: 1, maxArgs: 2 });
	    return new Below(this._sendRequest, this._query, belowSpec, bound);
	  };

	  TermBase.prototype.limit = function limit(size) {
	    checkIfLegalToChain.call(this, 'limit');
	    (0, _checkArgs2['default'])('limit', arguments);
	    return new Limit(this._sendRequest, this._query, size);
	  };

	  return TermBase;
	}();

	// Turn a raw observable of server responses into user-presentable events
	//
	// `observable` is the base observable with full responses coming from
	//              the HorizonSocket
	// `query` is the value of `options` in the request


	function makePresentable(observable, query) {
	  // Whether the entire data structure is in each change
	  var pointQuery = Boolean(query.find);

	  if (pointQuery) {
	    var _ret = function () {
	      var hasEmitted = false;
	      var seedVal = null;
	      // Simplest case: just pass through new_val
	      return {
	        v: observable.filter(function (change) {
	          return !hasEmitted || change.type !== 'state';
	        }).scan(function (previous, change) {
	          hasEmitted = true;
	          if (change.new_val != null) {
	            delete change.new_val.$hz_v$;
	          }
	          if (change.old_val != null) {
	            delete change.old_val.$hz_v$;
	          }
	          if (change.state === 'synced') {
	            return previous;
	          } else {
	            return change.new_val;
	          }
	        }, seedVal)
	      };
	    }();

	    if ((typeof _ret === 'undefined' ? 'undefined' : (0, _typeof3['default'])(_ret)) === "object") return _ret.v;
	  } else {
	    var _seedVal = { emitted: false, val: [] };
	    return observable.scan(function (state, change) {
	      if (change.new_val != null) {
	        delete change.new_val.$hz_v$;
	      }
	      if (change.old_val != null) {
	        delete change.old_val.$hz_v$;
	      }
	      if (change.state === 'synced') {
	        state.emitted = true;
	      }
	      state.val = applyChange(state.val.slice(), change);
	      return state;
	    }, _seedVal).filter(function (state) {
	      return state.emitted;
	    }).map(function (x) {
	      return x.val;
	    });
	  }
	}

	function applyChange(arr, change) {
	  switch (change.type) {
	    case 'remove':
	    case 'uninitial':
	      {
	        // Remove old values from the array
	        if (change.old_offset != null) {
	          arr.splice(change.old_offset, 1);
	        } else {
	          var index = arr.findIndex(function (x) {
	            return x.id === change.old_val.id;
	          });
	          arr.splice(index, 1);
	        }
	        break;
	      }
	    case 'add':
	    case 'initial':
	      {
	        // Add new values to the array
	        if (change.new_offset != null) {
	          // If we have an offset, put it in the correct location
	          arr.splice(change.new_offset, 0, change.new_val);
	        } else {
	          // otherwise for unordered results, push it on the end
	          arr.push(change.new_val);
	        }
	        break;
	      }
	    case 'change':
	      {
	        // Modify in place if a change is happening
	        if (change.old_offset != null) {
	          // Remove the old document from the results
	          arr.splice(change.old_offset, 1);
	        }
	        if (change.new_offset != null) {
	          // Splice in the new val if we have an offset
	          arr.splice(change.new_offset, 0, change.new_val);
	        } else {
	          // If we don't have an offset, find the old val and
	          // replace it with the new val
	          var _index = arr.findIndex(function (x) {
	            return x.id === change.old_val.id;
	          });
	          arr[_index] = change.new_val;
	        }
	        break;
	      }
	    case 'state':
	      {
	        // This gets hit if we have not emitted yet, and should
	        // result in an empty array being output.
	        break;
	      }
	    default:
	      throw new Error('unrecognized \'type\' field from server ' + JSON.stringify(change));
	  }
	  return arr;
	}

	/** @this Collection
	 Implements writeOps for the Collection class
	*/
	function writeOp(name, args, documents) {
	  (0, _checkArgs2['default'])(name, args);
	  var isBatch = true;
	  var wrappedDocs = documents;
	  if (!Array.isArray(documents)) {
	    // Wrap in an array if we need to
	    wrappedDocs = [documents];
	    isBatch = false;
	  } else if (documents.length === 0) {
	    // Don't bother sending no-ops to the server
	    return _Observable.Observable.empty();
	  }
	  var options = Object.assign({}, this._query, { data: (0, _serialization.serialize)(wrappedDocs) });
	  var observable = this._sendRequest(name, options);
	  if (isBatch) {
	    // If this is a batch writeOp, each document may succeed or fail
	    // individually.
	    observable = observable.map(function (resp) {
	      return resp.error ? new Error(resp.error) : resp;
	    });
	  } else {
	    (function () {
	      // If this is a single writeOp, the entire operation should fail
	      // if any fails.
	      var _prevOb = observable;
	      observable = _Observable.Observable.create(function (subscriber) {
	        _prevOb.subscribe({
	          next: function next(resp) {
	            if (resp.error) {
	              // TODO: handle error ids when we get them
	              subscriber.error(new Error(resp.error));
	            } else {
	              subscriber.next(resp);
	            }
	          },
	          error: function error(err) {
	            subscriber.error(err);
	          },
	          complete: function complete() {
	            subscriber.complete();
	          }
	        });
	      });
	    })();
	  }
	  if (!this._lazyWrites) {
	    // Need to buffer response since this becomes a hot observable and
	    // when we subscribe matters
	    observable = observable.publishReplay().refCount();
	    observable.subscribe();
	  }
	  return observable;
	}

	var Collection = exports.Collection = function (_TermBase) {
	  (0, _inherits3['default'])(Collection, _TermBase);

	  function Collection(sendRequest, collectionName, lazyWrites) {
	    (0, _classCallCheck3['default'])(this, Collection);

	    var query = { collection: collectionName };
	    var legalMethods = ['find', 'findAll', 'justInitial', 'order', 'above', 'below', 'limit'];

	    var _this = (0, _possibleConstructorReturn3['default'])(this, _TermBase.call(this, sendRequest, query, legalMethods));

	    _this._lazyWrites = lazyWrites;
	    return _this;
	  }

	  Collection.prototype.store = function store(documents) {
	    return writeOp.call(this, 'store', arguments, documents);
	  };

	  Collection.prototype.upsert = function upsert(documents) {
	    return writeOp.call(this, 'upsert', arguments, documents);
	  };

	  Collection.prototype.insert = function insert(documents) {
	    return writeOp.call(this, 'insert', arguments, documents);
	  };

	  Collection.prototype.replace = function replace(documents) {
	    return writeOp.call(this, 'replace', arguments, documents);
	  };

	  Collection.prototype.update = function update(documents) {
	    return writeOp.call(this, 'update', arguments, documents);
	  };

	  Collection.prototype.remove = function remove(documentOrId) {
	    var wrapped = (0, _validIndexValue2['default'])(documentOrId) ? { id: documentOrId } : documentOrId;
	    return writeOp.call(this, 'remove', arguments, wrapped);
	  };

	  Collection.prototype.removeAll = function removeAll(documentsOrIds) {
	    if (!Array.isArray(documentsOrIds)) {
	      throw new Error('removeAll takes an array as an argument');
	    }
	    var wrapped = documentsOrIds.map(function (item) {
	      if ((0, _validIndexValue2['default'])(item)) {
	        return { id: item };
	      } else {
	        return item;
	      }
	    });
	    return writeOp.call(this, 'removeAll', arguments, wrapped);
	  };

	  return Collection;
	}(TermBase);

	var Find = exports.Find = function (_TermBase2) {
	  (0, _inherits3['default'])(Find, _TermBase2);

	  function Find(sendRequest, previousQuery, idOrObject) {
	    (0, _classCallCheck3['default'])(this, Find);

	    var findObject = (0, _validIndexValue2['default'])(idOrObject) ? { id: idOrObject } : idOrObject;
	    var query = Object.assign({}, previousQuery, { find: findObject });
	    return (0, _possibleConstructorReturn3['default'])(this, _TermBase2.call(this, sendRequest, query, []));
	  }

	  return Find;
	}(TermBase);

	var FindAll = exports.FindAll = function (_TermBase3) {
	  (0, _inherits3['default'])(FindAll, _TermBase3);

	  function FindAll(sendRequest, previousQuery, fieldValues) {
	    (0, _classCallCheck3['default'])(this, FindAll);

	    var wrappedFields = fieldValues.map(function (item) {
	      return (0, _validIndexValue2['default'])(item) ? { id: item } : item;
	    });
	    var options = { find_all: wrappedFields };
	    var findAllQuery = Object.assign({}, previousQuery, options);
	    var legalMethods = void 0;
	    if (wrappedFields.length === 1) {
	      legalMethods = ['order', 'above', 'below', 'limit'];
	    } else {
	      // The vararg version of findAll cannot have anything chained to it
	      legalMethods = [];
	    }
	    return (0, _possibleConstructorReturn3['default'])(this, _TermBase3.call(this, sendRequest, findAllQuery, legalMethods));
	  }

	  return FindAll;
	}(TermBase);

	var Above = exports.Above = function (_TermBase4) {
	  (0, _inherits3['default'])(Above, _TermBase4);

	  function Above(sendRequest, previousQuery, aboveSpec, bound) {
	    (0, _classCallCheck3['default'])(this, Above);

	    var option = { above: [aboveSpec, bound] };
	    var query = Object.assign({}, previousQuery, option);
	    var legalMethods = ['findAll', 'order', 'below', 'limit'];
	    return (0, _possibleConstructorReturn3['default'])(this, _TermBase4.call(this, sendRequest, query, legalMethods));
	  }

	  return Above;
	}(TermBase);

	var Below = exports.Below = function (_TermBase5) {
	  (0, _inherits3['default'])(Below, _TermBase5);

	  function Below(sendRequest, previousQuery, belowSpec, bound) {
	    (0, _classCallCheck3['default'])(this, Below);

	    var options = { below: [belowSpec, bound] };
	    var query = Object.assign({}, previousQuery, options);
	    var legalMethods = ['findAll', 'order', 'above', 'limit'];
	    return (0, _possibleConstructorReturn3['default'])(this, _TermBase5.call(this, sendRequest, query, legalMethods));
	  }

	  return Below;
	}(TermBase);

	var Order = exports.Order = function (_TermBase6) {
	  (0, _inherits3['default'])(Order, _TermBase6);

	  function Order(sendRequest, previousQuery, fields, direction) {
	    (0, _classCallCheck3['default'])(this, Order);

	    var wrappedFields = Array.isArray(fields) ? fields : [fields];
	    var options = { order: [wrappedFields, direction] };
	    var query = Object.assign({}, previousQuery, options);
	    var legalMethods = ['findAll', 'above', 'below', 'limit'];
	    return (0, _possibleConstructorReturn3['default'])(this, _TermBase6.call(this, sendRequest, query, legalMethods));
	  }

	  return Order;
	}(TermBase);

	var Limit = exports.Limit = function (_TermBase7) {
	  (0, _inherits3['default'])(Limit, _TermBase7);

	  function Limit(sendRequest, previousQuery, size) {
	    (0, _classCallCheck3['default'])(this, Limit);

	    var query = Object.assign({}, previousQuery, { limit: size });
	    // Nothing is legal to chain after .limit
	    return (0, _possibleConstructorReturn3['default'])(this, _TermBase7.call(this, sendRequest, query, []));
	  }

	  return Limit;
	}(TermBase);

	var UserDataTerm = exports.UserDataTerm = function () {
	  function UserDataTerm(hz, handshake, socket) {
	    (0, _classCallCheck3['default'])(this, UserDataTerm);

	    this._hz = hz;
	    this._before = _Observable.Observable.merge(socket.take(0), // just need to force connection
	    handshake // guarantee we get handshake even if we're already
	    // connected
	    );
	  }

	  UserDataTerm.prototype._query = function _query(userId) {
	    return this._hz('users').find(userId);
	  };

	  UserDataTerm.prototype.fetch = function fetch() {
	    var _this8 = this;

	    return this._before.concatMap(function (handshake) {
	      if (handshake.id === null) {
	        return _Observable.Observable.of({});
	      } else {
	        return _this8._query(handshake.id).fetch();
	      }
	    });
	  };

	  UserDataTerm.prototype.watch = function watch() {
	    var _this9 = this;

	    for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
	      args[_key2] = arguments[_key2];
	    }

	    return this._before.concatMap(function (handshake) {
	      if (handshake.id === null) {
	        return _Observable.Observable.of({});
	      } else {
	        var _query2;

	        return (_query2 = _this9._query(handshake.id)).watch.apply(_query2, args);
	      }
	    });
	  };

	  return UserDataTerm;
	}();
	//# sourceMappingURL=ast.js.map

/***/ },
/* 49 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	exports.__esModule = true;

	var _typeof2 = __webpack_require__(50);

	var _typeof3 = _interopRequireDefault(_typeof2);

	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : { "default": obj };
	}

	exports["default"] = function (self, call) {
	  if (!self) {
	    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
	  }

	  return call && ((typeof call === "undefined" ? "undefined" : (0, _typeof3["default"])(call)) === "object" || typeof call === "function") ? call : self;
	};

/***/ },
/* 50 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var _typeof2 = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

	exports.__esModule = true;

	var _iterator = __webpack_require__(51);

	var _iterator2 = _interopRequireDefault(_iterator);

	var _symbol = __webpack_require__(102);

	var _symbol2 = _interopRequireDefault(_symbol);

	var _typeof = typeof _symbol2["default"] === "function" && _typeof2(_iterator2["default"]) === "symbol" ? function (obj) {
	  return typeof obj === "undefined" ? "undefined" : _typeof2(obj);
	} : function (obj) {
	  return obj && typeof _symbol2["default"] === "function" && obj.constructor === _symbol2["default"] ? "symbol" : typeof obj === "undefined" ? "undefined" : _typeof2(obj);
	};

	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : { "default": obj };
	}

	exports["default"] = typeof _symbol2["default"] === "function" && _typeof(_iterator2["default"]) === "symbol" ? function (obj) {
	  return typeof obj === "undefined" ? "undefined" : _typeof(obj);
	} : function (obj) {
	  return obj && typeof _symbol2["default"] === "function" && obj.constructor === _symbol2["default"] ? "symbol" : typeof obj === "undefined" ? "undefined" : _typeof(obj);
	};

/***/ },
/* 51 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	module.exports = { "default": __webpack_require__(52), __esModule: true };

/***/ },
/* 52 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	__webpack_require__(53);
	__webpack_require__(97);
	module.exports = __webpack_require__(101).f('iterator');

/***/ },
/* 53 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var $at = __webpack_require__(54)(true);

	// 21.1.3.27 String.prototype[@@iterator]()
	__webpack_require__(57)(String, 'String', function (iterated) {
	  this._t = String(iterated); // target
	  this._i = 0; // next index
	  // 21.1.5.2.1 %StringIteratorPrototype%.next()
	}, function () {
	  var O = this._t,
	      index = this._i,
	      point;
	  if (index >= O.length) return { value: undefined, done: true };
	  point = $at(O, index);
	  this._i += point.length;
	  return { value: point, done: false };
	});

/***/ },
/* 54 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var toInteger = __webpack_require__(55),
	    defined = __webpack_require__(56);
	// true  -> String#at
	// false -> String#codePointAt
	module.exports = function (TO_STRING) {
	  return function (that, pos) {
	    var s = String(defined(that)),
	        i = toInteger(pos),
	        l = s.length,
	        a,
	        b;
	    if (i < 0 || i >= l) return TO_STRING ? '' : undefined;
	    a = s.charCodeAt(i);
	    return a < 0xd800 || a > 0xdbff || i + 1 === l || (b = s.charCodeAt(i + 1)) < 0xdc00 || b > 0xdfff ? TO_STRING ? s.charAt(i) : a : TO_STRING ? s.slice(i, i + 2) : (a - 0xd800 << 10) + (b - 0xdc00) + 0x10000;
	  };
	};

/***/ },
/* 55 */
/***/ function(module, exports) {

	"use strict";

	// 7.1.4 ToInteger
	var ceil = Math.ceil,
	    floor = Math.floor;
	module.exports = function (it) {
	  return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
	};

/***/ },
/* 56 */
/***/ function(module, exports) {

	"use strict";

	// 7.2.1 RequireObjectCoercible(argument)
	module.exports = function (it) {
	  if (it == undefined) throw TypeError("Can't call method on  " + it);
	  return it;
	};

/***/ },
/* 57 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var LIBRARY = __webpack_require__(58),
	    $export = __webpack_require__(59),
	    redefine = __webpack_require__(74),
	    hide = __webpack_require__(64),
	    has = __webpack_require__(75),
	    Iterators = __webpack_require__(76),
	    $iterCreate = __webpack_require__(77),
	    setToStringTag = __webpack_require__(93),
	    getPrototypeOf = __webpack_require__(95),
	    ITERATOR = __webpack_require__(94)('iterator'),
	    BUGGY = !([].keys && 'next' in [].keys()) // Safari has buggy iterators w/o `next`
	,
	    FF_ITERATOR = '@@iterator',
	    KEYS = 'keys',
	    VALUES = 'values';

	var returnThis = function returnThis() {
	  return this;
	};

	module.exports = function (Base, NAME, Constructor, next, DEFAULT, IS_SET, FORCED) {
	  $iterCreate(Constructor, NAME, next);
	  var getMethod = function getMethod(kind) {
	    if (!BUGGY && kind in proto) return proto[kind];
	    switch (kind) {
	      case KEYS:
	        return function keys() {
	          return new Constructor(this, kind);
	        };
	      case VALUES:
	        return function values() {
	          return new Constructor(this, kind);
	        };
	    }return function entries() {
	      return new Constructor(this, kind);
	    };
	  };
	  var TAG = NAME + ' Iterator',
	      DEF_VALUES = DEFAULT == VALUES,
	      VALUES_BUG = false,
	      proto = Base.prototype,
	      $native = proto[ITERATOR] || proto[FF_ITERATOR] || DEFAULT && proto[DEFAULT],
	      $default = $native || getMethod(DEFAULT),
	      $entries = DEFAULT ? !DEF_VALUES ? $default : getMethod('entries') : undefined,
	      $anyNative = NAME == 'Array' ? proto.entries || $native : $native,
	      methods,
	      key,
	      IteratorPrototype;
	  // Fix native
	  if ($anyNative) {
	    IteratorPrototype = getPrototypeOf($anyNative.call(new Base()));
	    if (IteratorPrototype !== Object.prototype) {
	      // Set @@toStringTag to native iterators
	      setToStringTag(IteratorPrototype, TAG, true);
	      // fix for some old engines
	      if (!LIBRARY && !has(IteratorPrototype, ITERATOR)) hide(IteratorPrototype, ITERATOR, returnThis);
	    }
	  }
	  // fix Array#{values, @@iterator}.name in V8 / FF
	  if (DEF_VALUES && $native && $native.name !== VALUES) {
	    VALUES_BUG = true;
	    $default = function values() {
	      return $native.call(this);
	    };
	  }
	  // Define iterator
	  if ((!LIBRARY || FORCED) && (BUGGY || VALUES_BUG || !proto[ITERATOR])) {
	    hide(proto, ITERATOR, $default);
	  }
	  // Plug for library
	  Iterators[NAME] = $default;
	  Iterators[TAG] = returnThis;
	  if (DEFAULT) {
	    methods = {
	      values: DEF_VALUES ? $default : getMethod(VALUES),
	      keys: IS_SET ? $default : getMethod(KEYS),
	      entries: $entries
	    };
	    if (FORCED) for (key in methods) {
	      if (!(key in proto)) redefine(proto, key, methods[key]);
	    } else $export($export.P + $export.F * (BUGGY || VALUES_BUG), NAME, methods);
	  }
	  return methods;
	};

/***/ },
/* 58 */
/***/ function(module, exports) {

	"use strict";

	module.exports = true;

/***/ },
/* 59 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var global = __webpack_require__(60),
	    core = __webpack_require__(61),
	    ctx = __webpack_require__(62),
	    hide = __webpack_require__(64),
	    PROTOTYPE = 'prototype';

	var $export = function $export(type, name, source) {
	  var IS_FORCED = type & $export.F,
	      IS_GLOBAL = type & $export.G,
	      IS_STATIC = type & $export.S,
	      IS_PROTO = type & $export.P,
	      IS_BIND = type & $export.B,
	      IS_WRAP = type & $export.W,
	      exports = IS_GLOBAL ? core : core[name] || (core[name] = {}),
	      expProto = exports[PROTOTYPE],
	      target = IS_GLOBAL ? global : IS_STATIC ? global[name] : (global[name] || {})[PROTOTYPE],
	      key,
	      own,
	      out;
	  if (IS_GLOBAL) source = name;
	  for (key in source) {
	    // contains in native
	    own = !IS_FORCED && target && target[key] !== undefined;
	    if (own && key in exports) continue;
	    // export native or passed
	    out = own ? target[key] : source[key];
	    // prevent global pollution for namespaces
	    exports[key] = IS_GLOBAL && typeof target[key] != 'function' ? source[key]
	    // bind timers to global for call from export context
	    : IS_BIND && own ? ctx(out, global)
	    // wrap global constructors for prevent change them in library
	    : IS_WRAP && target[key] == out ? function (C) {
	      var F = function F(a, b, c) {
	        if (this instanceof C) {
	          switch (arguments.length) {
	            case 0:
	              return new C();
	            case 1:
	              return new C(a);
	            case 2:
	              return new C(a, b);
	          }return new C(a, b, c);
	        }return C.apply(this, arguments);
	      };
	      F[PROTOTYPE] = C[PROTOTYPE];
	      return F;
	      // make static versions for prototype methods
	    }(out) : IS_PROTO && typeof out == 'function' ? ctx(Function.call, out) : out;
	    // export proto methods to core.%CONSTRUCTOR%.methods.%NAME%
	    if (IS_PROTO) {
	      (exports.virtual || (exports.virtual = {}))[key] = out;
	      // export proto methods to core.%CONSTRUCTOR%.prototype.%NAME%
	      if (type & $export.R && expProto && !expProto[key]) hide(expProto, key, out);
	    }
	  }
	};
	// type bitmap
	$export.F = 1; // forced
	$export.G = 2; // global
	$export.S = 4; // static
	$export.P = 8; // proto
	$export.B = 16; // bind
	$export.W = 32; // wrap
	$export.U = 64; // safe
	$export.R = 128; // real proto method for `library` 
	module.exports = $export;

/***/ },
/* 60 */
/***/ function(module, exports) {

	'use strict';

	// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
	var global = module.exports = typeof window != 'undefined' && window.Math == Math ? window : typeof self != 'undefined' && self.Math == Math ? self : Function('return this')();
	if (typeof __g == 'number') __g = global; // eslint-disable-line no-undef

/***/ },
/* 61 */
/***/ function(module, exports) {

	'use strict';

	var core = module.exports = { version: '2.4.0' };
	if (typeof __e == 'number') __e = core; // eslint-disable-line no-undef

/***/ },
/* 62 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	// optional / simple context binding
	var aFunction = __webpack_require__(63);
	module.exports = function (fn, that, length) {
	  aFunction(fn);
	  if (that === undefined) return fn;
	  switch (length) {
	    case 1:
	      return function (a) {
	        return fn.call(that, a);
	      };
	    case 2:
	      return function (a, b) {
	        return fn.call(that, a, b);
	      };
	    case 3:
	      return function (a, b, c) {
	        return fn.call(that, a, b, c);
	      };
	  }
	  return function () /* ...args */{
	    return fn.apply(that, arguments);
	  };
	};

/***/ },
/* 63 */
/***/ function(module, exports) {

	'use strict';

	module.exports = function (it) {
	  if (typeof it != 'function') throw TypeError(it + ' is not a function!');
	  return it;
	};

/***/ },
/* 64 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var dP = __webpack_require__(65),
	    createDesc = __webpack_require__(73);
	module.exports = __webpack_require__(69) ? function (object, key, value) {
	  return dP.f(object, key, createDesc(1, value));
	} : function (object, key, value) {
	  object[key] = value;
	  return object;
	};

/***/ },
/* 65 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var anObject = __webpack_require__(66),
	    IE8_DOM_DEFINE = __webpack_require__(68),
	    toPrimitive = __webpack_require__(72),
	    dP = Object.defineProperty;

	exports.f = __webpack_require__(69) ? Object.defineProperty : function defineProperty(O, P, Attributes) {
	  anObject(O);
	  P = toPrimitive(P, true);
	  anObject(Attributes);
	  if (IE8_DOM_DEFINE) try {
	    return dP(O, P, Attributes);
	  } catch (e) {/* empty */}
	  if ('get' in Attributes || 'set' in Attributes) throw TypeError('Accessors not supported!');
	  if ('value' in Attributes) O[P] = Attributes.value;
	  return O;
	};

/***/ },
/* 66 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var isObject = __webpack_require__(67);
	module.exports = function (it) {
	  if (!isObject(it)) throw TypeError(it + ' is not an object!');
	  return it;
	};

/***/ },
/* 67 */
/***/ function(module, exports) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

	module.exports = function (it) {
	  return (typeof it === 'undefined' ? 'undefined' : _typeof(it)) === 'object' ? it !== null : typeof it === 'function';
	};

/***/ },
/* 68 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = !__webpack_require__(69) && !__webpack_require__(70)(function () {
	  return Object.defineProperty(__webpack_require__(71)('div'), 'a', { get: function get() {
	      return 7;
	    } }).a != 7;
	});

/***/ },
/* 69 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	// Thank's IE8 for his funny defineProperty
	module.exports = !__webpack_require__(70)(function () {
	  return Object.defineProperty({}, 'a', { get: function get() {
	      return 7;
	    } }).a != 7;
	});

/***/ },
/* 70 */
/***/ function(module, exports) {

	"use strict";

	module.exports = function (exec) {
	  try {
	    return !!exec();
	  } catch (e) {
	    return true;
	  }
	};

/***/ },
/* 71 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var isObject = __webpack_require__(67),
	    document = __webpack_require__(60).document
	// in old IE typeof document.createElement is 'object'
	,
	    is = isObject(document) && isObject(document.createElement);
	module.exports = function (it) {
	  return is ? document.createElement(it) : {};
	};

/***/ },
/* 72 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	// 7.1.1 ToPrimitive(input [, PreferredType])
	var isObject = __webpack_require__(67);
	// instead of the ES6 spec version, we didn't implement @@toPrimitive case
	// and the second argument - flag - preferred type is a string
	module.exports = function (it, S) {
	  if (!isObject(it)) return it;
	  var fn, val;
	  if (S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it))) return val;
	  if (typeof (fn = it.valueOf) == 'function' && !isObject(val = fn.call(it))) return val;
	  if (!S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it))) return val;
	  throw TypeError("Can't convert object to primitive value");
	};

/***/ },
/* 73 */
/***/ function(module, exports) {

	"use strict";

	module.exports = function (bitmap, value) {
	  return {
	    enumerable: !(bitmap & 1),
	    configurable: !(bitmap & 2),
	    writable: !(bitmap & 4),
	    value: value
	  };
	};

/***/ },
/* 74 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = __webpack_require__(64);

/***/ },
/* 75 */
/***/ function(module, exports) {

	"use strict";

	var hasOwnProperty = {}.hasOwnProperty;
	module.exports = function (it, key) {
	  return hasOwnProperty.call(it, key);
	};

/***/ },
/* 76 */
/***/ function(module, exports) {

	"use strict";

	module.exports = {};

/***/ },
/* 77 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var create = __webpack_require__(78),
	    descriptor = __webpack_require__(73),
	    setToStringTag = __webpack_require__(93),
	    IteratorPrototype = {};

	// 25.1.2.1.1 %IteratorPrototype%[@@iterator]()
	__webpack_require__(64)(IteratorPrototype, __webpack_require__(94)('iterator'), function () {
	  return this;
	});

	module.exports = function (Constructor, NAME, next) {
	  Constructor.prototype = create(IteratorPrototype, { next: descriptor(1, next) });
	  setToStringTag(Constructor, NAME + ' Iterator');
	};

/***/ },
/* 78 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	// 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])
	var anObject = __webpack_require__(66),
	    dPs = __webpack_require__(79),
	    enumBugKeys = __webpack_require__(91),
	    IE_PROTO = __webpack_require__(88)('IE_PROTO'),
	    Empty = function Empty() {/* empty */},
	    PROTOTYPE = 'prototype';

	// Create object with fake `null` prototype: use iframe Object with cleared prototype
	var _createDict = function createDict() {
	  // Thrash, waste and sodomy: IE GC bug
	  var iframe = __webpack_require__(71)('iframe'),
	      i = enumBugKeys.length,
	      lt = '<',
	      gt = '>',
	      iframeDocument;
	  iframe.style.display = 'none';
	  __webpack_require__(92).appendChild(iframe);
	  iframe.src = 'javascript:'; // eslint-disable-line no-script-url
	  // createDict = iframe.contentWindow.Object;
	  // html.removeChild(iframe);
	  iframeDocument = iframe.contentWindow.document;
	  iframeDocument.open();
	  iframeDocument.write(lt + 'script' + gt + 'document.F=Object' + lt + '/script' + gt);
	  iframeDocument.close();
	  _createDict = iframeDocument.F;
	  while (i--) {
	    delete _createDict[PROTOTYPE][enumBugKeys[i]];
	  }return _createDict();
	};

	module.exports = Object.create || function create(O, Properties) {
	  var result;
	  if (O !== null) {
	    Empty[PROTOTYPE] = anObject(O);
	    result = new Empty();
	    Empty[PROTOTYPE] = null;
	    // add "__proto__" for Object.getPrototypeOf polyfill
	    result[IE_PROTO] = O;
	  } else result = _createDict();
	  return Properties === undefined ? result : dPs(result, Properties);
	};

/***/ },
/* 79 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var dP = __webpack_require__(65),
	    anObject = __webpack_require__(66),
	    getKeys = __webpack_require__(80);

	module.exports = __webpack_require__(69) ? Object.defineProperties : function defineProperties(O, Properties) {
	  anObject(O);
	  var keys = getKeys(Properties),
	      length = keys.length,
	      i = 0,
	      P;
	  while (length > i) {
	    dP.f(O, P = keys[i++], Properties[P]);
	  }return O;
	};

/***/ },
/* 80 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	// 19.1.2.14 / 15.2.3.14 Object.keys(O)
	var $keys = __webpack_require__(81),
	    enumBugKeys = __webpack_require__(91);

	module.exports = Object.keys || function keys(O) {
	  return $keys(O, enumBugKeys);
	};

/***/ },
/* 81 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var has = __webpack_require__(75),
	    toIObject = __webpack_require__(82),
	    arrayIndexOf = __webpack_require__(85)(false),
	    IE_PROTO = __webpack_require__(88)('IE_PROTO');

	module.exports = function (object, names) {
	  var O = toIObject(object),
	      i = 0,
	      result = [],
	      key;
	  for (key in O) {
	    if (key != IE_PROTO) has(O, key) && result.push(key);
	  } // Don't enum bug & hidden keys
	  while (names.length > i) {
	    if (has(O, key = names[i++])) {
	      ~arrayIndexOf(result, key) || result.push(key);
	    }
	  }return result;
	};

/***/ },
/* 82 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	// to indexed object, toObject with fallback for non-array-like ES3 strings
	var IObject = __webpack_require__(83),
	    defined = __webpack_require__(56);
	module.exports = function (it) {
	  return IObject(defined(it));
	};

/***/ },
/* 83 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	// fallback for non-array-like ES3 and non-enumerable old V8 strings
	var cof = __webpack_require__(84);
	module.exports = Object('z').propertyIsEnumerable(0) ? Object : function (it) {
	  return cof(it) == 'String' ? it.split('') : Object(it);
	};

/***/ },
/* 84 */
/***/ function(module, exports) {

	"use strict";

	var toString = {}.toString;

	module.exports = function (it) {
	  return toString.call(it).slice(8, -1);
	};

/***/ },
/* 85 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	// false -> Array#indexOf
	// true  -> Array#includes
	var toIObject = __webpack_require__(82),
	    toLength = __webpack_require__(86),
	    toIndex = __webpack_require__(87);
	module.exports = function (IS_INCLUDES) {
	  return function ($this, el, fromIndex) {
	    var O = toIObject($this),
	        length = toLength(O.length),
	        index = toIndex(fromIndex, length),
	        value;
	    // Array#includes uses SameValueZero equality algorithm
	    if (IS_INCLUDES && el != el) while (length > index) {
	      value = O[index++];
	      if (value != value) return true;
	      // Array#toIndex ignores holes, Array#includes - not
	    } else for (; length > index; index++) {
	      if (IS_INCLUDES || index in O) {
	        if (O[index] === el) return IS_INCLUDES || index || 0;
	      }
	    }return !IS_INCLUDES && -1;
	  };
	};

/***/ },
/* 86 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	// 7.1.15 ToLength
	var toInteger = __webpack_require__(55),
	    min = Math.min;
	module.exports = function (it) {
	  return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0; // pow(2, 53) - 1 == 9007199254740991
	};

/***/ },
/* 87 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var toInteger = __webpack_require__(55),
	    max = Math.max,
	    min = Math.min;
	module.exports = function (index, length) {
	  index = toInteger(index);
	  return index < 0 ? max(index + length, 0) : min(index, length);
	};

/***/ },
/* 88 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var shared = __webpack_require__(89)('keys'),
	    uid = __webpack_require__(90);
	module.exports = function (key) {
	  return shared[key] || (shared[key] = uid(key));
	};

/***/ },
/* 89 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var global = __webpack_require__(60),
	    SHARED = '__core-js_shared__',
	    store = global[SHARED] || (global[SHARED] = {});
	module.exports = function (key) {
	  return store[key] || (store[key] = {});
	};

/***/ },
/* 90 */
/***/ function(module, exports) {

	'use strict';

	var id = 0,
	    px = Math.random();
	module.exports = function (key) {
	  return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
	};

/***/ },
/* 91 */
/***/ function(module, exports) {

	'use strict';

	// IE 8- don't enum bug keys
	module.exports = 'constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf'.split(',');

/***/ },
/* 92 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = __webpack_require__(60).document && document.documentElement;

/***/ },
/* 93 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var def = __webpack_require__(65).f,
	    has = __webpack_require__(75),
	    TAG = __webpack_require__(94)('toStringTag');

	module.exports = function (it, tag, stat) {
	  if (it && !has(it = stat ? it : it.prototype, TAG)) def(it, TAG, { configurable: true, value: tag });
	};

/***/ },
/* 94 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var store = __webpack_require__(89)('wks'),
	    uid = __webpack_require__(90),
	    _Symbol = __webpack_require__(60).Symbol,
	    USE_SYMBOL = typeof _Symbol == 'function';

	var $exports = module.exports = function (name) {
	  return store[name] || (store[name] = USE_SYMBOL && _Symbol[name] || (USE_SYMBOL ? _Symbol : uid)('Symbol.' + name));
	};

	$exports.store = store;

/***/ },
/* 95 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	// 19.1.2.9 / 15.2.3.2 Object.getPrototypeOf(O)
	var has = __webpack_require__(75),
	    toObject = __webpack_require__(96),
	    IE_PROTO = __webpack_require__(88)('IE_PROTO'),
	    ObjectProto = Object.prototype;

	module.exports = Object.getPrototypeOf || function (O) {
	  O = toObject(O);
	  if (has(O, IE_PROTO)) return O[IE_PROTO];
	  if (typeof O.constructor == 'function' && O instanceof O.constructor) {
	    return O.constructor.prototype;
	  }return O instanceof Object ? ObjectProto : null;
	};

/***/ },
/* 96 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	// 7.1.13 ToObject(argument)
	var defined = __webpack_require__(56);
	module.exports = function (it) {
	  return Object(defined(it));
	};

/***/ },
/* 97 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	__webpack_require__(98);
	var global = __webpack_require__(60),
	    hide = __webpack_require__(64),
	    Iterators = __webpack_require__(76),
	    TO_STRING_TAG = __webpack_require__(94)('toStringTag');

	for (var collections = ['NodeList', 'DOMTokenList', 'MediaList', 'StyleSheetList', 'CSSRuleList'], i = 0; i < 5; i++) {
	  var NAME = collections[i],
	      Collection = global[NAME],
	      proto = Collection && Collection.prototype;
	  if (proto && !proto[TO_STRING_TAG]) hide(proto, TO_STRING_TAG, NAME);
	  Iterators[NAME] = Iterators.Array;
	}

/***/ },
/* 98 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var addToUnscopables = __webpack_require__(99),
	    step = __webpack_require__(100),
	    Iterators = __webpack_require__(76),
	    toIObject = __webpack_require__(82);

	// 22.1.3.4 Array.prototype.entries()
	// 22.1.3.13 Array.prototype.keys()
	// 22.1.3.29 Array.prototype.values()
	// 22.1.3.30 Array.prototype[@@iterator]()
	module.exports = __webpack_require__(57)(Array, 'Array', function (iterated, kind) {
	  this._t = toIObject(iterated); // target
	  this._i = 0; // next index
	  this._k = kind; // kind
	  // 22.1.5.2.1 %ArrayIteratorPrototype%.next()
	}, function () {
	  var O = this._t,
	      kind = this._k,
	      index = this._i++;
	  if (!O || index >= O.length) {
	    this._t = undefined;
	    return step(1);
	  }
	  if (kind == 'keys') return step(0, index);
	  if (kind == 'values') return step(0, O[index]);
	  return step(0, [index, O[index]]);
	}, 'values');

	// argumentsList[@@iterator] is %ArrayProto_values% (9.4.4.6, 9.4.4.7)
	Iterators.Arguments = Iterators.Array;

	addToUnscopables('keys');
	addToUnscopables('values');
	addToUnscopables('entries');

/***/ },
/* 99 */
/***/ function(module, exports) {

	"use strict";

	module.exports = function () {/* empty */};

/***/ },
/* 100 */
/***/ function(module, exports) {

	"use strict";

	module.exports = function (done, value) {
	  return { value: value, done: !!done };
	};

/***/ },
/* 101 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.f = __webpack_require__(94);

/***/ },
/* 102 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	module.exports = { "default": __webpack_require__(103), __esModule: true };

/***/ },
/* 103 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	__webpack_require__(104);
	__webpack_require__(115);
	__webpack_require__(116);
	__webpack_require__(117);
	module.exports = __webpack_require__(61).Symbol;

/***/ },
/* 104 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	// ECMAScript 6 symbols shim

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

	var global = __webpack_require__(60),
	    has = __webpack_require__(75),
	    DESCRIPTORS = __webpack_require__(69),
	    $export = __webpack_require__(59),
	    redefine = __webpack_require__(74),
	    META = __webpack_require__(105).KEY,
	    $fails = __webpack_require__(70),
	    shared = __webpack_require__(89),
	    setToStringTag = __webpack_require__(93),
	    uid = __webpack_require__(90),
	    wks = __webpack_require__(94),
	    wksExt = __webpack_require__(101),
	    wksDefine = __webpack_require__(106),
	    keyOf = __webpack_require__(107),
	    enumKeys = __webpack_require__(108),
	    isArray = __webpack_require__(111),
	    anObject = __webpack_require__(66),
	    toIObject = __webpack_require__(82),
	    toPrimitive = __webpack_require__(72),
	    createDesc = __webpack_require__(73),
	    _create = __webpack_require__(78),
	    gOPNExt = __webpack_require__(112),
	    $GOPD = __webpack_require__(114),
	    $DP = __webpack_require__(65),
	    $keys = __webpack_require__(80),
	    gOPD = $GOPD.f,
	    dP = $DP.f,
	    gOPN = gOPNExt.f,
	    $Symbol = global.Symbol,
	    $JSON = global.JSON,
	    _stringify = $JSON && $JSON.stringify,
	    PROTOTYPE = 'prototype',
	    HIDDEN = wks('_hidden'),
	    TO_PRIMITIVE = wks('toPrimitive'),
	    isEnum = {}.propertyIsEnumerable,
	    SymbolRegistry = shared('symbol-registry'),
	    AllSymbols = shared('symbols'),
	    OPSymbols = shared('op-symbols'),
	    ObjectProto = Object[PROTOTYPE],
	    USE_NATIVE = typeof $Symbol == 'function',
	    QObject = global.QObject;
	// Don't use setters in Qt Script, https://github.com/zloirock/core-js/issues/173
	var setter = !QObject || !QObject[PROTOTYPE] || !QObject[PROTOTYPE].findChild;

	// fallback for old Android, https://code.google.com/p/v8/issues/detail?id=687
	var setSymbolDesc = DESCRIPTORS && $fails(function () {
	  return _create(dP({}, 'a', {
	    get: function get() {
	      return dP(this, 'a', { value: 7 }).a;
	    }
	  })).a != 7;
	}) ? function (it, key, D) {
	  var protoDesc = gOPD(ObjectProto, key);
	  if (protoDesc) delete ObjectProto[key];
	  dP(it, key, D);
	  if (protoDesc && it !== ObjectProto) dP(ObjectProto, key, protoDesc);
	} : dP;

	var wrap = function wrap(tag) {
	  var sym = AllSymbols[tag] = _create($Symbol[PROTOTYPE]);
	  sym._k = tag;
	  return sym;
	};

	var isSymbol = USE_NATIVE && _typeof($Symbol.iterator) == 'symbol' ? function (it) {
	  return (typeof it === 'undefined' ? 'undefined' : _typeof(it)) == 'symbol';
	} : function (it) {
	  return it instanceof $Symbol;
	};

	var $defineProperty = function defineProperty(it, key, D) {
	  if (it === ObjectProto) $defineProperty(OPSymbols, key, D);
	  anObject(it);
	  key = toPrimitive(key, true);
	  anObject(D);
	  if (has(AllSymbols, key)) {
	    if (!D.enumerable) {
	      if (!has(it, HIDDEN)) dP(it, HIDDEN, createDesc(1, {}));
	      it[HIDDEN][key] = true;
	    } else {
	      if (has(it, HIDDEN) && it[HIDDEN][key]) it[HIDDEN][key] = false;
	      D = _create(D, { enumerable: createDesc(0, false) });
	    }return setSymbolDesc(it, key, D);
	  }return dP(it, key, D);
	};
	var $defineProperties = function defineProperties(it, P) {
	  anObject(it);
	  var keys = enumKeys(P = toIObject(P)),
	      i = 0,
	      l = keys.length,
	      key;
	  while (l > i) {
	    $defineProperty(it, key = keys[i++], P[key]);
	  }return it;
	};
	var $create = function create(it, P) {
	  return P === undefined ? _create(it) : $defineProperties(_create(it), P);
	};
	var $propertyIsEnumerable = function propertyIsEnumerable(key) {
	  var E = isEnum.call(this, key = toPrimitive(key, true));
	  if (this === ObjectProto && has(AllSymbols, key) && !has(OPSymbols, key)) return false;
	  return E || !has(this, key) || !has(AllSymbols, key) || has(this, HIDDEN) && this[HIDDEN][key] ? E : true;
	};
	var $getOwnPropertyDescriptor = function getOwnPropertyDescriptor(it, key) {
	  it = toIObject(it);
	  key = toPrimitive(key, true);
	  if (it === ObjectProto && has(AllSymbols, key) && !has(OPSymbols, key)) return;
	  var D = gOPD(it, key);
	  if (D && has(AllSymbols, key) && !(has(it, HIDDEN) && it[HIDDEN][key])) D.enumerable = true;
	  return D;
	};
	var $getOwnPropertyNames = function getOwnPropertyNames(it) {
	  var names = gOPN(toIObject(it)),
	      result = [],
	      i = 0,
	      key;
	  while (names.length > i) {
	    if (!has(AllSymbols, key = names[i++]) && key != HIDDEN && key != META) result.push(key);
	  }return result;
	};
	var $getOwnPropertySymbols = function getOwnPropertySymbols(it) {
	  var IS_OP = it === ObjectProto,
	      names = gOPN(IS_OP ? OPSymbols : toIObject(it)),
	      result = [],
	      i = 0,
	      key;
	  while (names.length > i) {
	    if (has(AllSymbols, key = names[i++]) && (IS_OP ? has(ObjectProto, key) : true)) result.push(AllSymbols[key]);
	  }return result;
	};

	// 19.4.1.1 Symbol([description])
	if (!USE_NATIVE) {
	  $Symbol = function _Symbol() {
	    if (this instanceof $Symbol) throw TypeError('Symbol is not a constructor!');
	    var tag = uid(arguments.length > 0 ? arguments[0] : undefined);
	    var $set = function $set(value) {
	      if (this === ObjectProto) $set.call(OPSymbols, value);
	      if (has(this, HIDDEN) && has(this[HIDDEN], tag)) this[HIDDEN][tag] = false;
	      setSymbolDesc(this, tag, createDesc(1, value));
	    };
	    if (DESCRIPTORS && setter) setSymbolDesc(ObjectProto, tag, { configurable: true, set: $set });
	    return wrap(tag);
	  };
	  redefine($Symbol[PROTOTYPE], 'toString', function toString() {
	    return this._k;
	  });

	  $GOPD.f = $getOwnPropertyDescriptor;
	  $DP.f = $defineProperty;
	  __webpack_require__(113).f = gOPNExt.f = $getOwnPropertyNames;
	  __webpack_require__(110).f = $propertyIsEnumerable;
	  __webpack_require__(109).f = $getOwnPropertySymbols;

	  if (DESCRIPTORS && !__webpack_require__(58)) {
	    redefine(ObjectProto, 'propertyIsEnumerable', $propertyIsEnumerable, true);
	  }

	  wksExt.f = function (name) {
	    return wrap(wks(name));
	  };
	}

	$export($export.G + $export.W + $export.F * !USE_NATIVE, { Symbol: $Symbol });

	for (var symbols =
	// 19.4.2.2, 19.4.2.3, 19.4.2.4, 19.4.2.6, 19.4.2.8, 19.4.2.9, 19.4.2.10, 19.4.2.11, 19.4.2.12, 19.4.2.13, 19.4.2.14
	'hasInstance,isConcatSpreadable,iterator,match,replace,search,species,split,toPrimitive,toStringTag,unscopables'.split(','), i = 0; symbols.length > i;) {
	  wks(symbols[i++]);
	}for (var symbols = $keys(wks.store), i = 0; symbols.length > i;) {
	  wksDefine(symbols[i++]);
	}$export($export.S + $export.F * !USE_NATIVE, 'Symbol', {
	  // 19.4.2.1 Symbol.for(key)
	  'for': function _for(key) {
	    return has(SymbolRegistry, key += '') ? SymbolRegistry[key] : SymbolRegistry[key] = $Symbol(key);
	  },
	  // 19.4.2.5 Symbol.keyFor(sym)
	  keyFor: function keyFor(key) {
	    if (isSymbol(key)) return keyOf(SymbolRegistry, key);
	    throw TypeError(key + ' is not a symbol!');
	  },
	  useSetter: function useSetter() {
	    setter = true;
	  },
	  useSimple: function useSimple() {
	    setter = false;
	  }
	});

	$export($export.S + $export.F * !USE_NATIVE, 'Object', {
	  // 19.1.2.2 Object.create(O [, Properties])
	  create: $create,
	  // 19.1.2.4 Object.defineProperty(O, P, Attributes)
	  defineProperty: $defineProperty,
	  // 19.1.2.3 Object.defineProperties(O, Properties)
	  defineProperties: $defineProperties,
	  // 19.1.2.6 Object.getOwnPropertyDescriptor(O, P)
	  getOwnPropertyDescriptor: $getOwnPropertyDescriptor,
	  // 19.1.2.7 Object.getOwnPropertyNames(O)
	  getOwnPropertyNames: $getOwnPropertyNames,
	  // 19.1.2.8 Object.getOwnPropertySymbols(O)
	  getOwnPropertySymbols: $getOwnPropertySymbols
	});

	// 24.3.2 JSON.stringify(value [, replacer [, space]])
	$JSON && $export($export.S + $export.F * (!USE_NATIVE || $fails(function () {
	  var S = $Symbol();
	  // MS Edge converts symbol values to JSON as {}
	  // WebKit converts symbol values to JSON as null
	  // V8 throws on boxed symbols
	  return _stringify([S]) != '[null]' || _stringify({ a: S }) != '{}' || _stringify(Object(S)) != '{}';
	})), 'JSON', {
	  stringify: function stringify(it) {
	    if (it === undefined || isSymbol(it)) return; // IE8 returns string on undefined
	    var args = [it],
	        i = 1,
	        replacer,
	        $replacer;
	    while (arguments.length > i) {
	      args.push(arguments[i++]);
	    }replacer = args[1];
	    if (typeof replacer == 'function') $replacer = replacer;
	    if ($replacer || !isArray(replacer)) replacer = function replacer(key, value) {
	      if ($replacer) value = $replacer.call(this, key, value);
	      if (!isSymbol(value)) return value;
	    };
	    args[1] = replacer;
	    return _stringify.apply($JSON, args);
	  }
	});

	// 19.4.3.4 Symbol.prototype[@@toPrimitive](hint)
	$Symbol[PROTOTYPE][TO_PRIMITIVE] || __webpack_require__(64)($Symbol[PROTOTYPE], TO_PRIMITIVE, $Symbol[PROTOTYPE].valueOf);
	// 19.4.3.5 Symbol.prototype[@@toStringTag]
	setToStringTag($Symbol, 'Symbol');
	// 20.2.1.9 Math[@@toStringTag]
	setToStringTag(Math, 'Math', true);
	// 24.3.3 JSON[@@toStringTag]
	setToStringTag(global.JSON, 'JSON', true);

/***/ },
/* 105 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

	var META = __webpack_require__(90)('meta'),
	    isObject = __webpack_require__(67),
	    has = __webpack_require__(75),
	    setDesc = __webpack_require__(65).f,
	    id = 0;
	var isExtensible = Object.isExtensible || function () {
	  return true;
	};
	var FREEZE = !__webpack_require__(70)(function () {
	  return isExtensible(Object.preventExtensions({}));
	});
	var setMeta = function setMeta(it) {
	  setDesc(it, META, { value: {
	      i: 'O' + ++id, // object ID
	      w: {} // weak collections IDs
	    } });
	};
	var fastKey = function fastKey(it, create) {
	  // return primitive with prefix
	  if (!isObject(it)) return (typeof it === 'undefined' ? 'undefined' : _typeof(it)) == 'symbol' ? it : (typeof it == 'string' ? 'S' : 'P') + it;
	  if (!has(it, META)) {
	    // can't set metadata to uncaught frozen object
	    if (!isExtensible(it)) return 'F';
	    // not necessary to add metadata
	    if (!create) return 'E';
	    // add missing metadata
	    setMeta(it);
	    // return object ID
	  }return it[META].i;
	};
	var getWeak = function getWeak(it, create) {
	  if (!has(it, META)) {
	    // can't set metadata to uncaught frozen object
	    if (!isExtensible(it)) return true;
	    // not necessary to add metadata
	    if (!create) return false;
	    // add missing metadata
	    setMeta(it);
	    // return hash weak collections IDs
	  }return it[META].w;
	};
	// add metadata on freeze-family methods calling
	var onFreeze = function onFreeze(it) {
	  if (FREEZE && meta.NEED && isExtensible(it) && !has(it, META)) setMeta(it);
	  return it;
	};
	var meta = module.exports = {
	  KEY: META,
	  NEED: false,
	  fastKey: fastKey,
	  getWeak: getWeak,
	  onFreeze: onFreeze
	};

/***/ },
/* 106 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var global = __webpack_require__(60),
	    core = __webpack_require__(61),
	    LIBRARY = __webpack_require__(58),
	    wksExt = __webpack_require__(101),
	    defineProperty = __webpack_require__(65).f;
	module.exports = function (name) {
	  var $Symbol = core.Symbol || (core.Symbol = LIBRARY ? {} : global.Symbol || {});
	  if (name.charAt(0) != '_' && !(name in $Symbol)) defineProperty($Symbol, name, { value: wksExt.f(name) });
	};

/***/ },
/* 107 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var getKeys = __webpack_require__(80),
	    toIObject = __webpack_require__(82);
	module.exports = function (object, el) {
	  var O = toIObject(object),
	      keys = getKeys(O),
	      length = keys.length,
	      index = 0,
	      key;
	  while (length > index) {
	    if (O[key = keys[index++]] === el) return key;
	  }
	};

/***/ },
/* 108 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	// all enumerable object keys, includes symbols
	var getKeys = __webpack_require__(80),
	    gOPS = __webpack_require__(109),
	    pIE = __webpack_require__(110);
	module.exports = function (it) {
	  var result = getKeys(it),
	      getSymbols = gOPS.f;
	  if (getSymbols) {
	    var symbols = getSymbols(it),
	        isEnum = pIE.f,
	        i = 0,
	        key;
	    while (symbols.length > i) {
	      if (isEnum.call(it, key = symbols[i++])) result.push(key);
	    }
	  }return result;
	};

/***/ },
/* 109 */
/***/ function(module, exports) {

	"use strict";

	exports.f = Object.getOwnPropertySymbols;

/***/ },
/* 110 */
/***/ function(module, exports) {

	"use strict";

	exports.f = {}.propertyIsEnumerable;

/***/ },
/* 111 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	// 7.2.2 IsArray(argument)
	var cof = __webpack_require__(84);
	module.exports = Array.isArray || function isArray(arg) {
	  return cof(arg) == 'Array';
	};

/***/ },
/* 112 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

	// fallback for IE11 buggy Object.getOwnPropertyNames with iframe and window
	var toIObject = __webpack_require__(82),
	    gOPN = __webpack_require__(113).f,
	    toString = {}.toString;

	var windowNames = (typeof window === 'undefined' ? 'undefined' : _typeof(window)) == 'object' && window && Object.getOwnPropertyNames ? Object.getOwnPropertyNames(window) : [];

	var getWindowNames = function getWindowNames(it) {
	  try {
	    return gOPN(it);
	  } catch (e) {
	    return windowNames.slice();
	  }
	};

	module.exports.f = function getOwnPropertyNames(it) {
	  return windowNames && toString.call(it) == '[object Window]' ? getWindowNames(it) : gOPN(toIObject(it));
	};

/***/ },
/* 113 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	// 19.1.2.7 / 15.2.3.4 Object.getOwnPropertyNames(O)
	var $keys = __webpack_require__(81),
	    hiddenKeys = __webpack_require__(91).concat('length', 'prototype');

	exports.f = Object.getOwnPropertyNames || function getOwnPropertyNames(O) {
	  return $keys(O, hiddenKeys);
	};

/***/ },
/* 114 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var pIE = __webpack_require__(110),
	    createDesc = __webpack_require__(73),
	    toIObject = __webpack_require__(82),
	    toPrimitive = __webpack_require__(72),
	    has = __webpack_require__(75),
	    IE8_DOM_DEFINE = __webpack_require__(68),
	    gOPD = Object.getOwnPropertyDescriptor;

	exports.f = __webpack_require__(69) ? gOPD : function getOwnPropertyDescriptor(O, P) {
	  O = toIObject(O);
	  P = toPrimitive(P, true);
	  if (IE8_DOM_DEFINE) try {
	    return gOPD(O, P);
	  } catch (e) {/* empty */}
	  if (has(O, P)) return createDesc(!pIE.f.call(O, P), O[P]);
	};

/***/ },
/* 115 */
/***/ function(module, exports) {

	"use strict";

/***/ },
/* 116 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	__webpack_require__(106)('asyncIterator');

/***/ },
/* 117 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	__webpack_require__(106)('observable');

/***/ },
/* 118 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	exports.__esModule = true;

	var _setPrototypeOf = __webpack_require__(119);

	var _setPrototypeOf2 = _interopRequireDefault(_setPrototypeOf);

	var _create = __webpack_require__(123);

	var _create2 = _interopRequireDefault(_create);

	var _typeof2 = __webpack_require__(50);

	var _typeof3 = _interopRequireDefault(_typeof2);

	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : { "default": obj };
	}

	exports["default"] = function (subClass, superClass) {
	  if (typeof superClass !== "function" && superClass !== null) {
	    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : (0, _typeof3["default"])(superClass)));
	  }

	  subClass.prototype = (0, _create2["default"])(superClass && superClass.prototype, {
	    constructor: {
	      value: subClass,
	      enumerable: false,
	      writable: true,
	      configurable: true
	    }
	  });
	  if (superClass) _setPrototypeOf2["default"] ? (0, _setPrototypeOf2["default"])(subClass, superClass) : subClass.__proto__ = superClass;
	};

/***/ },
/* 119 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	module.exports = { "default": __webpack_require__(120), __esModule: true };

/***/ },
/* 120 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	__webpack_require__(121);
	module.exports = __webpack_require__(61).Object.setPrototypeOf;

/***/ },
/* 121 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	// 19.1.3.19 Object.setPrototypeOf(O, proto)
	var $export = __webpack_require__(59);
	$export($export.S, 'Object', { setPrototypeOf: __webpack_require__(122).set });

/***/ },
/* 122 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	// Works with __proto__ only. Old v8 can't work with null proto objects.
	/* eslint-disable no-proto */
	var isObject = __webpack_require__(67),
	    anObject = __webpack_require__(66);
	var check = function check(O, proto) {
	  anObject(O);
	  if (!isObject(proto) && proto !== null) throw TypeError(proto + ": can't set as prototype!");
	};
	module.exports = {
	  set: Object.setPrototypeOf || ('__proto__' in {} ? // eslint-disable-line
	  function (test, buggy, set) {
	    try {
	      set = __webpack_require__(62)(Function.call, __webpack_require__(114).f(Object.prototype, '__proto__').set, 2);
	      set(test, []);
	      buggy = !(test instanceof Array);
	    } catch (e) {
	      buggy = true;
	    }
	    return function setPrototypeOf(O, proto) {
	      check(O, proto);
	      if (buggy) O.__proto__ = proto;else set(O, proto);
	      return O;
	    };
	  }({}, false) : undefined),
	  check: check
	};

/***/ },
/* 123 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	module.exports = { "default": __webpack_require__(124), __esModule: true };

/***/ },
/* 124 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	__webpack_require__(125);
	var $Object = __webpack_require__(61).Object;
	module.exports = function create(P, D) {
	  return $Object.create(P, D);
	};

/***/ },
/* 125 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var $export = __webpack_require__(59);
	// 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])
	$export($export.S, 'Object', { create: __webpack_require__(78) });

/***/ },
/* 126 */
/***/ function(module, exports) {

	"use strict";

	exports.__esModule = true;

	exports["default"] = function (instance, Constructor) {
	  if (!(instance instanceof Constructor)) {
	    throw new TypeError("Cannot call a class as a function");
	  }
	};

/***/ },
/* 127 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var Observable_1 = __webpack_require__(2);
	var empty_1 = __webpack_require__(128);
	Observable_1.Observable.empty = empty_1.empty;
	//# sourceMappingURL=empty.js.map

/***/ },
/* 128 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var EmptyObservable_1 = __webpack_require__(22);
	exports.empty = EmptyObservable_1.EmptyObservable.create;
	//# sourceMappingURL=empty.js.map

/***/ },
/* 129 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var Observable_1 = __webpack_require__(2);
	var publishReplay_1 = __webpack_require__(130);
	Observable_1.Observable.prototype.publishReplay = publishReplay_1.publishReplay;
	//# sourceMappingURL=publishReplay.js.map

/***/ },
/* 130 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var ReplaySubject_1 = __webpack_require__(131);
	var multicast_1 = __webpack_require__(140);
	/**
	 * @param bufferSize
	 * @param windowTime
	 * @param scheduler
	 * @return {ConnectableObservable<T>}
	 * @method publishReplay
	 * @owner Observable
	 */
	function publishReplay(bufferSize, windowTime, scheduler) {
	  if (bufferSize === void 0) {
	    bufferSize = Number.POSITIVE_INFINITY;
	  }
	  if (windowTime === void 0) {
	    windowTime = Number.POSITIVE_INFINITY;
	  }
	  return multicast_1.multicast.call(this, new ReplaySubject_1.ReplaySubject(bufferSize, windowTime, scheduler));
	}
	exports.publishReplay = publishReplay;
	//# sourceMappingURL=publishReplay.js.map

/***/ },
/* 131 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var Subject_1 = __webpack_require__(132);
	var queue_1 = __webpack_require__(136);
	var observeOn_1 = __webpack_require__(32);
	/**
	 * @class ReplaySubject<T>
	 */
	var ReplaySubject = function (_super) {
	    __extends(ReplaySubject, _super);
	    function ReplaySubject(bufferSize, windowTime, scheduler) {
	        if (bufferSize === void 0) {
	            bufferSize = Number.POSITIVE_INFINITY;
	        }
	        if (windowTime === void 0) {
	            windowTime = Number.POSITIVE_INFINITY;
	        }
	        _super.call(this);
	        this.events = [];
	        this.scheduler = scheduler;
	        this.bufferSize = bufferSize < 1 ? 1 : bufferSize;
	        this._windowTime = windowTime < 1 ? 1 : windowTime;
	    }
	    ReplaySubject.prototype._next = function (value) {
	        var now = this._getNow();
	        this.events.push(new ReplayEvent(now, value));
	        this._trimBufferThenGetEvents(now);
	        _super.prototype._next.call(this, value);
	    };
	    ReplaySubject.prototype._subscribe = function (subscriber) {
	        var events = this._trimBufferThenGetEvents(this._getNow());
	        var scheduler = this.scheduler;
	        if (scheduler) {
	            subscriber.add(subscriber = new observeOn_1.ObserveOnSubscriber(subscriber, scheduler));
	        }
	        var index = -1;
	        var len = events.length;
	        while (++index < len && !subscriber.isUnsubscribed) {
	            subscriber.next(events[index].value);
	        }
	        return _super.prototype._subscribe.call(this, subscriber);
	    };
	    ReplaySubject.prototype._getNow = function () {
	        return (this.scheduler || queue_1.queue).now();
	    };
	    ReplaySubject.prototype._trimBufferThenGetEvents = function (now) {
	        var bufferSize = this.bufferSize;
	        var _windowTime = this._windowTime;
	        var events = this.events;
	        var eventsCount = events.length;
	        var spliceCount = 0;
	        // Trim events that fall out of the time window.
	        // Start at the front of the list. Break early once
	        // we encounter an event that falls within the window.
	        while (spliceCount < eventsCount) {
	            if (now - events[spliceCount].time < _windowTime) {
	                break;
	            }
	            spliceCount += 1;
	        }
	        if (eventsCount > bufferSize) {
	            spliceCount = Math.max(spliceCount, eventsCount - bufferSize);
	        }
	        if (spliceCount > 0) {
	            events.splice(0, spliceCount);
	        }
	        return events;
	    };
	    return ReplaySubject;
	}(Subject_1.Subject);
	exports.ReplaySubject = ReplaySubject;
	var ReplayEvent = function () {
	    function ReplayEvent(time, value) {
	        this.time = time;
	        this.value = value;
	    }
	    return ReplayEvent;
	}();
	//# sourceMappingURL=ReplaySubject.js.map

/***/ },
/* 132 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var Observable_1 = __webpack_require__(2);
	var Subscriber_1 = __webpack_require__(6);
	var Subscription_1 = __webpack_require__(8);
	var SubjectSubscription_1 = __webpack_require__(133);
	var rxSubscriber_1 = __webpack_require__(14);
	var throwError_1 = __webpack_require__(134);
	var ObjectUnsubscribedError_1 = __webpack_require__(135);
	/**
	 * @class Subject<T>
	 */
	var Subject = function (_super) {
	    __extends(Subject, _super);
	    function Subject(destination, source) {
	        _super.call(this);
	        this.destination = destination;
	        this.source = source;
	        this.observers = [];
	        this.isUnsubscribed = false;
	        this.isStopped = false;
	        this.hasErrored = false;
	        this.dispatching = false;
	        this.hasCompleted = false;
	        this.source = source;
	    }
	    Subject.prototype.lift = function (operator) {
	        var subject = new Subject(this.destination || this, this);
	        subject.operator = operator;
	        return subject;
	    };
	    Subject.prototype.add = function (subscription) {
	        return Subscription_1.Subscription.prototype.add.call(this, subscription);
	    };
	    Subject.prototype.remove = function (subscription) {
	        Subscription_1.Subscription.prototype.remove.call(this, subscription);
	    };
	    Subject.prototype.unsubscribe = function () {
	        Subscription_1.Subscription.prototype.unsubscribe.call(this);
	    };
	    Subject.prototype._subscribe = function (subscriber) {
	        if (this.source) {
	            return this.source.subscribe(subscriber);
	        } else {
	            if (subscriber.isUnsubscribed) {
	                return;
	            } else if (this.hasErrored) {
	                return subscriber.error(this.errorValue);
	            } else if (this.hasCompleted) {
	                return subscriber.complete();
	            }
	            this.throwIfUnsubscribed();
	            var subscription = new SubjectSubscription_1.SubjectSubscription(this, subscriber);
	            this.observers.push(subscriber);
	            return subscription;
	        }
	    };
	    Subject.prototype._unsubscribe = function () {
	        this.source = null;
	        this.isStopped = true;
	        this.observers = null;
	        this.destination = null;
	    };
	    Subject.prototype.next = function (value) {
	        this.throwIfUnsubscribed();
	        if (this.isStopped) {
	            return;
	        }
	        this.dispatching = true;
	        this._next(value);
	        this.dispatching = false;
	        if (this.hasErrored) {
	            this._error(this.errorValue);
	        } else if (this.hasCompleted) {
	            this._complete();
	        }
	    };
	    Subject.prototype.error = function (err) {
	        this.throwIfUnsubscribed();
	        if (this.isStopped) {
	            return;
	        }
	        this.isStopped = true;
	        this.hasErrored = true;
	        this.errorValue = err;
	        if (this.dispatching) {
	            return;
	        }
	        this._error(err);
	    };
	    Subject.prototype.complete = function () {
	        this.throwIfUnsubscribed();
	        if (this.isStopped) {
	            return;
	        }
	        this.isStopped = true;
	        this.hasCompleted = true;
	        if (this.dispatching) {
	            return;
	        }
	        this._complete();
	    };
	    Subject.prototype.asObservable = function () {
	        var observable = new SubjectObservable(this);
	        return observable;
	    };
	    Subject.prototype._next = function (value) {
	        if (this.destination) {
	            this.destination.next(value);
	        } else {
	            this._finalNext(value);
	        }
	    };
	    Subject.prototype._finalNext = function (value) {
	        var index = -1;
	        var observers = this.observers.slice(0);
	        var len = observers.length;
	        while (++index < len) {
	            observers[index].next(value);
	        }
	    };
	    Subject.prototype._error = function (err) {
	        if (this.destination) {
	            this.destination.error(err);
	        } else {
	            this._finalError(err);
	        }
	    };
	    Subject.prototype._finalError = function (err) {
	        var index = -1;
	        var observers = this.observers;
	        // optimization to block our SubjectSubscriptions from
	        // splicing themselves out of the observers list one by one.
	        this.observers = null;
	        this.isUnsubscribed = true;
	        if (observers) {
	            var len = observers.length;
	            while (++index < len) {
	                observers[index].error(err);
	            }
	        }
	        this.isUnsubscribed = false;
	        this.unsubscribe();
	    };
	    Subject.prototype._complete = function () {
	        if (this.destination) {
	            this.destination.complete();
	        } else {
	            this._finalComplete();
	        }
	    };
	    Subject.prototype._finalComplete = function () {
	        var index = -1;
	        var observers = this.observers;
	        // optimization to block our SubjectSubscriptions from
	        // splicing themselves out of the observers list one by one.
	        this.observers = null;
	        this.isUnsubscribed = true;
	        if (observers) {
	            var len = observers.length;
	            while (++index < len) {
	                observers[index].complete();
	            }
	        }
	        this.isUnsubscribed = false;
	        this.unsubscribe();
	    };
	    Subject.prototype.throwIfUnsubscribed = function () {
	        if (this.isUnsubscribed) {
	            throwError_1.throwError(new ObjectUnsubscribedError_1.ObjectUnsubscribedError());
	        }
	    };
	    Subject.prototype[rxSubscriber_1.$$rxSubscriber] = function () {
	        return new Subscriber_1.Subscriber(this);
	    };
	    Subject.create = function (destination, source) {
	        return new Subject(destination, source);
	    };
	    return Subject;
	}(Observable_1.Observable);
	exports.Subject = Subject;
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @ignore
	 * @extends {Ignored}
	 */
	var SubjectObservable = function (_super) {
	    __extends(SubjectObservable, _super);
	    function SubjectObservable(source) {
	        _super.call(this);
	        this.source = source;
	    }
	    return SubjectObservable;
	}(Observable_1.Observable);
	//# sourceMappingURL=Subject.js.map

/***/ },
/* 133 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var Subscription_1 = __webpack_require__(8);
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @ignore
	 * @extends {Ignored}
	 */
	var SubjectSubscription = function (_super) {
	    __extends(SubjectSubscription, _super);
	    function SubjectSubscription(subject, observer) {
	        _super.call(this);
	        this.subject = subject;
	        this.observer = observer;
	        this.isUnsubscribed = false;
	    }
	    SubjectSubscription.prototype.unsubscribe = function () {
	        if (this.isUnsubscribed) {
	            return;
	        }
	        this.isUnsubscribed = true;
	        var subject = this.subject;
	        var observers = subject.observers;
	        this.subject = null;
	        if (!observers || observers.length === 0 || subject.isUnsubscribed) {
	            return;
	        }
	        var subscriberIndex = observers.indexOf(this.observer);
	        if (subscriberIndex !== -1) {
	            observers.splice(subscriberIndex, 1);
	        }
	    };
	    return SubjectSubscription;
	}(Subscription_1.Subscription);
	exports.SubjectSubscription = SubjectSubscription;
	//# sourceMappingURL=SubjectSubscription.js.map

/***/ },
/* 134 */
/***/ function(module, exports) {

	"use strict";

	function throwError(e) {
	  throw e;
	}
	exports.throwError = throwError;
	//# sourceMappingURL=throwError.js.map

/***/ },
/* 135 */
/***/ function(module, exports) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	/**
	 * An error thrown when an action is invalid because the object has been
	 * unsubscribed.
	 *
	 * @see {@link Subject}
	 * @see {@link BehaviorSubject}
	 *
	 * @class ObjectUnsubscribedError
	 */
	var ObjectUnsubscribedError = function (_super) {
	    __extends(ObjectUnsubscribedError, _super);
	    function ObjectUnsubscribedError() {
	        _super.call(this, 'object unsubscribed');
	        this.name = 'ObjectUnsubscribedError';
	    }
	    return ObjectUnsubscribedError;
	}(Error);
	exports.ObjectUnsubscribedError = ObjectUnsubscribedError;
	//# sourceMappingURL=ObjectUnsubscribedError.js.map

/***/ },
/* 136 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var QueueScheduler_1 = __webpack_require__(137);
	exports.queue = new QueueScheduler_1.QueueScheduler();
	//# sourceMappingURL=queue.js.map

/***/ },
/* 137 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var QueueAction_1 = __webpack_require__(138);
	var FutureAction_1 = __webpack_require__(139);
	var QueueScheduler = function () {
	    function QueueScheduler() {
	        this.active = false;
	        this.actions = []; // XXX: use `any` to remove type param `T` from `VirtualTimeScheduler`.
	        this.scheduledId = null;
	    }
	    QueueScheduler.prototype.now = function () {
	        return Date.now();
	    };
	    QueueScheduler.prototype.flush = function () {
	        if (this.active || this.scheduledId) {
	            return;
	        }
	        this.active = true;
	        var actions = this.actions;
	        // XXX: use `any` to remove type param `T` from `VirtualTimeScheduler`.
	        for (var action = null; action = actions.shift();) {
	            action.execute();
	            if (action.error) {
	                this.active = false;
	                throw action.error;
	            }
	        }
	        this.active = false;
	    };
	    QueueScheduler.prototype.schedule = function (work, delay, state) {
	        if (delay === void 0) {
	            delay = 0;
	        }
	        return delay <= 0 ? this.scheduleNow(work, state) : this.scheduleLater(work, delay, state);
	    };
	    QueueScheduler.prototype.scheduleNow = function (work, state) {
	        return new QueueAction_1.QueueAction(this, work).schedule(state);
	    };
	    QueueScheduler.prototype.scheduleLater = function (work, delay, state) {
	        return new FutureAction_1.FutureAction(this, work).schedule(state, delay);
	    };
	    return QueueScheduler;
	}();
	exports.QueueScheduler = QueueScheduler;
	//# sourceMappingURL=QueueScheduler.js.map

/***/ },
/* 138 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var FutureAction_1 = __webpack_require__(139);
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @ignore
	 * @extends {Ignored}
	 */
	var QueueAction = function (_super) {
	    __extends(QueueAction, _super);
	    function QueueAction() {
	        _super.apply(this, arguments);
	    }
	    QueueAction.prototype._schedule = function (state, delay) {
	        if (delay === void 0) {
	            delay = 0;
	        }
	        if (delay > 0) {
	            return _super.prototype._schedule.call(this, state, delay);
	        }
	        this.delay = delay;
	        this.state = state;
	        var scheduler = this.scheduler;
	        scheduler.actions.push(this);
	        scheduler.flush();
	        return this;
	    };
	    return QueueAction;
	}(FutureAction_1.FutureAction);
	exports.QueueAction = QueueAction;
	//# sourceMappingURL=QueueAction.js.map

/***/ },
/* 139 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var root_1 = __webpack_require__(3);
	var Subscription_1 = __webpack_require__(8);
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @ignore
	 * @extends {Ignored}
	 */
	var FutureAction = function (_super) {
	    __extends(FutureAction, _super);
	    function FutureAction(scheduler, work) {
	        _super.call(this);
	        this.scheduler = scheduler;
	        this.work = work;
	        this.pending = false;
	    }
	    FutureAction.prototype.execute = function () {
	        if (this.isUnsubscribed) {
	            this.error = new Error('executing a cancelled action');
	        } else {
	            try {
	                this.work(this.state);
	            } catch (e) {
	                this.unsubscribe();
	                this.error = e;
	            }
	        }
	    };
	    FutureAction.prototype.schedule = function (state, delay) {
	        if (delay === void 0) {
	            delay = 0;
	        }
	        if (this.isUnsubscribed) {
	            return this;
	        }
	        return this._schedule(state, delay);
	    };
	    FutureAction.prototype._schedule = function (state, delay) {
	        var _this = this;
	        if (delay === void 0) {
	            delay = 0;
	        }
	        // Always replace the current state with the new state.
	        this.state = state;
	        // Set the pending flag indicating that this action has been scheduled, or
	        // has recursively rescheduled itself.
	        this.pending = true;
	        var id = this.id;
	        // If this action has an intervalID and the specified delay matches the
	        // delay we used to create the intervalID, don't call `setInterval` again.
	        if (id != null && this.delay === delay) {
	            return this;
	        }
	        this.delay = delay;
	        // If this action has an intervalID, but was rescheduled with a different
	        // `delay` time, cancel the current intervalID and call `setInterval` with
	        // the new `delay` time.
	        if (id != null) {
	            this.id = null;
	            root_1.root.clearInterval(id);
	        }
	        //
	        // Important implementation note:
	        //
	        // By default, FutureAction only executes once. However, Actions have the
	        // ability to be rescheduled from within the scheduled callback (mimicking
	        // recursion for asynchronous methods). This allows us to implement single
	        // and repeated actions with the same code path without adding API surface
	        // area, and implement tail-call optimization over asynchronous boundaries.
	        //
	        // However, JS runtimes make a distinction between intervals scheduled by
	        // repeatedly calling `setTimeout` vs. a single `setInterval` call, with
	        // the latter providing a better guarantee of precision.
	        //
	        // In order to accommodate both single and repeatedly rescheduled actions,
	        // use `setInterval` here for both cases. By default, the interval will be
	        // canceled after its first execution, or if the action schedules itself to
	        // run again with a different `delay` time.
	        //
	        // If the action recursively schedules itself to run again with the same
	        // `delay` time, the interval is not canceled, but allowed to loop again.
	        // The check of whether the interval should be canceled or not is run every
	        // time the interval is executed. The first time an action fails to
	        // reschedule itself, the interval is canceled.
	        //
	        this.id = root_1.root.setInterval(function () {
	            _this.pending = false;
	            var _a = _this,
	                id = _a.id,
	                scheduler = _a.scheduler;
	            scheduler.actions.push(_this);
	            scheduler.flush();
	            //
	            // Terminate this interval if the action didn't reschedule itself.
	            // Don't call `this.unsubscribe()` here, because the action could be
	            // rescheduled later. For example:
	            //
	            // ```
	            // scheduler.schedule(function doWork(counter) {
	            //   /* ... I'm a busy worker bee ... */
	            //   var originalAction = this;
	            //   /* wait 100ms before rescheduling this action again */
	            //   setTimeout(function () {
	            //     originalAction.schedule(counter + 1);
	            //   }, 100);
	            // }, 1000);
	            // ```
	            if (_this.pending === false && id != null) {
	                _this.id = null;
	                root_1.root.clearInterval(id);
	            }
	        }, delay);
	        return this;
	    };
	    FutureAction.prototype._unsubscribe = function () {
	        this.pending = false;
	        var _a = this,
	            id = _a.id,
	            scheduler = _a.scheduler;
	        var actions = scheduler.actions;
	        var index = actions.indexOf(this);
	        if (id != null) {
	            this.id = null;
	            root_1.root.clearInterval(id);
	        }
	        if (index !== -1) {
	            actions.splice(index, 1);
	        }
	        this.work = null;
	        this.state = null;
	        this.scheduler = null;
	    };
	    return FutureAction;
	}(Subscription_1.Subscription);
	exports.FutureAction = FutureAction;
	//# sourceMappingURL=FutureAction.js.map

/***/ },
/* 140 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var ConnectableObservable_1 = __webpack_require__(141);
	/**
	 * Returns an Observable that emits the results of invoking a specified selector on items
	 * emitted by a ConnectableObservable that shares a single subscription to the underlying stream.
	 *
	 * <img src="./img/multicast.png" width="100%">
	 *
	 * @param {Function} selector - a function that can use the multicasted source stream
	 * as many times as needed, without causing multiple subscriptions to the source stream.
	 * Subscribers to the given source will receive all notifications of the source from the
	 * time of the subscription forward.
	 * @return {Observable} an Observable that emits the results of invoking the selector
	 * on the items emitted by a `ConnectableObservable` that shares a single subscription to
	 * the underlying stream.
	 * @method multicast
	 * @owner Observable
	 */
	function multicast(subjectOrSubjectFactory) {
	    var subjectFactory;
	    if (typeof subjectOrSubjectFactory === 'function') {
	        subjectFactory = subjectOrSubjectFactory;
	    } else {
	        subjectFactory = function subjectFactory() {
	            return subjectOrSubjectFactory;
	        };
	    }
	    return new ConnectableObservable_1.ConnectableObservable(this, subjectFactory);
	}
	exports.multicast = multicast;
	//# sourceMappingURL=multicast.js.map

/***/ },
/* 141 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var Observable_1 = __webpack_require__(2);
	var Subscriber_1 = __webpack_require__(6);
	var Subscription_1 = __webpack_require__(8);
	/**
	 * @class ConnectableObservable<T>
	 */
	var ConnectableObservable = function (_super) {
	    __extends(ConnectableObservable, _super);
	    function ConnectableObservable(source, subjectFactory) {
	        _super.call(this);
	        this.source = source;
	        this.subjectFactory = subjectFactory;
	    }
	    ConnectableObservable.prototype._subscribe = function (subscriber) {
	        return this.getSubject().subscribe(subscriber);
	    };
	    ConnectableObservable.prototype.getSubject = function () {
	        var subject = this.subject;
	        if (subject && !subject.isUnsubscribed) {
	            return subject;
	        }
	        return this.subject = this.subjectFactory();
	    };
	    ConnectableObservable.prototype.connect = function () {
	        var source = this.source;
	        var subscription = this.subscription;
	        if (subscription && !subscription.isUnsubscribed) {
	            return subscription;
	        }
	        subscription = source.subscribe(this.getSubject());
	        subscription.add(new ConnectableSubscription(this));
	        return this.subscription = subscription;
	    };
	    ConnectableObservable.prototype.refCount = function () {
	        return new RefCountObservable(this);
	    };
	    /**
	     * This method is opened for `ConnectableSubscription`.
	     * Not to call from others.
	     */
	    ConnectableObservable.prototype._closeSubscription = function () {
	        this.subject = null;
	        this.subscription = null;
	    };
	    return ConnectableObservable;
	}(Observable_1.Observable);
	exports.ConnectableObservable = ConnectableObservable;
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @ignore
	 * @extends {Ignored}
	 */
	var ConnectableSubscription = function (_super) {
	    __extends(ConnectableSubscription, _super);
	    function ConnectableSubscription(connectable) {
	        _super.call(this);
	        this.connectable = connectable;
	    }
	    ConnectableSubscription.prototype._unsubscribe = function () {
	        var connectable = this.connectable;
	        connectable._closeSubscription();
	        this.connectable = null;
	    };
	    return ConnectableSubscription;
	}(Subscription_1.Subscription);
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @ignore
	 * @extends {Ignored}
	 */
	var RefCountObservable = function (_super) {
	    __extends(RefCountObservable, _super);
	    function RefCountObservable(connectable, refCount) {
	        if (refCount === void 0) {
	            refCount = 0;
	        }
	        _super.call(this);
	        this.connectable = connectable;
	        this.refCount = refCount;
	    }
	    RefCountObservable.prototype._subscribe = function (subscriber) {
	        var connectable = this.connectable;
	        var refCountSubscriber = new RefCountSubscriber(subscriber, this);
	        var subscription = connectable.subscribe(refCountSubscriber);
	        if (!subscription.isUnsubscribed && ++this.refCount === 1) {
	            refCountSubscriber.connection = this.connection = connectable.connect();
	        }
	        return subscription;
	    };
	    return RefCountObservable;
	}(Observable_1.Observable);
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @ignore
	 * @extends {Ignored}
	 */
	var RefCountSubscriber = function (_super) {
	    __extends(RefCountSubscriber, _super);
	    function RefCountSubscriber(destination, refCountObservable) {
	        _super.call(this, null);
	        this.destination = destination;
	        this.refCountObservable = refCountObservable;
	        this.connection = refCountObservable.connection;
	        destination.add(this);
	    }
	    RefCountSubscriber.prototype._next = function (value) {
	        this.destination.next(value);
	    };
	    RefCountSubscriber.prototype._error = function (err) {
	        this._resetConnectable();
	        this.destination.error(err);
	    };
	    RefCountSubscriber.prototype._complete = function () {
	        this._resetConnectable();
	        this.destination.complete();
	    };
	    RefCountSubscriber.prototype._resetConnectable = function () {
	        var observable = this.refCountObservable;
	        var obsConnection = observable.connection;
	        var subConnection = this.connection;
	        if (subConnection && subConnection === obsConnection) {
	            observable.refCount = 0;
	            obsConnection.unsubscribe();
	            observable.connection = null;
	            this.unsubscribe();
	        }
	    };
	    RefCountSubscriber.prototype._unsubscribe = function () {
	        var observable = this.refCountObservable;
	        if (observable.refCount === 0) {
	            return;
	        }
	        if (--observable.refCount === 0) {
	            var obsConnection = observable.connection;
	            var subConnection = this.connection;
	            if (subConnection && subConnection === obsConnection) {
	                obsConnection.unsubscribe();
	                observable.connection = null;
	            }
	        }
	    };
	    return RefCountSubscriber;
	}(Subscriber_1.Subscriber);
	//# sourceMappingURL=ConnectableObservable.js.map

/***/ },
/* 142 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var Observable_1 = __webpack_require__(2);
	var scan_1 = __webpack_require__(143);
	Observable_1.Observable.prototype.scan = scan_1.scan;
	//# sourceMappingURL=scan.js.map

/***/ },
/* 143 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var Subscriber_1 = __webpack_require__(6);
	/**
	 * Applies an accumulation function over the source Observable, and returns each
	 * intermediate result, with an optional seed value.
	 *
	 * <span class="informal">It's like {@link reduce}, but emits the current
	 * accumulation whenever the source emits a value.</span>
	 *
	 * <img src="./img/scan.png" width="100%">
	 *
	 * Combines together all values emitted on the source, using an accumulator
	 * function that knows how to join a new source value into the accumulation from
	 * the past. Is similar to {@link reduce}, but emits the intermediate
	 * accumulations.
	 *
	 * Returns an Observable that applies a specified `accumulator` function to each
	 * item emitted by the source Observable. If a `seed` value is specified, then
	 * that value will be used as the initial value for the accumulator. If no seed
	 * value is specified, the first item of the source is used as the seed.
	 *
	 * @example <caption>Count the number of click events</caption>
	 * var clicks = Rx.Observable.fromEvent(document, 'click');
	 * var ones = clicks.mapTo(1);
	 * var seed = 0;
	 * var count = ones.scan((acc, one) => acc + one, seed);
	 * count.subscribe(x => console.log(x));
	 *
	 * @see {@link expand}
	 * @see {@link mergeScan}
	 * @see {@link reduce}
	 *
	 * @param {function(acc: R, value: T, index: number): R} accumulator
	 * The accumulator function called on each source value.
	 * @param {T|R} [seed] The initial accumulation value.
	 * @return {Observable<R>} An observable of the accumulated values.
	 * @method scan
	 * @owner Observable
	 */
	function scan(accumulator, seed) {
	    return this.lift(new ScanOperator(accumulator, seed));
	}
	exports.scan = scan;
	var ScanOperator = function () {
	    function ScanOperator(accumulator, seed) {
	        this.accumulator = accumulator;
	        this.seed = seed;
	    }
	    ScanOperator.prototype.call = function (subscriber, source) {
	        return source._subscribe(new ScanSubscriber(subscriber, this.accumulator, this.seed));
	    };
	    return ScanOperator;
	}();
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @ignore
	 * @extends {Ignored}
	 */
	var ScanSubscriber = function (_super) {
	    __extends(ScanSubscriber, _super);
	    function ScanSubscriber(destination, accumulator, seed) {
	        _super.call(this, destination);
	        this.accumulator = accumulator;
	        this.index = 0;
	        this.accumulatorSet = false;
	        this.seed = seed;
	        this.accumulatorSet = typeof seed !== 'undefined';
	    }
	    Object.defineProperty(ScanSubscriber.prototype, "seed", {
	        get: function get() {
	            return this._seed;
	        },
	        set: function set(value) {
	            this.accumulatorSet = true;
	            this._seed = value;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    ScanSubscriber.prototype._next = function (value) {
	        if (!this.accumulatorSet) {
	            this.seed = value;
	            this.destination.next(value);
	        } else {
	            return this._tryNext(value);
	        }
	    };
	    ScanSubscriber.prototype._tryNext = function (value) {
	        var index = this.index++;
	        var result;
	        try {
	            result = this.accumulator(this.seed, value, index);
	        } catch (err) {
	            this.destination.error(err);
	        }
	        this.seed = result;
	        this.destination.next(result);
	    };
	    return ScanSubscriber;
	}(Subscriber_1.Subscriber);
	//# sourceMappingURL=scan.js.map

/***/ },
/* 144 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var Observable_1 = __webpack_require__(2);
	var toArray_1 = __webpack_require__(145);
	Observable_1.Observable.prototype.toArray = toArray_1.toArray;
	//# sourceMappingURL=toArray.js.map

/***/ },
/* 145 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var Subscriber_1 = __webpack_require__(6);
	/**
	 * @return {Observable<any[]>|WebSocketSubject<T>|Observable<T>}
	 * @method toArray
	 * @owner Observable
	 */
	function toArray() {
	    return this.lift(new ToArrayOperator());
	}
	exports.toArray = toArray;
	var ToArrayOperator = function () {
	    function ToArrayOperator() {}
	    ToArrayOperator.prototype.call = function (subscriber, source) {
	        return source._subscribe(new ToArraySubscriber(subscriber));
	    };
	    return ToArrayOperator;
	}();
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @ignore
	 * @extends {Ignored}
	 */
	var ToArraySubscriber = function (_super) {
	    __extends(ToArraySubscriber, _super);
	    function ToArraySubscriber(destination) {
	        _super.call(this, destination);
	        this.array = [];
	    }
	    ToArraySubscriber.prototype._next = function (x) {
	        this.array.push(x);
	    };
	    ToArraySubscriber.prototype._complete = function () {
	        this.destination.next(this.array);
	        this.destination.complete();
	    };
	    return ToArraySubscriber;
	}(Subscriber_1.Subscriber);
	//# sourceMappingURL=toArray.js.map

/***/ },
/* 146 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var Observable_1 = __webpack_require__(2);
	var take_1 = __webpack_require__(147);
	Observable_1.Observable.prototype.take = take_1.take;
	//# sourceMappingURL=take.js.map

/***/ },
/* 147 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var Subscriber_1 = __webpack_require__(6);
	var ArgumentOutOfRangeError_1 = __webpack_require__(148);
	var EmptyObservable_1 = __webpack_require__(22);
	/**
	 * Emits only the first `count` values emitted by the source Observable.
	 *
	 * <span class="informal">Takes the first `count` values from the source, then
	 * completes.</span>
	 *
	 * <img src="./img/take.png" width="100%">
	 *
	 * `take` returns an Observable that emits only the first `count` values emitted
	 * by the source Observable. If the source emits fewer than `count` values then
	 * all of its values are emitted. After that, it completes, regardless if the
	 * source completes.
	 *
	 * @example <caption>Take the first 5 seconds of an infinite 1-second interval Observable</caption>
	 * var interval = Rx.Observable.interval(1000);
	 * var five = interval.take(5);
	 * five.subscribe(x => console.log(x));
	 *
	 * @see {@link takeLast}
	 * @see {@link takeUntil}
	 * @see {@link takeWhile}
	 * @see {@link skip}
	 *
	 * @throws {ArgumentOutOfRangeError} When using `take(i)`, it delivers an
	 * ArgumentOutOrRangeError to the Observer's `error` callback if `i < 0`.
	 *
	 * @param {number} count The maximum number of `next` values to emit.
	 * @return {Observable<T>} An Observable that emits only the first `count`
	 * values emitted by the source Observable, or all of the values from the source
	 * if the source emits fewer than `count` values.
	 * @method take
	 * @owner Observable
	 */
	function take(count) {
	    if (count === 0) {
	        return new EmptyObservable_1.EmptyObservable();
	    } else {
	        return this.lift(new TakeOperator(count));
	    }
	}
	exports.take = take;
	var TakeOperator = function () {
	    function TakeOperator(total) {
	        this.total = total;
	        if (this.total < 0) {
	            throw new ArgumentOutOfRangeError_1.ArgumentOutOfRangeError();
	        }
	    }
	    TakeOperator.prototype.call = function (subscriber, source) {
	        return source._subscribe(new TakeSubscriber(subscriber, this.total));
	    };
	    return TakeOperator;
	}();
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @ignore
	 * @extends {Ignored}
	 */
	var TakeSubscriber = function (_super) {
	    __extends(TakeSubscriber, _super);
	    function TakeSubscriber(destination, total) {
	        _super.call(this, destination);
	        this.total = total;
	        this.count = 0;
	    }
	    TakeSubscriber.prototype._next = function (value) {
	        var total = this.total;
	        if (++this.count <= total) {
	            this.destination.next(value);
	            if (this.count === total) {
	                this.destination.complete();
	                this.unsubscribe();
	            }
	        }
	    };
	    return TakeSubscriber;
	}(Subscriber_1.Subscriber);
	//# sourceMappingURL=take.js.map

/***/ },
/* 148 */
/***/ function(module, exports) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	/**
	 * An error thrown when an element was queried at a certain index of an
	 * Observable, but no such index or position exists in that sequence.
	 *
	 * @see {@link elementAt}
	 * @see {@link take}
	 * @see {@link takeLast}
	 *
	 * @class ArgumentOutOfRangeError
	 */
	var ArgumentOutOfRangeError = function (_super) {
	    __extends(ArgumentOutOfRangeError, _super);
	    function ArgumentOutOfRangeError() {
	        _super.call(this, 'argument out of range');
	        this.name = 'ArgumentOutOfRangeError';
	    }
	    return ArgumentOutOfRangeError;
	}(Error);
	exports.ArgumentOutOfRangeError = ArgumentOutOfRangeError;
	//# sourceMappingURL=ArgumentOutOfRangeError.js.map

/***/ },
/* 149 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var sentenceCase = __webpack_require__(150);

	/**
	 * Snake case a string.
	 *
	 * @param  {String} str
	 * @param  {String} [locale]
	 * @return {String}
	 */
	module.exports = function (str, locale) {
	  return sentenceCase(str, locale, '_');
	};

/***/ },
/* 150 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var lowerCase = __webpack_require__(151);

	var NON_WORD_REGEXP = __webpack_require__(152);
	var CAMEL_CASE_REGEXP = __webpack_require__(153);
	var TRAILING_DIGIT_REGEXP = __webpack_require__(154);

	/**
	 * Sentence case a string.
	 *
	 * @param  {String} str
	 * @param  {String} locale
	 * @param  {String} replacement
	 * @return {String}
	 */
	module.exports = function (str, locale, replacement) {
	  if (str == null) {
	    return '';
	  }

	  replacement = replacement || ' ';

	  function replace(match, index, string) {
	    if (index === 0 || index === string.length - match.length) {
	      return '';
	    }

	    return replacement;
	  }

	  str = String(str)
	  // Support camel case ("camelCase" -> "camel Case").
	  .replace(CAMEL_CASE_REGEXP, '$1 $2')
	  // Support digit groups ("test2012" -> "test 2012").
	  .replace(TRAILING_DIGIT_REGEXP, '$1 $2')
	  // Remove all non-word characters and replace with a single space.
	  .replace(NON_WORD_REGEXP, replace);

	  // Lower case the entire string.
	  return lowerCase(str, locale);
	};

/***/ },
/* 151 */
/***/ function(module, exports) {

	'use strict';

	/**
	 * Special language-specific overrides.
	 *
	 * Source: ftp://ftp.unicode.org/Public/UCD/latest/ucd/SpecialCasing.txt
	 *
	 * @type {Object}
	 */
	var LANGUAGES = {
	  tr: {
	    regexp: /\u0130|\u0049|\u0049\u0307/g,
	    map: {
	      'İ': 'i',
	      'I': 'ı',
	      'İ': 'i'
	    }
	  },
	  az: {
	    regexp: /[\u0130]/g,
	    map: {
	      'İ': 'i',
	      'I': 'ı',
	      'İ': 'i'
	    }
	  },
	  lt: {
	    regexp: /[\u0049\u004A\u012E\u00CC\u00CD\u0128]/g,
	    map: {
	      'I': 'i̇',
	      'J': 'j̇',
	      'Į': 'į̇',
	      'Ì': 'i̇̀',
	      'Í': 'i̇́',
	      'Ĩ': 'i̇̃'
	    }
	  }
	};

	/**
	 * Lowercase a string.
	 *
	 * @param  {String} str
	 * @return {String}
	 */
	module.exports = function (str, locale) {
	  var lang = LANGUAGES[locale];

	  str = str == null ? '' : String(str);

	  if (lang) {
	    str = str.replace(lang.regexp, function (m) {
	      return lang.map[m];
	    });
	  }

	  return str.toLowerCase();
	};

/***/ },
/* 152 */
/***/ function(module, exports) {

	"use strict";

	module.exports = /[^\u0041-\u005A\u0061-\u007A\u00AA\u00B5\u00BA\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0\u08A2-\u08AC\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097F\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191C\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2183\u2184\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005\u3006\u3031-\u3035\u303B\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA697\uA6A0-\uA6E5\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA80-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC\u0030-\u0039\u00B2\u00B3\u00B9\u00BC-\u00BE\u0660-\u0669\u06F0-\u06F9\u07C0-\u07C9\u0966-\u096F\u09E6-\u09EF\u09F4-\u09F9\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0B72-\u0B77\u0BE6-\u0BF2\u0C66-\u0C6F\u0C78-\u0C7E\u0CE6-\u0CEF\u0D66-\u0D75\u0E50-\u0E59\u0ED0-\u0ED9\u0F20-\u0F33\u1040-\u1049\u1090-\u1099\u1369-\u137C\u16EE-\u16F0\u17E0-\u17E9\u17F0-\u17F9\u1810-\u1819\u1946-\u194F\u19D0-\u19DA\u1A80-\u1A89\u1A90-\u1A99\u1B50-\u1B59\u1BB0-\u1BB9\u1C40-\u1C49\u1C50-\u1C59\u2070\u2074-\u2079\u2080-\u2089\u2150-\u2182\u2185-\u2189\u2460-\u249B\u24EA-\u24FF\u2776-\u2793\u2CFD\u3007\u3021-\u3029\u3038-\u303A\u3192-\u3195\u3220-\u3229\u3248-\u324F\u3251-\u325F\u3280-\u3289\u32B1-\u32BF\uA620-\uA629\uA6E6-\uA6EF\uA830-\uA835\uA8D0-\uA8D9\uA900-\uA909\uA9D0-\uA9D9\uAA50-\uAA59\uABF0-\uABF9\uFF10-\uFF19]+/g;

/***/ },
/* 153 */
/***/ function(module, exports) {

	"use strict";

	module.exports = /([\u0061-\u007A\u00B5\u00DF-\u00F6\u00F8-\u00FF\u0101\u0103\u0105\u0107\u0109\u010B\u010D\u010F\u0111\u0113\u0115\u0117\u0119\u011B\u011D\u011F\u0121\u0123\u0125\u0127\u0129\u012B\u012D\u012F\u0131\u0133\u0135\u0137\u0138\u013A\u013C\u013E\u0140\u0142\u0144\u0146\u0148\u0149\u014B\u014D\u014F\u0151\u0153\u0155\u0157\u0159\u015B\u015D\u015F\u0161\u0163\u0165\u0167\u0169\u016B\u016D\u016F\u0171\u0173\u0175\u0177\u017A\u017C\u017E-\u0180\u0183\u0185\u0188\u018C\u018D\u0192\u0195\u0199-\u019B\u019E\u01A1\u01A3\u01A5\u01A8\u01AA\u01AB\u01AD\u01B0\u01B4\u01B6\u01B9\u01BA\u01BD-\u01BF\u01C6\u01C9\u01CC\u01CE\u01D0\u01D2\u01D4\u01D6\u01D8\u01DA\u01DC\u01DD\u01DF\u01E1\u01E3\u01E5\u01E7\u01E9\u01EB\u01ED\u01EF\u01F0\u01F3\u01F5\u01F9\u01FB\u01FD\u01FF\u0201\u0203\u0205\u0207\u0209\u020B\u020D\u020F\u0211\u0213\u0215\u0217\u0219\u021B\u021D\u021F\u0221\u0223\u0225\u0227\u0229\u022B\u022D\u022F\u0231\u0233-\u0239\u023C\u023F\u0240\u0242\u0247\u0249\u024B\u024D\u024F-\u0293\u0295-\u02AF\u0371\u0373\u0377\u037B-\u037D\u0390\u03AC-\u03CE\u03D0\u03D1\u03D5-\u03D7\u03D9\u03DB\u03DD\u03DF\u03E1\u03E3\u03E5\u03E7\u03E9\u03EB\u03ED\u03EF-\u03F3\u03F5\u03F8\u03FB\u03FC\u0430-\u045F\u0461\u0463\u0465\u0467\u0469\u046B\u046D\u046F\u0471\u0473\u0475\u0477\u0479\u047B\u047D\u047F\u0481\u048B\u048D\u048F\u0491\u0493\u0495\u0497\u0499\u049B\u049D\u049F\u04A1\u04A3\u04A5\u04A7\u04A9\u04AB\u04AD\u04AF\u04B1\u04B3\u04B5\u04B7\u04B9\u04BB\u04BD\u04BF\u04C2\u04C4\u04C6\u04C8\u04CA\u04CC\u04CE\u04CF\u04D1\u04D3\u04D5\u04D7\u04D9\u04DB\u04DD\u04DF\u04E1\u04E3\u04E5\u04E7\u04E9\u04EB\u04ED\u04EF\u04F1\u04F3\u04F5\u04F7\u04F9\u04FB\u04FD\u04FF\u0501\u0503\u0505\u0507\u0509\u050B\u050D\u050F\u0511\u0513\u0515\u0517\u0519\u051B\u051D\u051F\u0521\u0523\u0525\u0527\u0561-\u0587\u1D00-\u1D2B\u1D6B-\u1D77\u1D79-\u1D9A\u1E01\u1E03\u1E05\u1E07\u1E09\u1E0B\u1E0D\u1E0F\u1E11\u1E13\u1E15\u1E17\u1E19\u1E1B\u1E1D\u1E1F\u1E21\u1E23\u1E25\u1E27\u1E29\u1E2B\u1E2D\u1E2F\u1E31\u1E33\u1E35\u1E37\u1E39\u1E3B\u1E3D\u1E3F\u1E41\u1E43\u1E45\u1E47\u1E49\u1E4B\u1E4D\u1E4F\u1E51\u1E53\u1E55\u1E57\u1E59\u1E5B\u1E5D\u1E5F\u1E61\u1E63\u1E65\u1E67\u1E69\u1E6B\u1E6D\u1E6F\u1E71\u1E73\u1E75\u1E77\u1E79\u1E7B\u1E7D\u1E7F\u1E81\u1E83\u1E85\u1E87\u1E89\u1E8B\u1E8D\u1E8F\u1E91\u1E93\u1E95-\u1E9D\u1E9F\u1EA1\u1EA3\u1EA5\u1EA7\u1EA9\u1EAB\u1EAD\u1EAF\u1EB1\u1EB3\u1EB5\u1EB7\u1EB9\u1EBB\u1EBD\u1EBF\u1EC1\u1EC3\u1EC5\u1EC7\u1EC9\u1ECB\u1ECD\u1ECF\u1ED1\u1ED3\u1ED5\u1ED7\u1ED9\u1EDB\u1EDD\u1EDF\u1EE1\u1EE3\u1EE5\u1EE7\u1EE9\u1EEB\u1EED\u1EEF\u1EF1\u1EF3\u1EF5\u1EF7\u1EF9\u1EFB\u1EFD\u1EFF-\u1F07\u1F10-\u1F15\u1F20-\u1F27\u1F30-\u1F37\u1F40-\u1F45\u1F50-\u1F57\u1F60-\u1F67\u1F70-\u1F7D\u1F80-\u1F87\u1F90-\u1F97\u1FA0-\u1FA7\u1FB0-\u1FB4\u1FB6\u1FB7\u1FBE\u1FC2-\u1FC4\u1FC6\u1FC7\u1FD0-\u1FD3\u1FD6\u1FD7\u1FE0-\u1FE7\u1FF2-\u1FF4\u1FF6\u1FF7\u210A\u210E\u210F\u2113\u212F\u2134\u2139\u213C\u213D\u2146-\u2149\u214E\u2184\u2C30-\u2C5E\u2C61\u2C65\u2C66\u2C68\u2C6A\u2C6C\u2C71\u2C73\u2C74\u2C76-\u2C7B\u2C81\u2C83\u2C85\u2C87\u2C89\u2C8B\u2C8D\u2C8F\u2C91\u2C93\u2C95\u2C97\u2C99\u2C9B\u2C9D\u2C9F\u2CA1\u2CA3\u2CA5\u2CA7\u2CA9\u2CAB\u2CAD\u2CAF\u2CB1\u2CB3\u2CB5\u2CB7\u2CB9\u2CBB\u2CBD\u2CBF\u2CC1\u2CC3\u2CC5\u2CC7\u2CC9\u2CCB\u2CCD\u2CCF\u2CD1\u2CD3\u2CD5\u2CD7\u2CD9\u2CDB\u2CDD\u2CDF\u2CE1\u2CE3\u2CE4\u2CEC\u2CEE\u2CF3\u2D00-\u2D25\u2D27\u2D2D\uA641\uA643\uA645\uA647\uA649\uA64B\uA64D\uA64F\uA651\uA653\uA655\uA657\uA659\uA65B\uA65D\uA65F\uA661\uA663\uA665\uA667\uA669\uA66B\uA66D\uA681\uA683\uA685\uA687\uA689\uA68B\uA68D\uA68F\uA691\uA693\uA695\uA697\uA723\uA725\uA727\uA729\uA72B\uA72D\uA72F-\uA731\uA733\uA735\uA737\uA739\uA73B\uA73D\uA73F\uA741\uA743\uA745\uA747\uA749\uA74B\uA74D\uA74F\uA751\uA753\uA755\uA757\uA759\uA75B\uA75D\uA75F\uA761\uA763\uA765\uA767\uA769\uA76B\uA76D\uA76F\uA771-\uA778\uA77A\uA77C\uA77F\uA781\uA783\uA785\uA787\uA78C\uA78E\uA791\uA793\uA7A1\uA7A3\uA7A5\uA7A7\uA7A9\uA7FA\uFB00-\uFB06\uFB13-\uFB17\uFF41-\uFF5A])([\u0041-\u005A\u00C0-\u00D6\u00D8-\u00DE\u0100\u0102\u0104\u0106\u0108\u010A\u010C\u010E\u0110\u0112\u0114\u0116\u0118\u011A\u011C\u011E\u0120\u0122\u0124\u0126\u0128\u012A\u012C\u012E\u0130\u0132\u0134\u0136\u0139\u013B\u013D\u013F\u0141\u0143\u0145\u0147\u014A\u014C\u014E\u0150\u0152\u0154\u0156\u0158\u015A\u015C\u015E\u0160\u0162\u0164\u0166\u0168\u016A\u016C\u016E\u0170\u0172\u0174\u0176\u0178\u0179\u017B\u017D\u0181\u0182\u0184\u0186\u0187\u0189-\u018B\u018E-\u0191\u0193\u0194\u0196-\u0198\u019C\u019D\u019F\u01A0\u01A2\u01A4\u01A6\u01A7\u01A9\u01AC\u01AE\u01AF\u01B1-\u01B3\u01B5\u01B7\u01B8\u01BC\u01C4\u01C7\u01CA\u01CD\u01CF\u01D1\u01D3\u01D5\u01D7\u01D9\u01DB\u01DE\u01E0\u01E2\u01E4\u01E6\u01E8\u01EA\u01EC\u01EE\u01F1\u01F4\u01F6-\u01F8\u01FA\u01FC\u01FE\u0200\u0202\u0204\u0206\u0208\u020A\u020C\u020E\u0210\u0212\u0214\u0216\u0218\u021A\u021C\u021E\u0220\u0222\u0224\u0226\u0228\u022A\u022C\u022E\u0230\u0232\u023A\u023B\u023D\u023E\u0241\u0243-\u0246\u0248\u024A\u024C\u024E\u0370\u0372\u0376\u0386\u0388-\u038A\u038C\u038E\u038F\u0391-\u03A1\u03A3-\u03AB\u03CF\u03D2-\u03D4\u03D8\u03DA\u03DC\u03DE\u03E0\u03E2\u03E4\u03E6\u03E8\u03EA\u03EC\u03EE\u03F4\u03F7\u03F9\u03FA\u03FD-\u042F\u0460\u0462\u0464\u0466\u0468\u046A\u046C\u046E\u0470\u0472\u0474\u0476\u0478\u047A\u047C\u047E\u0480\u048A\u048C\u048E\u0490\u0492\u0494\u0496\u0498\u049A\u049C\u049E\u04A0\u04A2\u04A4\u04A6\u04A8\u04AA\u04AC\u04AE\u04B0\u04B2\u04B4\u04B6\u04B8\u04BA\u04BC\u04BE\u04C0\u04C1\u04C3\u04C5\u04C7\u04C9\u04CB\u04CD\u04D0\u04D2\u04D4\u04D6\u04D8\u04DA\u04DC\u04DE\u04E0\u04E2\u04E4\u04E6\u04E8\u04EA\u04EC\u04EE\u04F0\u04F2\u04F4\u04F6\u04F8\u04FA\u04FC\u04FE\u0500\u0502\u0504\u0506\u0508\u050A\u050C\u050E\u0510\u0512\u0514\u0516\u0518\u051A\u051C\u051E\u0520\u0522\u0524\u0526\u0531-\u0556\u10A0-\u10C5\u10C7\u10CD\u1E00\u1E02\u1E04\u1E06\u1E08\u1E0A\u1E0C\u1E0E\u1E10\u1E12\u1E14\u1E16\u1E18\u1E1A\u1E1C\u1E1E\u1E20\u1E22\u1E24\u1E26\u1E28\u1E2A\u1E2C\u1E2E\u1E30\u1E32\u1E34\u1E36\u1E38\u1E3A\u1E3C\u1E3E\u1E40\u1E42\u1E44\u1E46\u1E48\u1E4A\u1E4C\u1E4E\u1E50\u1E52\u1E54\u1E56\u1E58\u1E5A\u1E5C\u1E5E\u1E60\u1E62\u1E64\u1E66\u1E68\u1E6A\u1E6C\u1E6E\u1E70\u1E72\u1E74\u1E76\u1E78\u1E7A\u1E7C\u1E7E\u1E80\u1E82\u1E84\u1E86\u1E88\u1E8A\u1E8C\u1E8E\u1E90\u1E92\u1E94\u1E9E\u1EA0\u1EA2\u1EA4\u1EA6\u1EA8\u1EAA\u1EAC\u1EAE\u1EB0\u1EB2\u1EB4\u1EB6\u1EB8\u1EBA\u1EBC\u1EBE\u1EC0\u1EC2\u1EC4\u1EC6\u1EC8\u1ECA\u1ECC\u1ECE\u1ED0\u1ED2\u1ED4\u1ED6\u1ED8\u1EDA\u1EDC\u1EDE\u1EE0\u1EE2\u1EE4\u1EE6\u1EE8\u1EEA\u1EEC\u1EEE\u1EF0\u1EF2\u1EF4\u1EF6\u1EF8\u1EFA\u1EFC\u1EFE\u1F08-\u1F0F\u1F18-\u1F1D\u1F28-\u1F2F\u1F38-\u1F3F\u1F48-\u1F4D\u1F59\u1F5B\u1F5D\u1F5F\u1F68-\u1F6F\u1FB8-\u1FBB\u1FC8-\u1FCB\u1FD8-\u1FDB\u1FE8-\u1FEC\u1FF8-\u1FFB\u2102\u2107\u210B-\u210D\u2110-\u2112\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u2130-\u2133\u213E\u213F\u2145\u2183\u2C00-\u2C2E\u2C60\u2C62-\u2C64\u2C67\u2C69\u2C6B\u2C6D-\u2C70\u2C72\u2C75\u2C7E-\u2C80\u2C82\u2C84\u2C86\u2C88\u2C8A\u2C8C\u2C8E\u2C90\u2C92\u2C94\u2C96\u2C98\u2C9A\u2C9C\u2C9E\u2CA0\u2CA2\u2CA4\u2CA6\u2CA8\u2CAA\u2CAC\u2CAE\u2CB0\u2CB2\u2CB4\u2CB6\u2CB8\u2CBA\u2CBC\u2CBE\u2CC0\u2CC2\u2CC4\u2CC6\u2CC8\u2CCA\u2CCC\u2CCE\u2CD0\u2CD2\u2CD4\u2CD6\u2CD8\u2CDA\u2CDC\u2CDE\u2CE0\u2CE2\u2CEB\u2CED\u2CF2\uA640\uA642\uA644\uA646\uA648\uA64A\uA64C\uA64E\uA650\uA652\uA654\uA656\uA658\uA65A\uA65C\uA65E\uA660\uA662\uA664\uA666\uA668\uA66A\uA66C\uA680\uA682\uA684\uA686\uA688\uA68A\uA68C\uA68E\uA690\uA692\uA694\uA696\uA722\uA724\uA726\uA728\uA72A\uA72C\uA72E\uA732\uA734\uA736\uA738\uA73A\uA73C\uA73E\uA740\uA742\uA744\uA746\uA748\uA74A\uA74C\uA74E\uA750\uA752\uA754\uA756\uA758\uA75A\uA75C\uA75E\uA760\uA762\uA764\uA766\uA768\uA76A\uA76C\uA76E\uA779\uA77B\uA77D\uA77E\uA780\uA782\uA784\uA786\uA78B\uA78D\uA790\uA792\uA7A0\uA7A2\uA7A4\uA7A6\uA7A8\uA7AA\uFF21-\uFF3A\u0030-\u0039\u00B2\u00B3\u00B9\u00BC-\u00BE\u0660-\u0669\u06F0-\u06F9\u07C0-\u07C9\u0966-\u096F\u09E6-\u09EF\u09F4-\u09F9\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0B72-\u0B77\u0BE6-\u0BF2\u0C66-\u0C6F\u0C78-\u0C7E\u0CE6-\u0CEF\u0D66-\u0D75\u0E50-\u0E59\u0ED0-\u0ED9\u0F20-\u0F33\u1040-\u1049\u1090-\u1099\u1369-\u137C\u16EE-\u16F0\u17E0-\u17E9\u17F0-\u17F9\u1810-\u1819\u1946-\u194F\u19D0-\u19DA\u1A80-\u1A89\u1A90-\u1A99\u1B50-\u1B59\u1BB0-\u1BB9\u1C40-\u1C49\u1C50-\u1C59\u2070\u2074-\u2079\u2080-\u2089\u2150-\u2182\u2185-\u2189\u2460-\u249B\u24EA-\u24FF\u2776-\u2793\u2CFD\u3007\u3021-\u3029\u3038-\u303A\u3192-\u3195\u3220-\u3229\u3248-\u324F\u3251-\u325F\u3280-\u3289\u32B1-\u32BF\uA620-\uA629\uA6E6-\uA6EF\uA830-\uA835\uA8D0-\uA8D9\uA900-\uA909\uA9D0-\uA9D9\uAA50-\uAA59\uABF0-\uABF9\uFF10-\uFF19])/g;

/***/ },
/* 154 */
/***/ function(module, exports) {

	"use strict";

	module.exports = /([\u0030-\u0039\u00B2\u00B3\u00B9\u00BC-\u00BE\u0660-\u0669\u06F0-\u06F9\u07C0-\u07C9\u0966-\u096F\u09E6-\u09EF\u09F4-\u09F9\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0B72-\u0B77\u0BE6-\u0BF2\u0C66-\u0C6F\u0C78-\u0C7E\u0CE6-\u0CEF\u0D66-\u0D75\u0E50-\u0E59\u0ED0-\u0ED9\u0F20-\u0F33\u1040-\u1049\u1090-\u1099\u1369-\u137C\u16EE-\u16F0\u17E0-\u17E9\u17F0-\u17F9\u1810-\u1819\u1946-\u194F\u19D0-\u19DA\u1A80-\u1A89\u1A90-\u1A99\u1B50-\u1B59\u1BB0-\u1BB9\u1C40-\u1C49\u1C50-\u1C59\u2070\u2074-\u2079\u2080-\u2089\u2150-\u2182\u2185-\u2189\u2460-\u249B\u24EA-\u24FF\u2776-\u2793\u2CFD\u3007\u3021-\u3029\u3038-\u303A\u3192-\u3195\u3220-\u3229\u3248-\u324F\u3251-\u325F\u3280-\u3289\u32B1-\u32BF\uA620-\uA629\uA6E6-\uA6EF\uA830-\uA835\uA8D0-\uA8D9\uA900-\uA909\uA9D0-\uA9D9\uAA50-\uAA59\uABF0-\uABF9\uFF10-\uFF19])([^\u0030-\u0039\u00B2\u00B3\u00B9\u00BC-\u00BE\u0660-\u0669\u06F0-\u06F9\u07C0-\u07C9\u0966-\u096F\u09E6-\u09EF\u09F4-\u09F9\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0B72-\u0B77\u0BE6-\u0BF2\u0C66-\u0C6F\u0C78-\u0C7E\u0CE6-\u0CEF\u0D66-\u0D75\u0E50-\u0E59\u0ED0-\u0ED9\u0F20-\u0F33\u1040-\u1049\u1090-\u1099\u1369-\u137C\u16EE-\u16F0\u17E0-\u17E9\u17F0-\u17F9\u1810-\u1819\u1946-\u194F\u19D0-\u19DA\u1A80-\u1A89\u1A90-\u1A99\u1B50-\u1B59\u1BB0-\u1BB9\u1C40-\u1C49\u1C50-\u1C59\u2070\u2074-\u2079\u2080-\u2089\u2150-\u2182\u2185-\u2189\u2460-\u249B\u24EA-\u24FF\u2776-\u2793\u2CFD\u3007\u3021-\u3029\u3038-\u303A\u3192-\u3195\u3220-\u3229\u3248-\u324F\u3251-\u325F\u3280-\u3289\u32B1-\u32BF\uA620-\uA629\uA6E6-\uA6EF\uA830-\uA835\uA8D0-\uA8D9\uA900-\uA909\uA9D0-\uA9D9\uAA50-\uAA59\uABF0-\uABF9\uFF10-\uFF19])/g;

/***/ },
/* 155 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;
	exports['default'] = checkArgs;

	var _ordinal = __webpack_require__(156);

	var _ordinal2 = _interopRequireDefault(_ordinal);

	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : { 'default': obj };
	}

	// Validation helper
	function checkArgs(name, args) {
	  var _ref = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

	  var _ref$nullable = _ref.nullable;
	  var nullable = _ref$nullable === undefined ? false : _ref$nullable;
	  var _ref$minArgs = _ref.minArgs;
	  var minArgs = _ref$minArgs === undefined ? 1 : _ref$minArgs;
	  var _ref$maxArgs = _ref.maxArgs;
	  var maxArgs = _ref$maxArgs === undefined ? 1 : _ref$maxArgs;

	  if (minArgs === maxArgs && args.length !== minArgs) {
	    var plural = minArgs === 1 ? '' : 's';
	    throw new Error(name + ' must receive exactly ' + minArgs + ' argument' + plural);
	  }
	  if (args.length < minArgs) {
	    var plural1 = minArgs === 1 ? '' : 's';
	    throw new Error(name + ' must receive at least ' + minArgs + ' argument' + plural1 + '.');
	  }
	  if (args.length > maxArgs) {
	    var plural2 = maxArgs === 1 ? '' : 's';
	    throw new Error(name + ' accepts at most ' + maxArgs + ' argument' + plural2 + '.');
	  }
	  for (var i = 0; i < args.length; i++) {
	    if (!nullable && args[i] === null) {
	      var ordinality = maxArgs !== 1 ? ' ' + (0, _ordinal2['default'])(i + 1) : '';
	      throw new Error('The' + ordinality + ' argument to ' + name + ' must be non-null');
	    }
	    if (args[i] === undefined) {
	      throw new Error('The ' + (0, _ordinal2['default'])(i + 1) + ' argument to ' + name + ' must be defined');
	    }
	  }
	}
	//# sourceMappingURL=check-args.js.map

/***/ },
/* 156 */
/***/ function(module, exports) {

	"use strict";

	exports.__esModule = true;
	exports["default"] = ordinal;
	function ordinal(x) {
	  if ([11, 12, 13].indexOf(x) !== -1) {
	    return x + "th";
	  } else if (x % 10 === 1) {
	    return x + "st";
	  } else if (x % 10 === 2) {
	    return x + "nd";
	  } else if (x % 10 === 3) {
	    return x + "rd";
	  }
	  return x + "th";
	}
	//# sourceMappingURL=ordinal.js.map

/***/ },
/* 157 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	var _typeof2 = __webpack_require__(50);

	var _typeof3 = _interopRequireDefault(_typeof2);

	exports['default'] = validIndexValue;

	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : { 'default': obj };
	}

	// Checks whether the return value is a valid primary or secondary
	// index value in RethinkDB.
	function validIndexValue(val) {
	  if (val === null) {
	    return false;
	  }
	  if (['boolean', 'number', 'string'].indexOf(typeof val === 'undefined' ? 'undefined' : (0, _typeof3['default'])(val)) !== -1) {
	    return true;
	  }
	  if (val instanceof ArrayBuffer) {
	    return true;
	  }
	  if (val instanceof Date) {
	    return true;
	  }
	  if (Array.isArray(val)) {
	    var _ret = function () {
	      var isValid = true;
	      val.forEach(function (v) {
	        isValid = isValid && validIndexValue(v);
	      });
	      return {
	        v: isValid
	      };
	    }();

	    if ((typeof _ret === 'undefined' ? 'undefined' : (0, _typeof3['default'])(_ret)) === "object") return _ret.v;
	  }
	  return false;
	}
	//# sourceMappingURL=valid-index-value.js.map

/***/ },
/* 158 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	var _typeof2 = __webpack_require__(50);

	var _typeof3 = _interopRequireDefault(_typeof2);

	exports.deserialize = deserialize;
	exports.serialize = serialize;

	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : { 'default': obj };
	}

	var PRIMITIVES = ['string', 'number', 'boolean', 'function', 'symbol'];

	function modifyObject(doc) {
	  Object.keys(doc).forEach(function (key) {
	    doc[key] = deserialize(doc[key]);
	  });
	  return doc;
	}

	function deserialize(value) {
	  if (value == null) {
	    return value;
	  } else if (PRIMITIVES.indexOf(typeof value === 'undefined' ? 'undefined' : (0, _typeof3['default'])(value)) !== -1) {
	    return value;
	  } else if (Array.isArray(value)) {
	    return value.map(deserialize);
	  } else if (value.$reql_type$ === 'TIME') {
	    var date = new Date();
	    date.setTime(value.epoch_time * 1000);
	    return date;
	  } else {
	    return modifyObject(value);
	  }
	}

	function jsonifyObject(doc) {
	  Object.keys(doc).forEach(function (key) {
	    doc[key] = serialize(doc[key]);
	  });
	  return doc;
	}

	function serialize(value) {
	  if (value == null) {
	    return value;
	  } else if (PRIMITIVES.indexOf(typeof value === 'undefined' ? 'undefined' : (0, _typeof3['default'])(value)) !== -1) {
	    return value;
	  } else if (Array.isArray(value)) {
	    return value.map(serialize);
	  } else if (value instanceof Date) {
	    return {
	      $reql_type$: 'TIME',
	      epoch_time: value.getTime() / 1000,
	      // Rethink will serialize this as "+00:00", but accepts Z
	      timezone: 'Z'
	    };
	  } else {
	    return jsonifyObject(value);
	  }
	}
	//# sourceMappingURL=serialization.js.map

/***/ },
/* 159 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _classCallCheck2 = __webpack_require__(126);

	var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

	var _possibleConstructorReturn2 = __webpack_require__(49);

	var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

	var _inherits2 = __webpack_require__(118);

	var _inherits3 = _interopRequireDefault(_inherits2);

	var _AsyncSubject = __webpack_require__(160);

	var _BehaviorSubject = __webpack_require__(161);

	var _Subject2 = __webpack_require__(132);

	var _Observable = __webpack_require__(2);

	__webpack_require__(162);

	__webpack_require__(44);

	__webpack_require__(166);

	var _serialization = __webpack_require__(158);

	var _logging = __webpack_require__(168);

	var _engine = __webpack_require__(169);

	var _engine2 = _interopRequireDefault(_engine);

	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : { 'default': obj };
	}

	var transports = void 0;

	if (typeof window === 'undefined') {
	  transports = ['websocket'];
	}

	var PROTOCOL_VERSION = 'rethinkdb-horizon-v0';

	// Before connecting the first time
	var STATUS_UNCONNECTED = { type: 'unconnected' };
	// After the websocket is opened and handshake is completed
	var STATUS_READY = { type: 'ready' };
	// After unconnected, maybe before or after connected. Any socket level error
	var STATUS_ERROR = { type: 'error' };
	// Occurs when the socket closes
	var STATUS_DISCONNECTED = { type: 'disconnected' };

	var ProtocolError = function (_Error) {
	  (0, _inherits3['default'])(ProtocolError, _Error);

	  function ProtocolError(msg, errorCode) {
	    (0, _classCallCheck3['default'])(this, ProtocolError);

	    var _this = (0, _possibleConstructorReturn3['default'])(this, _Error.call(this, msg));

	    _this.errorCode = errorCode;
	    return _this;
	  }

	  ProtocolError.prototype.toString = function toString() {
	    return this.message + ' (Code: ' + this.errorCode + ')';
	  };

	  return ProtocolError;
	}(Error);

	// Wraps native websockets with a Subject, which is both an Subscriber
	// and an Observable (it is bi-directional after all!). This
	// implementation is adapted from Rx.DOM.fromWebSocket and
	// RxSocketSubject by Ben Lesh, but it also deals with some simple
	// protocol level things like serializing from/to JSON, routing
	// request_ids, looking at the `state` field to decide when an
	// observable is closed.


	var HorizonSocket = function (_Subject) {
	  (0, _inherits3['default'])(HorizonSocket, _Subject);

	  function HorizonSocket(host, secure, path, handshaker) {
	    (0, _classCallCheck3['default'])(this, HorizonSocket);

	    var hostString = 'ws' + (secure ? 's' : '') + '://' + host;
	    var msgBuffer = [];
	    var ws = void 0,
	        handshakeDisp = void 0;
	    // Handshake is an asyncsubject because we want it to always cache
	    // the last value it received, like a promise
	    var handshake = new _AsyncSubject.AsyncSubject();
	    var statusSubject = new _BehaviorSubject.BehaviorSubject(STATUS_UNCONNECTED);

	    var isOpen = function isOpen() {
	      return Boolean(ws) && ws.readyState === 'open';
	    };

	    // Serializes to a string before sending
	    function wsSend(msg) {
	      var stringMsg = JSON.stringify((0, _serialization.serialize)(msg));

	      ws.send(stringMsg);
	    }

	    // This is the observable part of the Subject. It forwards events
	    // from the underlying websocket
	    var socketObservable = _Observable.Observable.create(function (subscriber) {
	      ws = (0, _engine2['default'])(hostString, {
	        protocol: PROTOCOL_VERSION,
	        path: '/' + path,
	        transports: transports
	      });

	      ws.on('error', function () {
	        // If the websocket experiences the error, we forward it through
	        // to the observable. Unfortunately, the event we receive in
	        // this callback doesn't tell us much of anything, so there's no
	        // reason to forward it on and we just send a generic error.
	        statusSubject.next(STATUS_ERROR);
	        var errMsg = 'Websocket ' + hostString + ' experienced an error';
	        subscriber.error(new Error(errMsg));
	      });

	      ws.on('open', function () {
	        ws.on('message', function (data) {
	          var deserialized = (0, _serialization.deserialize)(JSON.parse(data));
	          (0, _logging.log)('Received', deserialized);
	          subscriber.next(deserialized);
	        });

	        ws.on('close', function (e) {
	          // This will happen if the socket is closed by the server If
	          // .close is called from the client (see closeSocket), this
	          // listener will be removed
	          statusSubject.next(STATUS_DISCONNECTED);
	          if (e !== 'forced close') {
	            subscriber.error(new Error('Socket closed unexpectedly with code: ' + e));
	          } else {
	            subscriber.complete();
	          }
	        });

	        // Send the handshake
	        handshakeDisp = _this2.makeRequest(handshaker()).subscribe(function (x) {
	          handshake.next(x);
	          handshake.complete();
	          statusSubject.next(STATUS_READY);
	        }, function (err) {
	          return handshake.error(err);
	        }, function () {
	          return handshake.complete();
	        });
	        // Send any messages that have been buffered
	        while (msgBuffer.length > 0) {
	          var msg = msgBuffer.shift();
	          (0, _logging.log)('Sending buffered:', msg);
	          wsSend(msg);
	        }
	      });
	      return function () {
	        if (handshakeDisp) {
	          handshakeDisp.unsubscribe();
	        }
	        // This is the "unsubscribe" method on the final Subject
	        closeSocket(1000, '');
	      };
	    }).share(); // This makes it a "hot" observable, and refCounts it
	    // Note possible edge cases: the `share` operator is equivalent to
	    // .multicast(() => new Subject()).refCount() // RxJS 5
	    // .multicast(new Subject()).refCount() // RxJS 4

	    // This is the Subscriber part of the Subject. How we can send stuff
	    // over the websocket
	    var socketSubscriber = {
	      next: function next(messageToSend) {
	        // When next is called on this subscriber
	        // Note: If we aren't ready, the message is silently dropped
	        if (isOpen()) {
	          (0, _logging.log)('Sending', messageToSend);
	          wsSend(messageToSend); // wsSend serializes to a string
	        } else {
	          (0, _logging.log)('Buffering', messageToSend);
	          msgBuffer.push(messageToSend);
	        }
	      },
	      error: function error(_error) {
	        // The subscriber is receiving an error. Better close the
	        // websocket with an error
	        if (!_error.code) {
	          throw new Error('no code specified. Be sure to pass ' + '{ code: ###, reason: "" } to error()');
	        }
	        closeSocket(_error.code, _error.reason);
	      },
	      complete: function complete() {
	        // complete for the subscriber here is equivalent to "close
	        // this socket successfully (which is what code 1000 is)"
	        closeSocket(1000, '');
	      }
	    };

	    function closeSocket(code, reason) {
	      statusSubject.next(STATUS_DISCONNECTED);
	      if (!code) {
	        ws.close(); // successful close
	      } else {
	        ws.close(code, reason);
	      }
	    }

	    // Subscriptions will be the observable containing all
	    // queries/writes/changefeed requests. Specifically, the documents
	    // that initiate them, each one with a different request_id

	    var _this2 = (0, _possibleConstructorReturn3['default'])(this, _Subject.call(this, socketSubscriber, socketObservable));

	    var subscriptions = new _Subject2.Subject();
	    // Unsubscriptions is similar, only it holds only requests to
	    // close a particular request_id on the server. Currently we only
	    // need these for changefeeds.
	    var unsubscriptions = new _Subject2.Subject();
	    var outgoing = _Observable.Observable.merge(subscriptions, unsubscriptions);
	    // How many requests are outstanding
	    var activeRequests = 0;
	    // Monotonically increasing counter for request_ids
	    var requestCounter = 0;
	    // Unsubscriber for subscriptions/unsubscriptions
	    var subDisp = null;
	    // Now that super has been called, we can add attributes to this
	    _this2.handshake = handshake;
	    // Lets external users keep track of the current websocket status
	    // without causing it to connect
	    _this2.status = statusSubject;

	    var incrementActive = function incrementActive() {
	      if (++activeRequests === 1) {
	        // We subscribe the socket itself to the subscription and
	        // unsubscription requests. Since the socket is both an
	        // observable and an subscriber. Here it's acting as an subscriber,
	        // watching our requests.
	        subDisp = outgoing.subscribe(_this2);
	      }
	    };

	    // Decrement the number of active requests on the socket, and
	    // close the socket if we're the last request
	    var decrementActive = function decrementActive() {
	      if (--activeRequests === 0) {
	        subDisp.unsubscribe();
	      }
	    };

	    // This is used externally to send requests to the server
	    _this2.makeRequest = function (rawRequest) {
	      return _Observable.Observable.create(function (reqSubscriber) {
	        // Get a new request id
	        var request_id = requestCounter++;
	        // Add the request id to the request and the unsubscribe request
	        // if there is one
	        rawRequest.request_id = request_id;
	        var unsubscribeRequest = { request_id: request_id, type: 'end_subscription' };
	        // First, increment activeRequests and decide if we need to
	        // connect to the socket
	        incrementActive();

	        // Now send the request to the server
	        subscriptions.next(rawRequest);

	        // Create an observable from the socket that filters by request_id
	        var unsubscribeFilter = _this2.filter(function (x) {
	          return x.request_id === request_id;
	        }).subscribe(function (resp) {
	          // Need to faithfully end the stream if there is an error
	          if (resp.error !== undefined) {
	            reqSubscriber.error(new ProtocolError(resp.error, resp.error_code));
	          } else if (resp.data !== undefined || resp.token !== undefined) {
	            try {
	              reqSubscriber.next(resp);
	            } catch (e) {}
	          }
	          if (resp.state === 'synced') {
	            // Create a little dummy object for sync notifications
	            reqSubscriber.next({
	              type: 'state',
	              state: 'synced'
	            });
	          } else if (resp.state === 'complete') {
	            reqSubscriber.complete();
	          }
	        }, function (err) {
	          return reqSubscriber.error(err);
	        }, function () {
	          return reqSubscriber.complete();
	        });
	        return function () {
	          // Unsubscribe if necessary
	          unsubscriptions.next(unsubscribeRequest);
	          decrementActive();
	          unsubscribeFilter.unsubscribe();
	        };
	      });
	    };
	    return _this2;
	  }

	  return HorizonSocket;
	}(_Subject2.Subject);

	module.exports = HorizonSocket;
	//# sourceMappingURL=socket.js.map

/***/ },
/* 160 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var Subject_1 = __webpack_require__(132);
	/**
	 * @class AsyncSubject<T>
	 */
	var AsyncSubject = function (_super) {
	    __extends(AsyncSubject, _super);
	    function AsyncSubject() {
	        _super.apply(this, arguments);
	        this.value = null;
	        this.hasNext = false;
	    }
	    AsyncSubject.prototype._subscribe = function (subscriber) {
	        if (this.hasCompleted && this.hasNext) {
	            subscriber.next(this.value);
	        }
	        return _super.prototype._subscribe.call(this, subscriber);
	    };
	    AsyncSubject.prototype._next = function (value) {
	        this.value = value;
	        this.hasNext = true;
	    };
	    AsyncSubject.prototype._complete = function () {
	        var index = -1;
	        var observers = this.observers;
	        var len = observers.length;
	        // optimization to block our SubjectSubscriptions from
	        // splicing themselves out of the observers list one by one.
	        this.isUnsubscribed = true;
	        if (this.hasNext) {
	            while (++index < len) {
	                var o = observers[index];
	                o.next(this.value);
	                o.complete();
	            }
	        } else {
	            while (++index < len) {
	                observers[index].complete();
	            }
	        }
	        this.isUnsubscribed = false;
	        this.unsubscribe();
	    };
	    return AsyncSubject;
	}(Subject_1.Subject);
	exports.AsyncSubject = AsyncSubject;
	//# sourceMappingURL=AsyncSubject.js.map

/***/ },
/* 161 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var Subject_1 = __webpack_require__(132);
	var throwError_1 = __webpack_require__(134);
	var ObjectUnsubscribedError_1 = __webpack_require__(135);
	/**
	 * @class BehaviorSubject<T>
	 */
	var BehaviorSubject = function (_super) {
	    __extends(BehaviorSubject, _super);
	    function BehaviorSubject(_value) {
	        _super.call(this);
	        this._value = _value;
	    }
	    BehaviorSubject.prototype.getValue = function () {
	        if (this.hasErrored) {
	            throwError_1.throwError(this.errorValue);
	        } else if (this.isUnsubscribed) {
	            throwError_1.throwError(new ObjectUnsubscribedError_1.ObjectUnsubscribedError());
	        } else {
	            return this._value;
	        }
	    };
	    Object.defineProperty(BehaviorSubject.prototype, "value", {
	        get: function get() {
	            return this.getValue();
	        },
	        enumerable: true,
	        configurable: true
	    });
	    BehaviorSubject.prototype._subscribe = function (subscriber) {
	        var subscription = _super.prototype._subscribe.call(this, subscriber);
	        if (subscription && !subscription.isUnsubscribed) {
	            subscriber.next(this._value);
	        }
	        return subscription;
	    };
	    BehaviorSubject.prototype._next = function (value) {
	        _super.prototype._next.call(this, this._value = value);
	    };
	    BehaviorSubject.prototype._error = function (err) {
	        this.hasErrored = true;
	        _super.prototype._error.call(this, this.errorValue = err);
	    };
	    return BehaviorSubject;
	}(Subject_1.Subject);
	exports.BehaviorSubject = BehaviorSubject;
	//# sourceMappingURL=BehaviorSubject.js.map

/***/ },
/* 162 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var Observable_1 = __webpack_require__(2);
	var merge_1 = __webpack_require__(163);
	Observable_1.Observable.merge = merge_1.merge;
	//# sourceMappingURL=merge.js.map

/***/ },
/* 163 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var merge_1 = __webpack_require__(164);
	exports.merge = merge_1.mergeStatic;
	//# sourceMappingURL=merge.js.map

/***/ },
/* 164 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var ArrayObservable_1 = __webpack_require__(20);
	var mergeAll_1 = __webpack_require__(165);
	var isScheduler_1 = __webpack_require__(23);
	/**
	 * Creates an output Observable which concurrently emits all values from every
	 * given input Observable.
	 *
	 * <span class="informal">Flattens multiple Observables together by blending
	 * their values into one Observable.</span>
	 *
	 * <img src="./img/merge.png" width="100%">
	 *
	 * `merge` subscribes to each given input Observable (either the source or an
	 * Observable given as argument), and simply forwards (without doing any
	 * transformation) all the values from all the input Observables to the output
	 * Observable. The output Observable only completes once all input Observables
	 * have completed. Any error delivered by an input Observable will be immediately
	 * emitted on the output Observable.
	 *
	 * @example <caption>Merge together two Observables: 1s interval and clicks</caption>
	 * var clicks = Rx.Observable.fromEvent(document, 'click');
	 * var timer = Rx.Observable.interval(1000);
	 * var clicksOrTimer = clicks.merge(timer);
	 * clicksOrTimer.subscribe(x => console.log(x));
	 *
	 * @example <caption>Merge together 3 Observables, but only 2 run concurrently</caption>
	 * var timer1 = Rx.Observable.interval(1000).take(10);
	 * var timer2 = Rx.Observable.interval(2000).take(6);
	 * var timer3 = Rx.Observable.interval(500).take(10);
	 * var concurrent = 2; // the argument
	 * var merged = timer1.merge(timer2, timer3, concurrent);
	 * merged.subscribe(x => console.log(x));
	 *
	 * @see {@link mergeAll}
	 * @see {@link mergeMap}
	 * @see {@link mergeMapTo}
	 * @see {@link mergeScan}
	 *
	 * @param {Observable} other An input Observable to merge with the source
	 * Observable. More than one input Observables may be given as argument.
	 * @param {number} [concurrent=Number.POSITIVE_INFINITY] Maximum number of input
	 * Observables being subscribed to concurrently.
	 * @param {Scheduler} [scheduler=null] The Scheduler to use for managing
	 * concurrency of input Observables.
	 * @return {Observable} an Observable that emits items that are the result of
	 * every input Observable.
	 * @method merge
	 * @owner Observable
	 */
	function merge() {
	    var observables = [];
	    for (var _i = 0; _i < arguments.length; _i++) {
	        observables[_i - 0] = arguments[_i];
	    }
	    observables.unshift(this);
	    return mergeStatic.apply(this, observables);
	}
	exports.merge = merge;
	/* tslint:enable:max-line-length */
	/**
	 * Creates an output Observable which concurrently emits all values from every
	 * given input Observable.
	 *
	 * <span class="informal">Flattens multiple Observables together by blending
	 * their values into one Observable.</span>
	 *
	 * <img src="./img/merge.png" width="100%">
	 *
	 * `merge` subscribes to each given input Observable (as arguments), and simply
	 * forwards (without doing any transformation) all the values from all the input
	 * Observables to the output Observable. The output Observable only completes
	 * once all input Observables have completed. Any error delivered by an input
	 * Observable will be immediately emitted on the output Observable.
	 *
	 * @example <caption>Merge together two Observables: 1s interval and clicks</caption>
	 * var clicks = Rx.Observable.fromEvent(document, 'click');
	 * var timer = Rx.Observable.interval(1000);
	 * var clicksOrTimer = Rx.Observable.merge(clicks, timer);
	 * clicksOrTimer.subscribe(x => console.log(x));
	 *
	 * @example <caption>Merge together 3 Observables, but only 2 run concurrently</caption>
	 * var timer1 = Rx.Observable.interval(1000).take(10);
	 * var timer2 = Rx.Observable.interval(2000).take(6);
	 * var timer3 = Rx.Observable.interval(500).take(10);
	 * var concurrent = 2; // the argument
	 * var merged = Rx.Observable.merge(timer1, timer2, timer3, concurrent);
	 * merged.subscribe(x => console.log(x));
	 *
	 * @see {@link mergeAll}
	 * @see {@link mergeMap}
	 * @see {@link mergeMapTo}
	 * @see {@link mergeScan}
	 *
	 * @param {Observable} input1 An input Observable to merge with others.
	 * @param {Observable} input2 An input Observable to merge with others.
	 * @param {number} [concurrent=Number.POSITIVE_INFINITY] Maximum number of input
	 * Observables being subscribed to concurrently.
	 * @param {Scheduler} [scheduler=null] The Scheduler to use for managing
	 * concurrency of input Observables.
	 * @return {Observable} an Observable that emits items that are the result of
	 * every input Observable.
	 * @static true
	 * @name merge
	 * @owner Observable
	 */
	function mergeStatic() {
	    var observables = [];
	    for (var _i = 0; _i < arguments.length; _i++) {
	        observables[_i - 0] = arguments[_i];
	    }
	    var concurrent = Number.POSITIVE_INFINITY;
	    var scheduler = null;
	    var last = observables[observables.length - 1];
	    if (isScheduler_1.isScheduler(last)) {
	        scheduler = observables.pop();
	        if (observables.length > 1 && typeof observables[observables.length - 1] === 'number') {
	            concurrent = observables.pop();
	        }
	    } else if (typeof last === 'number') {
	        concurrent = observables.pop();
	    }
	    if (observables.length === 1) {
	        return observables[0];
	    }
	    return new ArrayObservable_1.ArrayObservable(observables, scheduler).lift(new mergeAll_1.MergeAllOperator(concurrent));
	}
	exports.mergeStatic = mergeStatic;
	//# sourceMappingURL=merge.js.map

/***/ },
/* 165 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var OuterSubscriber_1 = __webpack_require__(41);
	var subscribeToResult_1 = __webpack_require__(39);
	/**
	 * Converts a higher-order Observable into a first-order Observable which
	 * concurrently delivers all values that are emitted on the inner Observables.
	 *
	 * <span class="informal">Flattens an Observable-of-Observables.</span>
	 *
	 * <img src="./img/mergeAll.png" width="100%">
	 *
	 * `mergeAll` subscribes to an Observable that emits Observables, also known as
	 * a higher-order Observable. Each time it observes one of these emitted inner
	 * Observables, it subscribes to that and delivers all the values from the
	 * inner Observable on the output Observable. The output Observable only
	 * completes once all inner Observables have completed. Any error delivered by
	 * a inner Observable will be immediately emitted on the output Observable.
	 *
	 * @example <caption>Spawn a new interval Observable for each click event, and blend their outputs as one Observable</caption>
	 * var clicks = Rx.Observable.fromEvent(document, 'click');
	 * var higherOrder = clicks.map((ev) => Rx.Observable.interval(1000));
	 * var firstOrder = higherOrder.mergeAll();
	 * firstOrder.subscribe(x => console.log(x));
	 *
	 * @example <caption>Count from 0 to 9 every second for each click, but only allow 2 concurrent timers</caption>
	 * var clicks = Rx.Observable.fromEvent(document, 'click');
	 * var higherOrder = clicks.map((ev) => Rx.Observable.interval(1000).take(10));
	 * var firstOrder = higherOrder.mergeAll(2);
	 * firstOrder.subscribe(x => console.log(x));
	 *
	 * @see {@link combineAll}
	 * @see {@link concatAll}
	 * @see {@link exhaust}
	 * @see {@link merge}
	 * @see {@link mergeMap}
	 * @see {@link mergeMapTo}
	 * @see {@link mergeScan}
	 * @see {@link switch}
	 * @see {@link zipAll}
	 *
	 * @param {number} [concurrent=Number.POSITIVE_INFINITY] Maximum number of inner
	 * Observables being subscribed to concurrently.
	 * @return {Observable} An Observable that emits values coming from all the
	 * inner Observables emitted by the source Observable.
	 * @method mergeAll
	 * @owner Observable
	 */
	function mergeAll(concurrent) {
	    if (concurrent === void 0) {
	        concurrent = Number.POSITIVE_INFINITY;
	    }
	    return this.lift(new MergeAllOperator(concurrent));
	}
	exports.mergeAll = mergeAll;
	var MergeAllOperator = function () {
	    function MergeAllOperator(concurrent) {
	        this.concurrent = concurrent;
	    }
	    MergeAllOperator.prototype.call = function (observer, source) {
	        return source._subscribe(new MergeAllSubscriber(observer, this.concurrent));
	    };
	    return MergeAllOperator;
	}();
	exports.MergeAllOperator = MergeAllOperator;
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @ignore
	 * @extends {Ignored}
	 */
	var MergeAllSubscriber = function (_super) {
	    __extends(MergeAllSubscriber, _super);
	    function MergeAllSubscriber(destination, concurrent) {
	        _super.call(this, destination);
	        this.concurrent = concurrent;
	        this.hasCompleted = false;
	        this.buffer = [];
	        this.active = 0;
	    }
	    MergeAllSubscriber.prototype._next = function (observable) {
	        if (this.active < this.concurrent) {
	            this.active++;
	            this.add(subscribeToResult_1.subscribeToResult(this, observable));
	        } else {
	            this.buffer.push(observable);
	        }
	    };
	    MergeAllSubscriber.prototype._complete = function () {
	        this.hasCompleted = true;
	        if (this.active === 0 && this.buffer.length === 0) {
	            this.destination.complete();
	        }
	    };
	    MergeAllSubscriber.prototype.notifyComplete = function (innerSub) {
	        var buffer = this.buffer;
	        this.remove(innerSub);
	        this.active--;
	        if (buffer.length > 0) {
	            this._next(buffer.shift());
	        } else if (this.active === 0 && this.hasCompleted) {
	            this.destination.complete();
	        }
	    };
	    return MergeAllSubscriber;
	}(OuterSubscriber_1.OuterSubscriber);
	exports.MergeAllSubscriber = MergeAllSubscriber;
	//# sourceMappingURL=mergeAll.js.map

/***/ },
/* 166 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var Observable_1 = __webpack_require__(2);
	var share_1 = __webpack_require__(167);
	Observable_1.Observable.prototype.share = share_1.share;
	//# sourceMappingURL=share.js.map

/***/ },
/* 167 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var multicast_1 = __webpack_require__(140);
	var Subject_1 = __webpack_require__(132);
	function shareSubjectFactory() {
	    return new Subject_1.Subject();
	}
	/**
	 * Returns a new Observable that multicasts (shares) the original Observable. As long as there is at least one
	 * Subscriber this Observable will be subscribed and emitting data. When all subscribers have unsubscribed it will
	 * unsubscribe from the source Observable. Because the Observable is multicasting it makes the stream `hot`.
	 * This is an alias for .publish().refCount().
	 *
	 * <img src="./img/share.png" width="100%">
	 *
	 * @return {Observable<T>} an Observable that upon connection causes the source Observable to emit items to its Observers
	 * @method share
	 * @owner Observable
	 */
	function share() {
	    return multicast_1.multicast.call(this, shareSubjectFactory).refCount();
	}
	exports.share = share;
	;
	//# sourceMappingURL=share.js.map

/***/ },
/* 168 */
/***/ function(module, exports) {

	"use strict";

	// Logging moved to its own module to avoid circular imports

	var debug = false;

	module.exports = {
	  log: function log() {
	    var _console;

	    return debug ? (_console = console).log.apply(_console, arguments) : undefined;
	  },
	  logError: function logError() {
	    var _console2;

	    return debug ? (_console2 = console).error.apply(_console2, arguments) : undefined;
	  },
	  enableLogging: function enableLogging() {
	    var deb = arguments.length <= 0 || arguments[0] === undefined ? true : arguments[0];
	    debug = deb;
	  }
	};
	//# sourceMappingURL=logging.js.map

/***/ },
/* 169 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = __webpack_require__(170);

/***/ },
/* 170 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = __webpack_require__(171);

	/**
	 * Exports parser
	 *
	 * @api public
	 *
	 */
	module.exports.parser = __webpack_require__(178);

/***/ },
/* 171 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

	/**
	 * Module dependencies.
	 */

	var transports = __webpack_require__(172);
	var Emitter = __webpack_require__(188);
	var debug = __webpack_require__(192)('engine.io-client:socket');
	var index = __webpack_require__(198);
	var parser = __webpack_require__(178);
	var parseuri = __webpack_require__(199);
	var parsejson = __webpack_require__(200);
	var parseqs = __webpack_require__(189);

	/**
	 * Module exports.
	 */

	module.exports = Socket;

	/**
	 * Noop function.
	 *
	 * @api private
	 */

	function noop() {}

	/**
	 * Socket constructor.
	 *
	 * @param {String|Object} uri or options
	 * @param {Object} options
	 * @api public
	 */

	function Socket(uri, opts) {
	  if (!(this instanceof Socket)) return new Socket(uri, opts);

	  opts = opts || {};

	  if (uri && 'object' == (typeof uri === 'undefined' ? 'undefined' : _typeof(uri))) {
	    opts = uri;
	    uri = null;
	  }

	  if (uri) {
	    uri = parseuri(uri);
	    opts.hostname = uri.host;
	    opts.secure = uri.protocol == 'https' || uri.protocol == 'wss';
	    opts.port = uri.port;
	    if (uri.query) opts.query = uri.query;
	  } else if (opts.host) {
	    opts.hostname = parseuri(opts.host).host;
	  }

	  this.secure = null != opts.secure ? opts.secure : global.location && 'https:' == location.protocol;

	  if (opts.hostname && !opts.port) {
	    // if no port is specified manually, use the protocol default
	    opts.port = this.secure ? '443' : '80';
	  }

	  this.agent = opts.agent || false;
	  this.hostname = opts.hostname || (global.location ? location.hostname : 'localhost');
	  this.port = opts.port || (global.location && location.port ? location.port : this.secure ? 443 : 80);
	  this.query = opts.query || {};
	  if ('string' == typeof this.query) this.query = parseqs.decode(this.query);
	  this.upgrade = false !== opts.upgrade;
	  this.path = (opts.path || '/engine.io').replace(/\/$/, '') + '/';
	  this.forceJSONP = !!opts.forceJSONP;
	  this.jsonp = false !== opts.jsonp;
	  this.forceBase64 = !!opts.forceBase64;
	  this.enablesXDR = !!opts.enablesXDR;
	  this.timestampParam = opts.timestampParam || 't';
	  this.timestampRequests = opts.timestampRequests;
	  this.transports = opts.transports || ['polling', 'websocket'];
	  this.readyState = '';
	  this.writeBuffer = [];
	  this.policyPort = opts.policyPort || 843;
	  this.rememberUpgrade = opts.rememberUpgrade || false;
	  this.binaryType = null;
	  this.onlyBinaryUpgrades = opts.onlyBinaryUpgrades;
	  this.perMessageDeflate = false !== opts.perMessageDeflate ? opts.perMessageDeflate || {} : false;

	  if (true === this.perMessageDeflate) this.perMessageDeflate = {};
	  if (this.perMessageDeflate && null == this.perMessageDeflate.threshold) {
	    this.perMessageDeflate.threshold = 1024;
	  }

	  // SSL options for Node.js client
	  this.pfx = opts.pfx || null;
	  this.key = opts.key || null;
	  this.passphrase = opts.passphrase || null;
	  this.cert = opts.cert || null;
	  this.ca = opts.ca || null;
	  this.ciphers = opts.ciphers || null;
	  this.rejectUnauthorized = opts.rejectUnauthorized === undefined ? true : opts.rejectUnauthorized;

	  // other options for Node.js client
	  var freeGlobal = (typeof global === 'undefined' ? 'undefined' : _typeof(global)) == 'object' && global;
	  if (freeGlobal.global === freeGlobal) {
	    if (opts.extraHeaders && Object.keys(opts.extraHeaders).length > 0) {
	      this.extraHeaders = opts.extraHeaders;
	    }
	  }

	  this.open();
	}

	Socket.priorWebsocketSuccess = false;

	/**
	 * Mix in `Emitter`.
	 */

	Emitter(Socket.prototype);

	/**
	 * Protocol version.
	 *
	 * @api public
	 */

	Socket.protocol = parser.protocol; // this is an int

	/**
	 * Expose deps for legacy compatibility
	 * and standalone browser access.
	 */

	Socket.Socket = Socket;
	Socket.Transport = __webpack_require__(177);
	Socket.transports = __webpack_require__(172);
	Socket.parser = __webpack_require__(178);

	/**
	 * Creates transport of the given type.
	 *
	 * @param {String} transport name
	 * @return {Transport}
	 * @api private
	 */

	Socket.prototype.createTransport = function (name) {
	  debug('creating transport "%s"', name);
	  var query = clone(this.query);

	  // append engine.io protocol identifier
	  query.EIO = parser.protocol;

	  // transport name
	  query.transport = name;

	  // session id if we already have one
	  if (this.id) query.sid = this.id;

	  var transport = new transports[name]({
	    agent: this.agent,
	    hostname: this.hostname,
	    port: this.port,
	    secure: this.secure,
	    path: this.path,
	    query: query,
	    forceJSONP: this.forceJSONP,
	    jsonp: this.jsonp,
	    forceBase64: this.forceBase64,
	    enablesXDR: this.enablesXDR,
	    timestampRequests: this.timestampRequests,
	    timestampParam: this.timestampParam,
	    policyPort: this.policyPort,
	    socket: this,
	    pfx: this.pfx,
	    key: this.key,
	    passphrase: this.passphrase,
	    cert: this.cert,
	    ca: this.ca,
	    ciphers: this.ciphers,
	    rejectUnauthorized: this.rejectUnauthorized,
	    perMessageDeflate: this.perMessageDeflate,
	    extraHeaders: this.extraHeaders
	  });

	  return transport;
	};

	function clone(obj) {
	  var o = {};
	  for (var i in obj) {
	    if (obj.hasOwnProperty(i)) {
	      o[i] = obj[i];
	    }
	  }
	  return o;
	}

	/**
	 * Initializes transport to use and starts probe.
	 *
	 * @api private
	 */
	Socket.prototype.open = function () {
	  var transport;
	  if (this.rememberUpgrade && Socket.priorWebsocketSuccess && this.transports.indexOf('websocket') != -1) {
	    transport = 'websocket';
	  } else if (0 === this.transports.length) {
	    // Emit error on next tick so it can be listened to
	    var self = this;
	    setTimeout(function () {
	      self.emit('error', 'No transports available');
	    }, 0);
	    return;
	  } else {
	    transport = this.transports[0];
	  }
	  this.readyState = 'opening';

	  // Retry with the next transport if the transport is disabled (jsonp: false)
	  try {
	    transport = this.createTransport(transport);
	  } catch (e) {
	    this.transports.shift();
	    this.open();
	    return;
	  }

	  transport.open();
	  this.setTransport(transport);
	};

	/**
	 * Sets the current transport. Disables the existing one (if any).
	 *
	 * @api private
	 */

	Socket.prototype.setTransport = function (transport) {
	  debug('setting transport %s', transport.name);
	  var self = this;

	  if (this.transport) {
	    debug('clearing existing transport %s', this.transport.name);
	    this.transport.removeAllListeners();
	  }

	  // set up transport
	  this.transport = transport;

	  // set up transport listeners
	  transport.on('drain', function () {
	    self.onDrain();
	  }).on('packet', function (packet) {
	    self.onPacket(packet);
	  }).on('error', function (e) {
	    self.onError(e);
	  }).on('close', function () {
	    self.onClose('transport close');
	  });
	};

	/**
	 * Probes a transport.
	 *
	 * @param {String} transport name
	 * @api private
	 */

	Socket.prototype.probe = function (name) {
	  debug('probing transport "%s"', name);
	  var transport = this.createTransport(name, { probe: 1 }),
	      failed = false,
	      self = this;

	  Socket.priorWebsocketSuccess = false;

	  function onTransportOpen() {
	    if (self.onlyBinaryUpgrades) {
	      var upgradeLosesBinary = !this.supportsBinary && self.transport.supportsBinary;
	      failed = failed || upgradeLosesBinary;
	    }
	    if (failed) return;

	    debug('probe transport "%s" opened', name);
	    transport.send([{ type: 'ping', data: 'probe' }]);
	    transport.once('packet', function (msg) {
	      if (failed) return;
	      if ('pong' == msg.type && 'probe' == msg.data) {
	        debug('probe transport "%s" pong', name);
	        self.upgrading = true;
	        self.emit('upgrading', transport);
	        if (!transport) return;
	        Socket.priorWebsocketSuccess = 'websocket' == transport.name;

	        debug('pausing current transport "%s"', self.transport.name);
	        self.transport.pause(function () {
	          if (failed) return;
	          if ('closed' == self.readyState) return;
	          debug('changing transport and sending upgrade packet');

	          cleanup();

	          self.setTransport(transport);
	          transport.send([{ type: 'upgrade' }]);
	          self.emit('upgrade', transport);
	          transport = null;
	          self.upgrading = false;
	          self.flush();
	        });
	      } else {
	        debug('probe transport "%s" failed', name);
	        var err = new Error('probe error');
	        err.transport = transport.name;
	        self.emit('upgradeError', err);
	      }
	    });
	  }

	  function freezeTransport() {
	    if (failed) return;

	    // Any callback called by transport should be ignored since now
	    failed = true;

	    cleanup();

	    transport.close();
	    transport = null;
	  }

	  //Handle any error that happens while probing
	  function onerror(err) {
	    var error = new Error('probe error: ' + err);
	    error.transport = transport.name;

	    freezeTransport();

	    debug('probe transport "%s" failed because of error: %s', name, err);

	    self.emit('upgradeError', error);
	  }

	  function onTransportClose() {
	    onerror("transport closed");
	  }

	  //When the socket is closed while we're probing
	  function onclose() {
	    onerror("socket closed");
	  }

	  //When the socket is upgraded while we're probing
	  function onupgrade(to) {
	    if (transport && to.name != transport.name) {
	      debug('"%s" works - aborting "%s"', to.name, transport.name);
	      freezeTransport();
	    }
	  }

	  //Remove all listeners on the transport and on self
	  function cleanup() {
	    transport.removeListener('open', onTransportOpen);
	    transport.removeListener('error', onerror);
	    transport.removeListener('close', onTransportClose);
	    self.removeListener('close', onclose);
	    self.removeListener('upgrading', onupgrade);
	  }

	  transport.once('open', onTransportOpen);
	  transport.once('error', onerror);
	  transport.once('close', onTransportClose);

	  this.once('close', onclose);
	  this.once('upgrading', onupgrade);

	  transport.open();
	};

	/**
	 * Called when connection is deemed open.
	 *
	 * @api public
	 */

	Socket.prototype.onOpen = function () {
	  debug('socket open');
	  this.readyState = 'open';
	  Socket.priorWebsocketSuccess = 'websocket' == this.transport.name;
	  this.emit('open');
	  this.flush();

	  // we check for `readyState` in case an `open`
	  // listener already closed the socket
	  if ('open' == this.readyState && this.upgrade && this.transport.pause) {
	    debug('starting upgrade probes');
	    for (var i = 0, l = this.upgrades.length; i < l; i++) {
	      this.probe(this.upgrades[i]);
	    }
	  }
	};

	/**
	 * Handles a packet.
	 *
	 * @api private
	 */

	Socket.prototype.onPacket = function (packet) {
	  if ('opening' == this.readyState || 'open' == this.readyState) {
	    debug('socket receive: type "%s", data "%s"', packet.type, packet.data);

	    this.emit('packet', packet);

	    // Socket is live - any packet counts
	    this.emit('heartbeat');

	    switch (packet.type) {
	      case 'open':
	        this.onHandshake(parsejson(packet.data));
	        break;

	      case 'pong':
	        this.setPing();
	        this.emit('pong');
	        break;

	      case 'error':
	        var err = new Error('server error');
	        err.code = packet.data;
	        this.onError(err);
	        break;

	      case 'message':
	        this.emit('data', packet.data);
	        this.emit('message', packet.data);
	        break;
	    }
	  } else {
	    debug('packet received with socket readyState "%s"', this.readyState);
	  }
	};

	/**
	 * Called upon handshake completion.
	 *
	 * @param {Object} handshake obj
	 * @api private
	 */

	Socket.prototype.onHandshake = function (data) {
	  this.emit('handshake', data);
	  this.id = data.sid;
	  this.transport.query.sid = data.sid;
	  this.upgrades = this.filterUpgrades(data.upgrades);
	  this.pingInterval = data.pingInterval;
	  this.pingTimeout = data.pingTimeout;
	  this.onOpen();
	  // In case open handler closes socket
	  if ('closed' == this.readyState) return;
	  this.setPing();

	  // Prolong liveness of socket on heartbeat
	  this.removeListener('heartbeat', this.onHeartbeat);
	  this.on('heartbeat', this.onHeartbeat);
	};

	/**
	 * Resets ping timeout.
	 *
	 * @api private
	 */

	Socket.prototype.onHeartbeat = function (timeout) {
	  clearTimeout(this.pingTimeoutTimer);
	  var self = this;
	  self.pingTimeoutTimer = setTimeout(function () {
	    if ('closed' == self.readyState) return;
	    self.onClose('ping timeout');
	  }, timeout || self.pingInterval + self.pingTimeout);
	};

	/**
	 * Pings server every `this.pingInterval` and expects response
	 * within `this.pingTimeout` or closes connection.
	 *
	 * @api private
	 */

	Socket.prototype.setPing = function () {
	  var self = this;
	  clearTimeout(self.pingIntervalTimer);
	  self.pingIntervalTimer = setTimeout(function () {
	    debug('writing ping packet - expecting pong within %sms', self.pingTimeout);
	    self.ping();
	    self.onHeartbeat(self.pingTimeout);
	  }, self.pingInterval);
	};

	/**
	* Sends a ping packet.
	*
	* @api private
	*/

	Socket.prototype.ping = function () {
	  var self = this;
	  this.sendPacket('ping', function () {
	    self.emit('ping');
	  });
	};

	/**
	 * Called on `drain` event
	 *
	 * @api private
	 */

	Socket.prototype.onDrain = function () {
	  this.writeBuffer.splice(0, this.prevBufferLen);

	  // setting prevBufferLen = 0 is very important
	  // for example, when upgrading, upgrade packet is sent over,
	  // and a nonzero prevBufferLen could cause problems on `drain`
	  this.prevBufferLen = 0;

	  if (0 === this.writeBuffer.length) {
	    this.emit('drain');
	  } else {
	    this.flush();
	  }
	};

	/**
	 * Flush write buffers.
	 *
	 * @api private
	 */

	Socket.prototype.flush = function () {
	  if ('closed' != this.readyState && this.transport.writable && !this.upgrading && this.writeBuffer.length) {
	    debug('flushing %d packets in socket', this.writeBuffer.length);
	    this.transport.send(this.writeBuffer);
	    // keep track of current length of writeBuffer
	    // splice writeBuffer and callbackBuffer on `drain`
	    this.prevBufferLen = this.writeBuffer.length;
	    this.emit('flush');
	  }
	};

	/**
	 * Sends a message.
	 *
	 * @param {String} message.
	 * @param {Function} callback function.
	 * @param {Object} options.
	 * @return {Socket} for chaining.
	 * @api public
	 */

	Socket.prototype.write = Socket.prototype.send = function (msg, options, fn) {
	  this.sendPacket('message', msg, options, fn);
	  return this;
	};

	/**
	 * Sends a packet.
	 *
	 * @param {String} packet type.
	 * @param {String} data.
	 * @param {Object} options.
	 * @param {Function} callback function.
	 * @api private
	 */

	Socket.prototype.sendPacket = function (type, data, options, fn) {
	  if ('function' == typeof data) {
	    fn = data;
	    data = undefined;
	  }

	  if ('function' == typeof options) {
	    fn = options;
	    options = null;
	  }

	  if ('closing' == this.readyState || 'closed' == this.readyState) {
	    return;
	  }

	  options = options || {};
	  options.compress = false !== options.compress;

	  var packet = {
	    type: type,
	    data: data,
	    options: options
	  };
	  this.emit('packetCreate', packet);
	  this.writeBuffer.push(packet);
	  if (fn) this.once('flush', fn);
	  this.flush();
	};

	/**
	 * Closes the connection.
	 *
	 * @api private
	 */

	Socket.prototype.close = function () {
	  if ('opening' == this.readyState || 'open' == this.readyState) {
	    this.readyState = 'closing';

	    var self = this;

	    if (this.writeBuffer.length) {
	      this.once('drain', function () {
	        if (this.upgrading) {
	          waitForUpgrade();
	        } else {
	          close();
	        }
	      });
	    } else if (this.upgrading) {
	      waitForUpgrade();
	    } else {
	      close();
	    }
	  }

	  function close() {
	    self.onClose('forced close');
	    debug('socket closing - telling transport to close');
	    self.transport.close();
	  }

	  function cleanupAndClose() {
	    self.removeListener('upgrade', cleanupAndClose);
	    self.removeListener('upgradeError', cleanupAndClose);
	    close();
	  }

	  function waitForUpgrade() {
	    // wait for upgrade to finish since we can't send packets while pausing a transport
	    self.once('upgrade', cleanupAndClose);
	    self.once('upgradeError', cleanupAndClose);
	  }

	  return this;
	};

	/**
	 * Called upon transport error
	 *
	 * @api private
	 */

	Socket.prototype.onError = function (err) {
	  debug('socket error %j', err);
	  Socket.priorWebsocketSuccess = false;
	  this.emit('error', err);
	  this.onClose('transport error', err);
	};

	/**
	 * Called upon transport close.
	 *
	 * @api private
	 */

	Socket.prototype.onClose = function (reason, desc) {
	  if ('opening' == this.readyState || 'open' == this.readyState || 'closing' == this.readyState) {
	    debug('socket close with reason: "%s"', reason);
	    var self = this;

	    // clear timers
	    clearTimeout(this.pingIntervalTimer);
	    clearTimeout(this.pingTimeoutTimer);

	    // stop event from firing again for transport
	    this.transport.removeAllListeners('close');

	    // ensure transport won't stay open
	    this.transport.close();

	    // ignore further transport communication
	    this.transport.removeAllListeners();

	    // set ready state
	    this.readyState = 'closed';

	    // clear session id
	    this.id = null;

	    // emit close event
	    this.emit('close', reason, desc);

	    // clean buffers after, so users can still
	    // grab the buffers on `close` event
	    self.writeBuffer = [];
	    self.prevBufferLen = 0;
	  }
	};

	/**
	 * Filters upgrades, returning only those matching client transports.
	 *
	 * @param {Array} server upgrades
	 * @api private
	 *
	 */

	Socket.prototype.filterUpgrades = function (upgrades) {
	  var filteredUpgrades = [];
	  for (var i = 0, j = upgrades.length; i < j; i++) {
	    if (~index(this.transports, upgrades[i])) filteredUpgrades.push(upgrades[i]);
	  }
	  return filteredUpgrades;
	};
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 172 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {'use strict';

	/**
	 * Module dependencies
	 */

	var XMLHttpRequest = __webpack_require__(173);
	var XHR = __webpack_require__(175);
	var JSONP = __webpack_require__(195);
	var websocket = __webpack_require__(196);

	/**
	 * Export transports.
	 */

	exports.polling = polling;
	exports.websocket = websocket;

	/**
	 * Polling transport polymorphic constructor.
	 * Decides on xhr vs jsonp based on feature detection.
	 *
	 * @api private
	 */

	function polling(opts) {
	  var xhr;
	  var xd = false;
	  var xs = false;
	  var jsonp = false !== opts.jsonp;

	  if (global.location) {
	    var isSSL = 'https:' == location.protocol;
	    var port = location.port;

	    // some user agents have empty `location.port`
	    if (!port) {
	      port = isSSL ? 443 : 80;
	    }

	    xd = opts.hostname != location.hostname || port != opts.port;
	    xs = opts.secure != isSSL;
	  }

	  opts.xdomain = xd;
	  opts.xscheme = xs;
	  xhr = new XMLHttpRequest(opts);

	  if ('open' in xhr && !opts.forceJSONP) {
	    return new XHR(opts);
	  } else {
	    if (!jsonp) throw new Error('JSONP disabled');
	    return new JSONP(opts);
	  }
	}
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 173 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	// browser shim for xmlhttprequest module
	var hasCORS = __webpack_require__(174);

	module.exports = function (opts) {
	  var xdomain = opts.xdomain;

	  // scheme must be same when usign XDomainRequest
	  // http://blogs.msdn.com/b/ieinternals/archive/2010/05/13/xdomainrequest-restrictions-limitations-and-workarounds.aspx
	  var xscheme = opts.xscheme;

	  // XDomainRequest has a flow of not sending cookie, therefore it should be disabled as a default.
	  // https://github.com/Automattic/engine.io-client/pull/217
	  var enablesXDR = opts.enablesXDR;

	  // XMLHttpRequest can be disabled on IE
	  try {
	    if ('undefined' != typeof XMLHttpRequest && (!xdomain || hasCORS)) {
	      return new XMLHttpRequest();
	    }
	  } catch (e) {}

	  // Use XDomainRequest for IE8 if enablesXDR is true
	  // because loading bar keeps flashing when using jsonp-polling
	  // https://github.com/yujiosaka/socke.io-ie8-loading-example
	  try {
	    if ('undefined' != typeof XDomainRequest && !xscheme && enablesXDR) {
	      return new XDomainRequest();
	    }
	  } catch (e) {}

	  if (!xdomain) {
	    try {
	      return new ActiveXObject('Microsoft.XMLHTTP');
	    } catch (e) {}
	  }
	};

/***/ },
/* 174 */
/***/ function(module, exports) {

	'use strict';

	/**
	 * Module exports.
	 *
	 * Logic borrowed from Modernizr:
	 *
	 *   - https://github.com/Modernizr/Modernizr/blob/master/feature-detects/cors.js
	 */

	try {
	  module.exports = typeof XMLHttpRequest !== 'undefined' && 'withCredentials' in new XMLHttpRequest();
	} catch (err) {
	  // if XMLHttp support is disabled in IE then it will throw
	  // when trying to create
	  module.exports = false;
	}

/***/ },
/* 175 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {'use strict';

	/**
	 * Module requirements.
	 */

	var XMLHttpRequest = __webpack_require__(173);
	var Polling = __webpack_require__(176);
	var Emitter = __webpack_require__(188);
	var inherit = __webpack_require__(190);
	var debug = __webpack_require__(192)('engine.io-client:polling-xhr');

	/**
	 * Module exports.
	 */

	module.exports = XHR;
	module.exports.Request = Request;

	/**
	 * Empty function
	 */

	function empty() {}

	/**
	 * XHR Polling constructor.
	 *
	 * @param {Object} opts
	 * @api public
	 */

	function XHR(opts) {
	  Polling.call(this, opts);

	  if (global.location) {
	    var isSSL = 'https:' == location.protocol;
	    var port = location.port;

	    // some user agents have empty `location.port`
	    if (!port) {
	      port = isSSL ? 443 : 80;
	    }

	    this.xd = opts.hostname != global.location.hostname || port != opts.port;
	    this.xs = opts.secure != isSSL;
	  } else {
	    this.extraHeaders = opts.extraHeaders;
	  }
	}

	/**
	 * Inherits from Polling.
	 */

	inherit(XHR, Polling);

	/**
	 * XHR supports binary
	 */

	XHR.prototype.supportsBinary = true;

	/**
	 * Creates a request.
	 *
	 * @param {String} method
	 * @api private
	 */

	XHR.prototype.request = function (opts) {
	  opts = opts || {};
	  opts.uri = this.uri();
	  opts.xd = this.xd;
	  opts.xs = this.xs;
	  opts.agent = this.agent || false;
	  opts.supportsBinary = this.supportsBinary;
	  opts.enablesXDR = this.enablesXDR;

	  // SSL options for Node.js client
	  opts.pfx = this.pfx;
	  opts.key = this.key;
	  opts.passphrase = this.passphrase;
	  opts.cert = this.cert;
	  opts.ca = this.ca;
	  opts.ciphers = this.ciphers;
	  opts.rejectUnauthorized = this.rejectUnauthorized;

	  // other options for Node.js client
	  opts.extraHeaders = this.extraHeaders;

	  return new Request(opts);
	};

	/**
	 * Sends data.
	 *
	 * @param {String} data to send.
	 * @param {Function} called upon flush.
	 * @api private
	 */

	XHR.prototype.doWrite = function (data, fn) {
	  var isBinary = typeof data !== 'string' && data !== undefined;
	  var req = this.request({ method: 'POST', data: data, isBinary: isBinary });
	  var self = this;
	  req.on('success', fn);
	  req.on('error', function (err) {
	    self.onError('xhr post error', err);
	  });
	  this.sendXhr = req;
	};

	/**
	 * Starts a poll cycle.
	 *
	 * @api private
	 */

	XHR.prototype.doPoll = function () {
	  debug('xhr poll');
	  var req = this.request();
	  var self = this;
	  req.on('data', function (data) {
	    self.onData(data);
	  });
	  req.on('error', function (err) {
	    self.onError('xhr poll error', err);
	  });
	  this.pollXhr = req;
	};

	/**
	 * Request constructor
	 *
	 * @param {Object} options
	 * @api public
	 */

	function Request(opts) {
	  this.method = opts.method || 'GET';
	  this.uri = opts.uri;
	  this.xd = !!opts.xd;
	  this.xs = !!opts.xs;
	  this.async = false !== opts.async;
	  this.data = undefined != opts.data ? opts.data : null;
	  this.agent = opts.agent;
	  this.isBinary = opts.isBinary;
	  this.supportsBinary = opts.supportsBinary;
	  this.enablesXDR = opts.enablesXDR;

	  // SSL options for Node.js client
	  this.pfx = opts.pfx;
	  this.key = opts.key;
	  this.passphrase = opts.passphrase;
	  this.cert = opts.cert;
	  this.ca = opts.ca;
	  this.ciphers = opts.ciphers;
	  this.rejectUnauthorized = opts.rejectUnauthorized;

	  // other options for Node.js client
	  this.extraHeaders = opts.extraHeaders;

	  this.create();
	}

	/**
	 * Mix in `Emitter`.
	 */

	Emitter(Request.prototype);

	/**
	 * Creates the XHR object and sends the request.
	 *
	 * @api private
	 */

	Request.prototype.create = function () {
	  var opts = { agent: this.agent, xdomain: this.xd, xscheme: this.xs, enablesXDR: this.enablesXDR };

	  // SSL options for Node.js client
	  opts.pfx = this.pfx;
	  opts.key = this.key;
	  opts.passphrase = this.passphrase;
	  opts.cert = this.cert;
	  opts.ca = this.ca;
	  opts.ciphers = this.ciphers;
	  opts.rejectUnauthorized = this.rejectUnauthorized;

	  var xhr = this.xhr = new XMLHttpRequest(opts);
	  var self = this;

	  try {
	    debug('xhr open %s: %s', this.method, this.uri);
	    xhr.open(this.method, this.uri, this.async);
	    try {
	      if (this.extraHeaders) {
	        xhr.setDisableHeaderCheck(true);
	        for (var i in this.extraHeaders) {
	          if (this.extraHeaders.hasOwnProperty(i)) {
	            xhr.setRequestHeader(i, this.extraHeaders[i]);
	          }
	        }
	      }
	    } catch (e) {}
	    if (this.supportsBinary) {
	      // This has to be done after open because Firefox is stupid
	      // http://stackoverflow.com/questions/13216903/get-binary-data-with-xmlhttprequest-in-a-firefox-extension
	      xhr.responseType = 'arraybuffer';
	    }

	    if ('POST' == this.method) {
	      try {
	        if (this.isBinary) {
	          xhr.setRequestHeader('Content-type', 'application/octet-stream');
	        } else {
	          xhr.setRequestHeader('Content-type', 'text/plain;charset=UTF-8');
	        }
	      } catch (e) {}
	    }

	    // ie6 check
	    if ('withCredentials' in xhr) {
	      xhr.withCredentials = true;
	    }

	    if (this.hasXDR()) {
	      xhr.onload = function () {
	        self.onLoad();
	      };
	      xhr.onerror = function () {
	        self.onError(xhr.responseText);
	      };
	    } else {
	      xhr.onreadystatechange = function () {
	        if (4 != xhr.readyState) return;
	        if (200 == xhr.status || 1223 == xhr.status) {
	          self.onLoad();
	        } else {
	          // make sure the `error` event handler that's user-set
	          // does not throw in the same tick and gets caught here
	          setTimeout(function () {
	            self.onError(xhr.status);
	          }, 0);
	        }
	      };
	    }

	    debug('xhr data %s', this.data);
	    xhr.send(this.data);
	  } catch (e) {
	    // Need to defer since .create() is called directly fhrom the constructor
	    // and thus the 'error' event can only be only bound *after* this exception
	    // occurs.  Therefore, also, we cannot throw here at all.
	    setTimeout(function () {
	      self.onError(e);
	    }, 0);
	    return;
	  }

	  if (global.document) {
	    this.index = Request.requestsCount++;
	    Request.requests[this.index] = this;
	  }
	};

	/**
	 * Called upon successful response.
	 *
	 * @api private
	 */

	Request.prototype.onSuccess = function () {
	  this.emit('success');
	  this.cleanup();
	};

	/**
	 * Called if we have data.
	 *
	 * @api private
	 */

	Request.prototype.onData = function (data) {
	  this.emit('data', data);
	  this.onSuccess();
	};

	/**
	 * Called upon error.
	 *
	 * @api private
	 */

	Request.prototype.onError = function (err) {
	  this.emit('error', err);
	  this.cleanup(true);
	};

	/**
	 * Cleans up house.
	 *
	 * @api private
	 */

	Request.prototype.cleanup = function (fromError) {
	  if ('undefined' == typeof this.xhr || null === this.xhr) {
	    return;
	  }
	  // xmlhttprequest
	  if (this.hasXDR()) {
	    this.xhr.onload = this.xhr.onerror = empty;
	  } else {
	    this.xhr.onreadystatechange = empty;
	  }

	  if (fromError) {
	    try {
	      this.xhr.abort();
	    } catch (e) {}
	  }

	  if (global.document) {
	    delete Request.requests[this.index];
	  }

	  this.xhr = null;
	};

	/**
	 * Called upon load.
	 *
	 * @api private
	 */

	Request.prototype.onLoad = function () {
	  var data;
	  try {
	    var contentType;
	    try {
	      contentType = this.xhr.getResponseHeader('Content-Type').split(';')[0];
	    } catch (e) {}
	    if (contentType === 'application/octet-stream') {
	      data = this.xhr.response;
	    } else {
	      if (!this.supportsBinary) {
	        data = this.xhr.responseText;
	      } else {
	        try {
	          data = String.fromCharCode.apply(null, new Uint8Array(this.xhr.response));
	        } catch (e) {
	          var ui8Arr = new Uint8Array(this.xhr.response);
	          var dataArray = [];
	          for (var idx = 0, length = ui8Arr.length; idx < length; idx++) {
	            dataArray.push(ui8Arr[idx]);
	          }

	          data = String.fromCharCode.apply(null, dataArray);
	        }
	      }
	    }
	  } catch (e) {
	    this.onError(e);
	  }
	  if (null != data) {
	    this.onData(data);
	  }
	};

	/**
	 * Check if it has XDomainRequest.
	 *
	 * @api private
	 */

	Request.prototype.hasXDR = function () {
	  return 'undefined' !== typeof global.XDomainRequest && !this.xs && this.enablesXDR;
	};

	/**
	 * Aborts the request.
	 *
	 * @api public
	 */

	Request.prototype.abort = function () {
	  this.cleanup();
	};

	/**
	 * Aborts pending requests when unloading the window. This is needed to prevent
	 * memory leaks (e.g. when using IE) and to ensure that no spurious error is
	 * emitted.
	 */

	if (global.document) {
	  Request.requestsCount = 0;
	  Request.requests = {};
	  if (global.attachEvent) {
	    global.attachEvent('onunload', unloadHandler);
	  } else if (global.addEventListener) {
	    global.addEventListener('beforeunload', unloadHandler, false);
	  }
	}

	function unloadHandler() {
	  for (var i in Request.requests) {
	    if (Request.requests.hasOwnProperty(i)) {
	      Request.requests[i].abort();
	    }
	  }
	}
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 176 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	/**
	 * Module dependencies.
	 */

	var Transport = __webpack_require__(177);
	var parseqs = __webpack_require__(189);
	var parser = __webpack_require__(178);
	var inherit = __webpack_require__(190);
	var yeast = __webpack_require__(191);
	var debug = __webpack_require__(192)('engine.io-client:polling');

	/**
	 * Module exports.
	 */

	module.exports = Polling;

	/**
	 * Is XHR2 supported?
	 */

	var hasXHR2 = function () {
	  var XMLHttpRequest = __webpack_require__(173);
	  var xhr = new XMLHttpRequest({ xdomain: false });
	  return null != xhr.responseType;
	}();

	/**
	 * Polling interface.
	 *
	 * @param {Object} opts
	 * @api private
	 */

	function Polling(opts) {
	  var forceBase64 = opts && opts.forceBase64;
	  if (!hasXHR2 || forceBase64) {
	    this.supportsBinary = false;
	  }
	  Transport.call(this, opts);
	}

	/**
	 * Inherits from Transport.
	 */

	inherit(Polling, Transport);

	/**
	 * Transport name.
	 */

	Polling.prototype.name = 'polling';

	/**
	 * Opens the socket (triggers polling). We write a PING message to determine
	 * when the transport is open.
	 *
	 * @api private
	 */

	Polling.prototype.doOpen = function () {
	  this.poll();
	};

	/**
	 * Pauses polling.
	 *
	 * @param {Function} callback upon buffers are flushed and transport is paused
	 * @api private
	 */

	Polling.prototype.pause = function (onPause) {
	  var pending = 0;
	  var self = this;

	  this.readyState = 'pausing';

	  function pause() {
	    debug('paused');
	    self.readyState = 'paused';
	    onPause();
	  }

	  if (this.polling || !this.writable) {
	    var total = 0;

	    if (this.polling) {
	      debug('we are currently polling - waiting to pause');
	      total++;
	      this.once('pollComplete', function () {
	        debug('pre-pause polling complete');
	        --total || pause();
	      });
	    }

	    if (!this.writable) {
	      debug('we are currently writing - waiting to pause');
	      total++;
	      this.once('drain', function () {
	        debug('pre-pause writing complete');
	        --total || pause();
	      });
	    }
	  } else {
	    pause();
	  }
	};

	/**
	 * Starts polling cycle.
	 *
	 * @api public
	 */

	Polling.prototype.poll = function () {
	  debug('polling');
	  this.polling = true;
	  this.doPoll();
	  this.emit('poll');
	};

	/**
	 * Overloads onData to detect payloads.
	 *
	 * @api private
	 */

	Polling.prototype.onData = function (data) {
	  var self = this;
	  debug('polling got data %s', data);
	  var callback = function callback(packet, index, total) {
	    // if its the first message we consider the transport open
	    if ('opening' == self.readyState) {
	      self.onOpen();
	    }

	    // if its a close packet, we close the ongoing requests
	    if ('close' == packet.type) {
	      self.onClose();
	      return false;
	    }

	    // otherwise bypass onData and handle the message
	    self.onPacket(packet);
	  };

	  // decode payload
	  parser.decodePayload(data, this.socket.binaryType, callback);

	  // if an event did not trigger closing
	  if ('closed' != this.readyState) {
	    // if we got data we're not polling
	    this.polling = false;
	    this.emit('pollComplete');

	    if ('open' == this.readyState) {
	      this.poll();
	    } else {
	      debug('ignoring poll - transport state "%s"', this.readyState);
	    }
	  }
	};

	/**
	 * For polling, send a close packet.
	 *
	 * @api private
	 */

	Polling.prototype.doClose = function () {
	  var self = this;

	  function close() {
	    debug('writing close packet');
	    self.write([{ type: 'close' }]);
	  }

	  if ('open' == this.readyState) {
	    debug('transport open - closing');
	    close();
	  } else {
	    // in case we're trying to close while
	    // handshaking is in progress (GH-164)
	    debug('transport not open - deferring close');
	    this.once('open', close);
	  }
	};

	/**
	 * Writes a packets payload.
	 *
	 * @param {Array} data packets
	 * @param {Function} drain callback
	 * @api private
	 */

	Polling.prototype.write = function (packets) {
	  var self = this;
	  this.writable = false;
	  var callbackfn = function callbackfn() {
	    self.writable = true;
	    self.emit('drain');
	  };

	  var self = this;
	  parser.encodePayload(packets, this.supportsBinary, function (data) {
	    self.doWrite(data, callbackfn);
	  });
	};

	/**
	 * Generates uri for connection.
	 *
	 * @api private
	 */

	Polling.prototype.uri = function () {
	  var query = this.query || {};
	  var schema = this.secure ? 'https' : 'http';
	  var port = '';

	  // cache busting is forced
	  if (false !== this.timestampRequests) {
	    query[this.timestampParam] = yeast();
	  }

	  if (!this.supportsBinary && !query.sid) {
	    query.b64 = 1;
	  }

	  query = parseqs.encode(query);

	  // avoid port if default for schema
	  if (this.port && ('https' == schema && this.port != 443 || 'http' == schema && this.port != 80)) {
	    port = ':' + this.port;
	  }

	  // prepend ? to query
	  if (query.length) {
	    query = '?' + query;
	  }

	  var ipv6 = this.hostname.indexOf(':') !== -1;
	  return schema + '://' + (ipv6 ? '[' + this.hostname + ']' : this.hostname) + port + this.path + query;
	};

/***/ },
/* 177 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	/**
	 * Module dependencies.
	 */

	var parser = __webpack_require__(178);
	var Emitter = __webpack_require__(188);

	/**
	 * Module exports.
	 */

	module.exports = Transport;

	/**
	 * Transport abstract constructor.
	 *
	 * @param {Object} options.
	 * @api private
	 */

	function Transport(opts) {
	  this.path = opts.path;
	  this.hostname = opts.hostname;
	  this.port = opts.port;
	  this.secure = opts.secure;
	  this.query = opts.query;
	  this.timestampParam = opts.timestampParam;
	  this.timestampRequests = opts.timestampRequests;
	  this.readyState = '';
	  this.agent = opts.agent || false;
	  this.socket = opts.socket;
	  this.enablesXDR = opts.enablesXDR;

	  // SSL options for Node.js client
	  this.pfx = opts.pfx;
	  this.key = opts.key;
	  this.passphrase = opts.passphrase;
	  this.cert = opts.cert;
	  this.ca = opts.ca;
	  this.ciphers = opts.ciphers;
	  this.rejectUnauthorized = opts.rejectUnauthorized;

	  // other options for Node.js client
	  this.extraHeaders = opts.extraHeaders;
	}

	/**
	 * Mix in `Emitter`.
	 */

	Emitter(Transport.prototype);

	/**
	 * Emits an error.
	 *
	 * @param {String} str
	 * @return {Transport} for chaining
	 * @api public
	 */

	Transport.prototype.onError = function (msg, desc) {
	  var err = new Error(msg);
	  err.type = 'TransportError';
	  err.description = desc;
	  this.emit('error', err);
	  return this;
	};

	/**
	 * Opens the transport.
	 *
	 * @api public
	 */

	Transport.prototype.open = function () {
	  if ('closed' == this.readyState || '' == this.readyState) {
	    this.readyState = 'opening';
	    this.doOpen();
	  }

	  return this;
	};

	/**
	 * Closes the transport.
	 *
	 * @api private
	 */

	Transport.prototype.close = function () {
	  if ('opening' == this.readyState || 'open' == this.readyState) {
	    this.doClose();
	    this.onClose();
	  }

	  return this;
	};

	/**
	 * Sends multiple packets.
	 *
	 * @param {Array} packets
	 * @api private
	 */

	Transport.prototype.send = function (packets) {
	  if ('open' == this.readyState) {
	    this.write(packets);
	  } else {
	    throw new Error('Transport not open');
	  }
	};

	/**
	 * Called upon open
	 *
	 * @api private
	 */

	Transport.prototype.onOpen = function () {
	  this.readyState = 'open';
	  this.writable = true;
	  this.emit('open');
	};

	/**
	 * Called with data.
	 *
	 * @param {String} data
	 * @api private
	 */

	Transport.prototype.onData = function (data) {
	  var packet = parser.decodePacket(data, this.socket.binaryType);
	  this.onPacket(packet);
	};

	/**
	 * Called with a decoded packet.
	 */

	Transport.prototype.onPacket = function (packet) {
	  this.emit('packet', packet);
	};

	/**
	 * Called upon close.
	 *
	 * @api private
	 */

	Transport.prototype.onClose = function () {
	  this.readyState = 'closed';
	  this.emit('close');
	};

/***/ },
/* 178 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {'use strict';

	/**
	 * Module dependencies.
	 */

	var keys = __webpack_require__(179);
	var hasBinary = __webpack_require__(180);
	var sliceBuffer = __webpack_require__(182);
	var base64encoder = __webpack_require__(183);
	var after = __webpack_require__(184);
	var utf8 = __webpack_require__(185);

	/**
	 * Check if we are running an android browser. That requires us to use
	 * ArrayBuffer with polling transports...
	 *
	 * http://ghinda.net/jpeg-blob-ajax-android/
	 */

	var isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

	/**
	 * Check if we are running in PhantomJS.
	 * Uploading a Blob with PhantomJS does not work correctly, as reported here:
	 * https://github.com/ariya/phantomjs/issues/11395
	 * @type boolean
	 */
	var isPhantomJS = typeof navigator !== 'undefined' && /PhantomJS/i.test(navigator.userAgent);

	/**
	 * When true, avoids using Blobs to encode payloads.
	 * @type boolean
	 */
	var dontSendBlobs = isAndroid || isPhantomJS;

	/**
	 * Current protocol version.
	 */

	exports.protocol = 3;

	/**
	 * Packet types.
	 */

	var packets = exports.packets = {
	  open: 0 // non-ws
	  , close: 1 // non-ws
	  , ping: 2,
	  pong: 3,
	  message: 4,
	  upgrade: 5,
	  noop: 6
	};

	var packetslist = keys(packets);

	/**
	 * Premade error packet.
	 */

	var err = { type: 'error', data: 'parser error' };

	/**
	 * Create a blob api even for blob builder when vendor prefixes exist
	 */

	var Blob = __webpack_require__(187);

	/**
	 * Encodes a packet.
	 *
	 *     <packet type id> [ <data> ]
	 *
	 * Example:
	 *
	 *     5hello world
	 *     3
	 *     4
	 *
	 * Binary is encoded in an identical principle
	 *
	 * @api private
	 */

	exports.encodePacket = function (packet, supportsBinary, utf8encode, callback) {
	  if ('function' == typeof supportsBinary) {
	    callback = supportsBinary;
	    supportsBinary = false;
	  }

	  if ('function' == typeof utf8encode) {
	    callback = utf8encode;
	    utf8encode = null;
	  }

	  var data = packet.data === undefined ? undefined : packet.data.buffer || packet.data;

	  if (global.ArrayBuffer && data instanceof ArrayBuffer) {
	    return encodeArrayBuffer(packet, supportsBinary, callback);
	  } else if (Blob && data instanceof global.Blob) {
	    return encodeBlob(packet, supportsBinary, callback);
	  }

	  // might be an object with { base64: true, data: dataAsBase64String }
	  if (data && data.base64) {
	    return encodeBase64Object(packet, callback);
	  }

	  // Sending data as a utf-8 string
	  var encoded = packets[packet.type];

	  // data fragment is optional
	  if (undefined !== packet.data) {
	    encoded += utf8encode ? utf8.encode(String(packet.data)) : String(packet.data);
	  }

	  return callback('' + encoded);
	};

	function encodeBase64Object(packet, callback) {
	  // packet data is an object { base64: true, data: dataAsBase64String }
	  var message = 'b' + exports.packets[packet.type] + packet.data.data;
	  return callback(message);
	}

	/**
	 * Encode packet helpers for binary types
	 */

	function encodeArrayBuffer(packet, supportsBinary, callback) {
	  if (!supportsBinary) {
	    return exports.encodeBase64Packet(packet, callback);
	  }

	  var data = packet.data;
	  var contentArray = new Uint8Array(data);
	  var resultBuffer = new Uint8Array(1 + data.byteLength);

	  resultBuffer[0] = packets[packet.type];
	  for (var i = 0; i < contentArray.length; i++) {
	    resultBuffer[i + 1] = contentArray[i];
	  }

	  return callback(resultBuffer.buffer);
	}

	function encodeBlobAsArrayBuffer(packet, supportsBinary, callback) {
	  if (!supportsBinary) {
	    return exports.encodeBase64Packet(packet, callback);
	  }

	  var fr = new FileReader();
	  fr.onload = function () {
	    packet.data = fr.result;
	    exports.encodePacket(packet, supportsBinary, true, callback);
	  };
	  return fr.readAsArrayBuffer(packet.data);
	}

	function encodeBlob(packet, supportsBinary, callback) {
	  if (!supportsBinary) {
	    return exports.encodeBase64Packet(packet, callback);
	  }

	  if (dontSendBlobs) {
	    return encodeBlobAsArrayBuffer(packet, supportsBinary, callback);
	  }

	  var length = new Uint8Array(1);
	  length[0] = packets[packet.type];
	  var blob = new Blob([length.buffer, packet.data]);

	  return callback(blob);
	}

	/**
	 * Encodes a packet with binary data in a base64 string
	 *
	 * @param {Object} packet, has `type` and `data`
	 * @return {String} base64 encoded message
	 */

	exports.encodeBase64Packet = function (packet, callback) {
	  var message = 'b' + exports.packets[packet.type];
	  if (Blob && packet.data instanceof global.Blob) {
	    var fr = new FileReader();
	    fr.onload = function () {
	      var b64 = fr.result.split(',')[1];
	      callback(message + b64);
	    };
	    return fr.readAsDataURL(packet.data);
	  }

	  var b64data;
	  try {
	    b64data = String.fromCharCode.apply(null, new Uint8Array(packet.data));
	  } catch (e) {
	    // iPhone Safari doesn't let you apply with typed arrays
	    var typed = new Uint8Array(packet.data);
	    var basic = new Array(typed.length);
	    for (var i = 0; i < typed.length; i++) {
	      basic[i] = typed[i];
	    }
	    b64data = String.fromCharCode.apply(null, basic);
	  }
	  message += global.btoa(b64data);
	  return callback(message);
	};

	/**
	 * Decodes a packet. Changes format to Blob if requested.
	 *
	 * @return {Object} with `type` and `data` (if any)
	 * @api private
	 */

	exports.decodePacket = function (data, binaryType, utf8decode) {
	  // String data
	  if (typeof data == 'string' || data === undefined) {
	    if (data.charAt(0) == 'b') {
	      return exports.decodeBase64Packet(data.substr(1), binaryType);
	    }

	    if (utf8decode) {
	      try {
	        data = utf8.decode(data);
	      } catch (e) {
	        return err;
	      }
	    }
	    var type = data.charAt(0);

	    if (Number(type) != type || !packetslist[type]) {
	      return err;
	    }

	    if (data.length > 1) {
	      return { type: packetslist[type], data: data.substring(1) };
	    } else {
	      return { type: packetslist[type] };
	    }
	  }

	  var asArray = new Uint8Array(data);
	  var type = asArray[0];
	  var rest = sliceBuffer(data, 1);
	  if (Blob && binaryType === 'blob') {
	    rest = new Blob([rest]);
	  }
	  return { type: packetslist[type], data: rest };
	};

	/**
	 * Decodes a packet encoded in a base64 string
	 *
	 * @param {String} base64 encoded message
	 * @return {Object} with `type` and `data` (if any)
	 */

	exports.decodeBase64Packet = function (msg, binaryType) {
	  var type = packetslist[msg.charAt(0)];
	  if (!global.ArrayBuffer) {
	    return { type: type, data: { base64: true, data: msg.substr(1) } };
	  }

	  var data = base64encoder.decode(msg.substr(1));

	  if (binaryType === 'blob' && Blob) {
	    data = new Blob([data]);
	  }

	  return { type: type, data: data };
	};

	/**
	 * Encodes multiple messages (payload).
	 *
	 *     <length>:data
	 *
	 * Example:
	 *
	 *     11:hello world2:hi
	 *
	 * If any contents are binary, they will be encoded as base64 strings. Base64
	 * encoded strings are marked with a b before the length specifier
	 *
	 * @param {Array} packets
	 * @api private
	 */

	exports.encodePayload = function (packets, supportsBinary, callback) {
	  if (typeof supportsBinary == 'function') {
	    callback = supportsBinary;
	    supportsBinary = null;
	  }

	  var isBinary = hasBinary(packets);

	  if (supportsBinary && isBinary) {
	    if (Blob && !dontSendBlobs) {
	      return exports.encodePayloadAsBlob(packets, callback);
	    }

	    return exports.encodePayloadAsArrayBuffer(packets, callback);
	  }

	  if (!packets.length) {
	    return callback('0:');
	  }

	  function setLengthHeader(message) {
	    return message.length + ':' + message;
	  }

	  function encodeOne(packet, doneCallback) {
	    exports.encodePacket(packet, !isBinary ? false : supportsBinary, true, function (message) {
	      doneCallback(null, setLengthHeader(message));
	    });
	  }

	  map(packets, encodeOne, function (err, results) {
	    return callback(results.join(''));
	  });
	};

	/**
	 * Async array map using after
	 */

	function map(ary, each, done) {
	  var result = new Array(ary.length);
	  var next = after(ary.length, done);

	  var eachWithIndex = function eachWithIndex(i, el, cb) {
	    each(el, function (error, msg) {
	      result[i] = msg;
	      cb(error, result);
	    });
	  };

	  for (var i = 0; i < ary.length; i++) {
	    eachWithIndex(i, ary[i], next);
	  }
	}

	/*
	 * Decodes data when a payload is maybe expected. Possible binary contents are
	 * decoded from their base64 representation
	 *
	 * @param {String} data, callback method
	 * @api public
	 */

	exports.decodePayload = function (data, binaryType, callback) {
	  if (typeof data != 'string') {
	    return exports.decodePayloadAsBinary(data, binaryType, callback);
	  }

	  if (typeof binaryType === 'function') {
	    callback = binaryType;
	    binaryType = null;
	  }

	  var packet;
	  if (data == '') {
	    // parser error - ignoring payload
	    return callback(err, 0, 1);
	  }

	  var length = '',
	      n,
	      msg;

	  for (var i = 0, l = data.length; i < l; i++) {
	    var chr = data.charAt(i);

	    if (':' != chr) {
	      length += chr;
	    } else {
	      if ('' == length || length != (n = Number(length))) {
	        // parser error - ignoring payload
	        return callback(err, 0, 1);
	      }

	      msg = data.substr(i + 1, n);

	      if (length != msg.length) {
	        // parser error - ignoring payload
	        return callback(err, 0, 1);
	      }

	      if (msg.length) {
	        packet = exports.decodePacket(msg, binaryType, true);

	        if (err.type == packet.type && err.data == packet.data) {
	          // parser error in individual packet - ignoring payload
	          return callback(err, 0, 1);
	        }

	        var ret = callback(packet, i + n, l);
	        if (false === ret) return;
	      }

	      // advance cursor
	      i += n;
	      length = '';
	    }
	  }

	  if (length != '') {
	    // parser error - ignoring payload
	    return callback(err, 0, 1);
	  }
	};

	/**
	 * Encodes multiple messages (payload) as binary.
	 *
	 * <1 = binary, 0 = string><number from 0-9><number from 0-9>[...]<number
	 * 255><data>
	 *
	 * Example:
	 * 1 3 255 1 2 3, if the binary contents are interpreted as 8 bit integers
	 *
	 * @param {Array} packets
	 * @return {ArrayBuffer} encoded payload
	 * @api private
	 */

	exports.encodePayloadAsArrayBuffer = function (packets, callback) {
	  if (!packets.length) {
	    return callback(new ArrayBuffer(0));
	  }

	  function encodeOne(packet, doneCallback) {
	    exports.encodePacket(packet, true, true, function (data) {
	      return doneCallback(null, data);
	    });
	  }

	  map(packets, encodeOne, function (err, encodedPackets) {
	    var totalLength = encodedPackets.reduce(function (acc, p) {
	      var len;
	      if (typeof p === 'string') {
	        len = p.length;
	      } else {
	        len = p.byteLength;
	      }
	      return acc + len.toString().length + len + 2; // string/binary identifier + separator = 2
	    }, 0);

	    var resultArray = new Uint8Array(totalLength);

	    var bufferIndex = 0;
	    encodedPackets.forEach(function (p) {
	      var isString = typeof p === 'string';
	      var ab = p;
	      if (isString) {
	        var view = new Uint8Array(p.length);
	        for (var i = 0; i < p.length; i++) {
	          view[i] = p.charCodeAt(i);
	        }
	        ab = view.buffer;
	      }

	      if (isString) {
	        // not true binary
	        resultArray[bufferIndex++] = 0;
	      } else {
	        // true binary
	        resultArray[bufferIndex++] = 1;
	      }

	      var lenStr = ab.byteLength.toString();
	      for (var i = 0; i < lenStr.length; i++) {
	        resultArray[bufferIndex++] = parseInt(lenStr[i]);
	      }
	      resultArray[bufferIndex++] = 255;

	      var view = new Uint8Array(ab);
	      for (var i = 0; i < view.length; i++) {
	        resultArray[bufferIndex++] = view[i];
	      }
	    });

	    return callback(resultArray.buffer);
	  });
	};

	/**
	 * Encode as Blob
	 */

	exports.encodePayloadAsBlob = function (packets, callback) {
	  function encodeOne(packet, doneCallback) {
	    exports.encodePacket(packet, true, true, function (encoded) {
	      var binaryIdentifier = new Uint8Array(1);
	      binaryIdentifier[0] = 1;
	      if (typeof encoded === 'string') {
	        var view = new Uint8Array(encoded.length);
	        for (var i = 0; i < encoded.length; i++) {
	          view[i] = encoded.charCodeAt(i);
	        }
	        encoded = view.buffer;
	        binaryIdentifier[0] = 0;
	      }

	      var len = encoded instanceof ArrayBuffer ? encoded.byteLength : encoded.size;

	      var lenStr = len.toString();
	      var lengthAry = new Uint8Array(lenStr.length + 1);
	      for (var i = 0; i < lenStr.length; i++) {
	        lengthAry[i] = parseInt(lenStr[i]);
	      }
	      lengthAry[lenStr.length] = 255;

	      if (Blob) {
	        var blob = new Blob([binaryIdentifier.buffer, lengthAry.buffer, encoded]);
	        doneCallback(null, blob);
	      }
	    });
	  }

	  map(packets, encodeOne, function (err, results) {
	    return callback(new Blob(results));
	  });
	};

	/*
	 * Decodes data when a payload is maybe expected. Strings are decoded by
	 * interpreting each byte as a key code for entries marked to start with 0. See
	 * description of encodePayloadAsBinary
	 *
	 * @param {ArrayBuffer} data, callback method
	 * @api public
	 */

	exports.decodePayloadAsBinary = function (data, binaryType, callback) {
	  if (typeof binaryType === 'function') {
	    callback = binaryType;
	    binaryType = null;
	  }

	  var bufferTail = data;
	  var buffers = [];

	  var numberTooLong = false;
	  while (bufferTail.byteLength > 0) {
	    var tailArray = new Uint8Array(bufferTail);
	    var isString = tailArray[0] === 0;
	    var msgLength = '';

	    for (var i = 1;; i++) {
	      if (tailArray[i] == 255) break;

	      if (msgLength.length > 310) {
	        numberTooLong = true;
	        break;
	      }

	      msgLength += tailArray[i];
	    }

	    if (numberTooLong) return callback(err, 0, 1);

	    bufferTail = sliceBuffer(bufferTail, 2 + msgLength.length);
	    msgLength = parseInt(msgLength);

	    var msg = sliceBuffer(bufferTail, 0, msgLength);
	    if (isString) {
	      try {
	        msg = String.fromCharCode.apply(null, new Uint8Array(msg));
	      } catch (e) {
	        // iPhone Safari doesn't let you apply to typed arrays
	        var typed = new Uint8Array(msg);
	        msg = '';
	        for (var i = 0; i < typed.length; i++) {
	          msg += String.fromCharCode(typed[i]);
	        }
	      }
	    }

	    buffers.push(msg);
	    bufferTail = sliceBuffer(bufferTail, msgLength);
	  }

	  var total = buffers.length;
	  buffers.forEach(function (buffer, i) {
	    callback(exports.decodePacket(buffer, binaryType, true), i, total);
	  });
	};
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 179 */
/***/ function(module, exports) {

	"use strict";

	/**
	 * Gets the keys for an object.
	 *
	 * @return {Array} keys
	 * @api private
	 */

	module.exports = Object.keys || function keys(obj) {
	  var arr = [];
	  var has = Object.prototype.hasOwnProperty;

	  for (var i in obj) {
	    if (has.call(obj, i)) {
	      arr.push(i);
	    }
	  }
	  return arr;
	};

/***/ },
/* 180 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

	/*
	 * Module requirements.
	 */

	var isArray = __webpack_require__(181);

	/**
	 * Module exports.
	 */

	module.exports = hasBinary;

	/**
	 * Checks for binary data.
	 *
	 * Right now only Buffer and ArrayBuffer are supported..
	 *
	 * @param {Object} anything
	 * @api public
	 */

	function hasBinary(data) {

	  function _hasBinary(obj) {
	    if (!obj) return false;

	    if (global.Buffer && global.Buffer.isBuffer(obj) || global.ArrayBuffer && obj instanceof ArrayBuffer || global.Blob && obj instanceof Blob || global.File && obj instanceof File) {
	      return true;
	    }

	    if (isArray(obj)) {
	      for (var i = 0; i < obj.length; i++) {
	        if (_hasBinary(obj[i])) {
	          return true;
	        }
	      }
	    } else if (obj && 'object' == (typeof obj === 'undefined' ? 'undefined' : _typeof(obj))) {
	      if (obj.toJSON) {
	        obj = obj.toJSON();
	      }

	      for (var key in obj) {
	        if (Object.prototype.hasOwnProperty.call(obj, key) && _hasBinary(obj[key])) {
	          return true;
	        }
	      }
	    }

	    return false;
	  }

	  return _hasBinary(data);
	}
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 181 */
/***/ function(module, exports) {

	'use strict';

	module.exports = Array.isArray || function (arr) {
	  return Object.prototype.toString.call(arr) == '[object Array]';
	};

/***/ },
/* 182 */
/***/ function(module, exports) {

	"use strict";

	/**
	 * An abstraction for slicing an arraybuffer even when
	 * ArrayBuffer.prototype.slice is not supported
	 *
	 * @api public
	 */

	module.exports = function (arraybuffer, start, end) {
	  var bytes = arraybuffer.byteLength;
	  start = start || 0;
	  end = end || bytes;

	  if (arraybuffer.slice) {
	    return arraybuffer.slice(start, end);
	  }

	  if (start < 0) {
	    start += bytes;
	  }
	  if (end < 0) {
	    end += bytes;
	  }
	  if (end > bytes) {
	    end = bytes;
	  }

	  if (start >= bytes || start >= end || bytes === 0) {
	    return new ArrayBuffer(0);
	  }

	  var abv = new Uint8Array(arraybuffer);
	  var result = new Uint8Array(end - start);
	  for (var i = start, ii = 0; i < end; i++, ii++) {
	    result[ii] = abv[i];
	  }
	  return result.buffer;
	};

/***/ },
/* 183 */
/***/ function(module, exports) {

	"use strict";

	/*
	 * base64-arraybuffer
	 * https://github.com/niklasvh/base64-arraybuffer
	 *
	 * Copyright (c) 2012 Niklas von Hertzen
	 * Licensed under the MIT license.
	 */
	(function (chars) {
	  "use strict";

	  exports.encode = function (arraybuffer) {
	    var bytes = new Uint8Array(arraybuffer),
	        i,
	        len = bytes.length,
	        base64 = "";

	    for (i = 0; i < len; i += 3) {
	      base64 += chars[bytes[i] >> 2];
	      base64 += chars[(bytes[i] & 3) << 4 | bytes[i + 1] >> 4];
	      base64 += chars[(bytes[i + 1] & 15) << 2 | bytes[i + 2] >> 6];
	      base64 += chars[bytes[i + 2] & 63];
	    }

	    if (len % 3 === 2) {
	      base64 = base64.substring(0, base64.length - 1) + "=";
	    } else if (len % 3 === 1) {
	      base64 = base64.substring(0, base64.length - 2) + "==";
	    }

	    return base64;
	  };

	  exports.decode = function (base64) {
	    var bufferLength = base64.length * 0.75,
	        len = base64.length,
	        i,
	        p = 0,
	        encoded1,
	        encoded2,
	        encoded3,
	        encoded4;

	    if (base64[base64.length - 1] === "=") {
	      bufferLength--;
	      if (base64[base64.length - 2] === "=") {
	        bufferLength--;
	      }
	    }

	    var arraybuffer = new ArrayBuffer(bufferLength),
	        bytes = new Uint8Array(arraybuffer);

	    for (i = 0; i < len; i += 4) {
	      encoded1 = chars.indexOf(base64[i]);
	      encoded2 = chars.indexOf(base64[i + 1]);
	      encoded3 = chars.indexOf(base64[i + 2]);
	      encoded4 = chars.indexOf(base64[i + 3]);

	      bytes[p++] = encoded1 << 2 | encoded2 >> 4;
	      bytes[p++] = (encoded2 & 15) << 4 | encoded3 >> 2;
	      bytes[p++] = (encoded3 & 3) << 6 | encoded4 & 63;
	    }

	    return arraybuffer;
	  };
	})("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");

/***/ },
/* 184 */
/***/ function(module, exports) {

	'use strict';

	module.exports = after;

	function after(count, callback, err_cb) {
	    var bail = false;
	    err_cb = err_cb || noop;
	    proxy.count = count;

	    return count === 0 ? callback() : proxy;

	    function proxy(err, result) {
	        if (proxy.count <= 0) {
	            throw new Error('after called too many times');
	        }
	        --proxy.count;

	        // after first error, rest are passed to err_cb
	        if (err) {
	            bail = true;
	            callback(err);
	            // future error callbacks will go to error handler
	            callback = err_cb;
	        } else if (proxy.count === 0 && !bail) {
	            callback(null, result);
	        }
	    }
	}

	function noop() {}

/***/ },
/* 185 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(module, global) {'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

	/*! https://mths.be/utf8js v2.0.0 by @mathias */
	;(function (root) {

		// Detect free variables `exports`
		var freeExports = ( false ? 'undefined' : _typeof(exports)) == 'object' && exports;

		// Detect free variable `module`
		var freeModule = ( false ? 'undefined' : _typeof(module)) == 'object' && module && module.exports == freeExports && module;

		// Detect free variable `global`, from Node.js or Browserified code,
		// and use it as `root`
		var freeGlobal = (typeof global === 'undefined' ? 'undefined' : _typeof(global)) == 'object' && global;
		if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
			root = freeGlobal;
		}

		/*--------------------------------------------------------------------------*/

		var stringFromCharCode = String.fromCharCode;

		// Taken from https://mths.be/punycode
		function ucs2decode(string) {
			var output = [];
			var counter = 0;
			var length = string.length;
			var value;
			var extra;
			while (counter < length) {
				value = string.charCodeAt(counter++);
				if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
					// high surrogate, and there is a next character
					extra = string.charCodeAt(counter++);
					if ((extra & 0xFC00) == 0xDC00) {
						// low surrogate
						output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
					} else {
						// unmatched surrogate; only append this code unit, in case the next
						// code unit is the high surrogate of a surrogate pair
						output.push(value);
						counter--;
					}
				} else {
					output.push(value);
				}
			}
			return output;
		}

		// Taken from https://mths.be/punycode
		function ucs2encode(array) {
			var length = array.length;
			var index = -1;
			var value;
			var output = '';
			while (++index < length) {
				value = array[index];
				if (value > 0xFFFF) {
					value -= 0x10000;
					output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
					value = 0xDC00 | value & 0x3FF;
				}
				output += stringFromCharCode(value);
			}
			return output;
		}

		function checkScalarValue(codePoint) {
			if (codePoint >= 0xD800 && codePoint <= 0xDFFF) {
				throw Error('Lone surrogate U+' + codePoint.toString(16).toUpperCase() + ' is not a scalar value');
			}
		}
		/*--------------------------------------------------------------------------*/

		function createByte(codePoint, shift) {
			return stringFromCharCode(codePoint >> shift & 0x3F | 0x80);
		}

		function encodeCodePoint(codePoint) {
			if ((codePoint & 0xFFFFFF80) == 0) {
				// 1-byte sequence
				return stringFromCharCode(codePoint);
			}
			var symbol = '';
			if ((codePoint & 0xFFFFF800) == 0) {
				// 2-byte sequence
				symbol = stringFromCharCode(codePoint >> 6 & 0x1F | 0xC0);
			} else if ((codePoint & 0xFFFF0000) == 0) {
				// 3-byte sequence
				checkScalarValue(codePoint);
				symbol = stringFromCharCode(codePoint >> 12 & 0x0F | 0xE0);
				symbol += createByte(codePoint, 6);
			} else if ((codePoint & 0xFFE00000) == 0) {
				// 4-byte sequence
				symbol = stringFromCharCode(codePoint >> 18 & 0x07 | 0xF0);
				symbol += createByte(codePoint, 12);
				symbol += createByte(codePoint, 6);
			}
			symbol += stringFromCharCode(codePoint & 0x3F | 0x80);
			return symbol;
		}

		function utf8encode(string) {
			var codePoints = ucs2decode(string);
			var length = codePoints.length;
			var index = -1;
			var codePoint;
			var byteString = '';
			while (++index < length) {
				codePoint = codePoints[index];
				byteString += encodeCodePoint(codePoint);
			}
			return byteString;
		}

		/*--------------------------------------------------------------------------*/

		function readContinuationByte() {
			if (byteIndex >= byteCount) {
				throw Error('Invalid byte index');
			}

			var continuationByte = byteArray[byteIndex] & 0xFF;
			byteIndex++;

			if ((continuationByte & 0xC0) == 0x80) {
				return continuationByte & 0x3F;
			}

			// If we end up here, it’s not a continuation byte
			throw Error('Invalid continuation byte');
		}

		function decodeSymbol() {
			var byte1;
			var byte2;
			var byte3;
			var byte4;
			var codePoint;

			if (byteIndex > byteCount) {
				throw Error('Invalid byte index');
			}

			if (byteIndex == byteCount) {
				return false;
			}

			// Read first byte
			byte1 = byteArray[byteIndex] & 0xFF;
			byteIndex++;

			// 1-byte sequence (no continuation bytes)
			if ((byte1 & 0x80) == 0) {
				return byte1;
			}

			// 2-byte sequence
			if ((byte1 & 0xE0) == 0xC0) {
				var byte2 = readContinuationByte();
				codePoint = (byte1 & 0x1F) << 6 | byte2;
				if (codePoint >= 0x80) {
					return codePoint;
				} else {
					throw Error('Invalid continuation byte');
				}
			}

			// 3-byte sequence (may include unpaired surrogates)
			if ((byte1 & 0xF0) == 0xE0) {
				byte2 = readContinuationByte();
				byte3 = readContinuationByte();
				codePoint = (byte1 & 0x0F) << 12 | byte2 << 6 | byte3;
				if (codePoint >= 0x0800) {
					checkScalarValue(codePoint);
					return codePoint;
				} else {
					throw Error('Invalid continuation byte');
				}
			}

			// 4-byte sequence
			if ((byte1 & 0xF8) == 0xF0) {
				byte2 = readContinuationByte();
				byte3 = readContinuationByte();
				byte4 = readContinuationByte();
				codePoint = (byte1 & 0x0F) << 0x12 | byte2 << 0x0C | byte3 << 0x06 | byte4;
				if (codePoint >= 0x010000 && codePoint <= 0x10FFFF) {
					return codePoint;
				}
			}

			throw Error('Invalid UTF-8 detected');
		}

		var byteArray;
		var byteCount;
		var byteIndex;
		function utf8decode(byteString) {
			byteArray = ucs2decode(byteString);
			byteCount = byteArray.length;
			byteIndex = 0;
			var codePoints = [];
			var tmp;
			while ((tmp = decodeSymbol()) !== false) {
				codePoints.push(tmp);
			}
			return ucs2encode(codePoints);
		}

		/*--------------------------------------------------------------------------*/

		var utf8 = {
			'version': '2.0.0',
			'encode': utf8encode,
			'decode': utf8decode
		};

		// Some AMD build optimizers, like r.js, check for specific condition patterns
		// like the following:
		if ("function" == 'function' && _typeof(__webpack_require__(186)) == 'object' && __webpack_require__(186)) {
			!(__WEBPACK_AMD_DEFINE_RESULT__ = function () {
				return utf8;
			}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
		} else if (freeExports && !freeExports.nodeType) {
			if (freeModule) {
				// in Node.js or RingoJS v0.8.0+
				freeModule.exports = utf8;
			} else {
				// in Narwhal or RingoJS v0.7.0-
				var object = {};
				var hasOwnProperty = object.hasOwnProperty;
				for (var key in utf8) {
					hasOwnProperty.call(utf8, key) && (freeExports[key] = utf8[key]);
				}
			}
		} else {
			// in Rhino or a web browser
			root.utf8 = utf8;
		}
	})(undefined);
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4)(module), (function() { return this; }())))

/***/ },
/* 186 */
/***/ function(module, exports) {

	/* WEBPACK VAR INJECTION */(function(__webpack_amd_options__) {module.exports = __webpack_amd_options__;

	/* WEBPACK VAR INJECTION */}.call(exports, {}))

/***/ },
/* 187 */
/***/ function(module, exports) {

	/* WEBPACK VAR INJECTION */(function(global) {'use strict';

	/**
	 * Create a blob builder even when vendor prefixes exist
	 */

	var BlobBuilder = global.BlobBuilder || global.WebKitBlobBuilder || global.MSBlobBuilder || global.MozBlobBuilder;

	/**
	 * Check if Blob constructor is supported
	 */

	var blobSupported = function () {
	  try {
	    var a = new Blob(['hi']);
	    return a.size === 2;
	  } catch (e) {
	    return false;
	  }
	}();

	/**
	 * Check if Blob constructor supports ArrayBufferViews
	 * Fails in Safari 6, so we need to map to ArrayBuffers there.
	 */

	var blobSupportsArrayBufferView = blobSupported && function () {
	  try {
	    var b = new Blob([new Uint8Array([1, 2])]);
	    return b.size === 2;
	  } catch (e) {
	    return false;
	  }
	}();

	/**
	 * Check if BlobBuilder is supported
	 */

	var blobBuilderSupported = BlobBuilder && BlobBuilder.prototype.append && BlobBuilder.prototype.getBlob;

	/**
	 * Helper function that maps ArrayBufferViews to ArrayBuffers
	 * Used by BlobBuilder constructor and old browsers that didn't
	 * support it in the Blob constructor.
	 */

	function mapArrayBufferViews(ary) {
	  for (var i = 0; i < ary.length; i++) {
	    var chunk = ary[i];
	    if (chunk.buffer instanceof ArrayBuffer) {
	      var buf = chunk.buffer;

	      // if this is a subarray, make a copy so we only
	      // include the subarray region from the underlying buffer
	      if (chunk.byteLength !== buf.byteLength) {
	        var copy = new Uint8Array(chunk.byteLength);
	        copy.set(new Uint8Array(buf, chunk.byteOffset, chunk.byteLength));
	        buf = copy.buffer;
	      }

	      ary[i] = buf;
	    }
	  }
	}

	function BlobBuilderConstructor(ary, options) {
	  options = options || {};

	  var bb = new BlobBuilder();
	  mapArrayBufferViews(ary);

	  for (var i = 0; i < ary.length; i++) {
	    bb.append(ary[i]);
	  }

	  return options.type ? bb.getBlob(options.type) : bb.getBlob();
	};

	function BlobConstructor(ary, options) {
	  mapArrayBufferViews(ary);
	  return new Blob(ary, options || {});
	};

	module.exports = function () {
	  if (blobSupported) {
	    return blobSupportsArrayBufferView ? global.Blob : BlobConstructor;
	  } else if (blobBuilderSupported) {
	    return BlobBuilderConstructor;
	  } else {
	    return undefined;
	  }
	}();
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 188 */
/***/ function(module, exports) {

	"use strict";

	/**
	 * Expose `Emitter`.
	 */

	module.exports = Emitter;

	/**
	 * Initialize a new `Emitter`.
	 *
	 * @api public
	 */

	function Emitter(obj) {
	  if (obj) return mixin(obj);
	};

	/**
	 * Mixin the emitter properties.
	 *
	 * @param {Object} obj
	 * @return {Object}
	 * @api private
	 */

	function mixin(obj) {
	  for (var key in Emitter.prototype) {
	    obj[key] = Emitter.prototype[key];
	  }
	  return obj;
	}

	/**
	 * Listen on the given `event` with `fn`.
	 *
	 * @param {String} event
	 * @param {Function} fn
	 * @return {Emitter}
	 * @api public
	 */

	Emitter.prototype.on = Emitter.prototype.addEventListener = function (event, fn) {
	  this._callbacks = this._callbacks || {};
	  (this._callbacks[event] = this._callbacks[event] || []).push(fn);
	  return this;
	};

	/**
	 * Adds an `event` listener that will be invoked a single
	 * time then automatically removed.
	 *
	 * @param {String} event
	 * @param {Function} fn
	 * @return {Emitter}
	 * @api public
	 */

	Emitter.prototype.once = function (event, fn) {
	  var self = this;
	  this._callbacks = this._callbacks || {};

	  function on() {
	    self.off(event, on);
	    fn.apply(this, arguments);
	  }

	  on.fn = fn;
	  this.on(event, on);
	  return this;
	};

	/**
	 * Remove the given callback for `event` or all
	 * registered callbacks.
	 *
	 * @param {String} event
	 * @param {Function} fn
	 * @return {Emitter}
	 * @api public
	 */

	Emitter.prototype.off = Emitter.prototype.removeListener = Emitter.prototype.removeAllListeners = Emitter.prototype.removeEventListener = function (event, fn) {
	  this._callbacks = this._callbacks || {};

	  // all
	  if (0 == arguments.length) {
	    this._callbacks = {};
	    return this;
	  }

	  // specific event
	  var callbacks = this._callbacks[event];
	  if (!callbacks) return this;

	  // remove all handlers
	  if (1 == arguments.length) {
	    delete this._callbacks[event];
	    return this;
	  }

	  // remove specific handler
	  var cb;
	  for (var i = 0; i < callbacks.length; i++) {
	    cb = callbacks[i];
	    if (cb === fn || cb.fn === fn) {
	      callbacks.splice(i, 1);
	      break;
	    }
	  }
	  return this;
	};

	/**
	 * Emit `event` with the given args.
	 *
	 * @param {String} event
	 * @param {Mixed} ...
	 * @return {Emitter}
	 */

	Emitter.prototype.emit = function (event) {
	  this._callbacks = this._callbacks || {};
	  var args = [].slice.call(arguments, 1),
	      callbacks = this._callbacks[event];

	  if (callbacks) {
	    callbacks = callbacks.slice(0);
	    for (var i = 0, len = callbacks.length; i < len; ++i) {
	      callbacks[i].apply(this, args);
	    }
	  }

	  return this;
	};

	/**
	 * Return array of callbacks for `event`.
	 *
	 * @param {String} event
	 * @return {Array}
	 * @api public
	 */

	Emitter.prototype.listeners = function (event) {
	  this._callbacks = this._callbacks || {};
	  return this._callbacks[event] || [];
	};

	/**
	 * Check if this emitter has `event` handlers.
	 *
	 * @param {String} event
	 * @return {Boolean}
	 * @api public
	 */

	Emitter.prototype.hasListeners = function (event) {
	  return !!this.listeners(event).length;
	};

/***/ },
/* 189 */
/***/ function(module, exports) {

	'use strict';

	/**
	 * Compiles a querystring
	 * Returns string representation of the object
	 *
	 * @param {Object}
	 * @api private
	 */

	exports.encode = function (obj) {
	  var str = '';

	  for (var i in obj) {
	    if (obj.hasOwnProperty(i)) {
	      if (str.length) str += '&';
	      str += encodeURIComponent(i) + '=' + encodeURIComponent(obj[i]);
	    }
	  }

	  return str;
	};

	/**
	 * Parses a simple querystring into an object
	 *
	 * @param {String} qs
	 * @api private
	 */

	exports.decode = function (qs) {
	  var qry = {};
	  var pairs = qs.split('&');
	  for (var i = 0, l = pairs.length; i < l; i++) {
	    var pair = pairs[i].split('=');
	    qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
	  }
	  return qry;
	};

/***/ },
/* 190 */
/***/ function(module, exports) {

	"use strict";

	module.exports = function (a, b) {
	  var fn = function fn() {};
	  fn.prototype = b.prototype;
	  a.prototype = new fn();
	  a.prototype.constructor = a;
	};

/***/ },
/* 191 */
/***/ function(module, exports) {

	'use strict';

	var alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'.split(''),
	    length = 64,
	    map = {},
	    seed = 0,
	    i = 0,
	    prev;

	/**
	 * Return a string representing the specified number.
	 *
	 * @param {Number} num The number to convert.
	 * @returns {String} The string representation of the number.
	 * @api public
	 */
	function encode(num) {
	  var encoded = '';

	  do {
	    encoded = alphabet[num % length] + encoded;
	    num = Math.floor(num / length);
	  } while (num > 0);

	  return encoded;
	}

	/**
	 * Return the integer value specified by the given string.
	 *
	 * @param {String} str The string to convert.
	 * @returns {Number} The integer value represented by the string.
	 * @api public
	 */
	function decode(str) {
	  var decoded = 0;

	  for (i = 0; i < str.length; i++) {
	    decoded = decoded * length + map[str.charAt(i)];
	  }

	  return decoded;
	}

	/**
	 * Yeast: A tiny growing id generator.
	 *
	 * @returns {String} A unique id.
	 * @api public
	 */
	function yeast() {
	  var now = encode(+new Date());

	  if (now !== prev) return seed = 0, prev = now;
	  return now + '.' + encode(seed++);
	}

	//
	// Map each character to its index.
	//
	for (; i < length; i++) {
	  map[alphabet[i]] = i;
	} //
	// Expose the `yeast`, `encode` and `decode` functions.
	//
	yeast.encode = encode;
	yeast.decode = decode;
	module.exports = yeast;

/***/ },
/* 192 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

	/**
	 * This is the web browser implementation of `debug()`.
	 *
	 * Expose `debug()` as the module.
	 */

	exports = module.exports = __webpack_require__(193);
	exports.log = log;
	exports.formatArgs = formatArgs;
	exports.save = save;
	exports.load = load;
	exports.useColors = useColors;
	exports.storage = 'undefined' != typeof chrome && 'undefined' != typeof chrome.storage ? chrome.storage.local : localstorage();

	/**
	 * Colors.
	 */

	exports.colors = ['lightseagreen', 'forestgreen', 'goldenrod', 'dodgerblue', 'darkorchid', 'crimson'];

	/**
	 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
	 * and the Firebug extension (any Firefox version) are known
	 * to support "%c" CSS customizations.
	 *
	 * TODO: add a `localStorage` variable to explicitly enable/disable colors
	 */

	function useColors() {
	  // is webkit? http://stackoverflow.com/a/16459606/376773
	  return 'WebkitAppearance' in document.documentElement.style ||
	  // is firebug? http://stackoverflow.com/a/398120/376773
	  window.console && (console.firebug || console.exception && console.table) ||
	  // is firefox >= v31?
	  // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
	  navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31;
	}

	/**
	 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
	 */

	exports.formatters.j = function (v) {
	  return JSON.stringify(v);
	};

	/**
	 * Colorize log arguments if enabled.
	 *
	 * @api public
	 */

	function formatArgs() {
	  var args = arguments;
	  var useColors = this.useColors;

	  args[0] = (useColors ? '%c' : '') + this.namespace + (useColors ? ' %c' : ' ') + args[0] + (useColors ? '%c ' : ' ') + '+' + exports.humanize(this.diff);

	  if (!useColors) return args;

	  var c = 'color: ' + this.color;
	  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

	  // the final "%c" is somewhat tricky, because there could be other
	  // arguments passed either before or after the %c, so we need to
	  // figure out the correct index to insert the CSS into
	  var index = 0;
	  var lastC = 0;
	  args[0].replace(/%[a-z%]/g, function (match) {
	    if ('%%' === match) return;
	    index++;
	    if ('%c' === match) {
	      // we only are interested in the *last* %c
	      // (the user may have provided their own)
	      lastC = index;
	    }
	  });

	  args.splice(lastC, 0, c);
	  return args;
	}

	/**
	 * Invokes `console.log()` when available.
	 * No-op when `console.log` is not a "function".
	 *
	 * @api public
	 */

	function log() {
	  // this hackery is required for IE8/9, where
	  // the `console.log` function doesn't have 'apply'
	  return 'object' === (typeof console === 'undefined' ? 'undefined' : _typeof(console)) && console.log && Function.prototype.apply.call(console.log, console, arguments);
	}

	/**
	 * Save `namespaces`.
	 *
	 * @param {String} namespaces
	 * @api private
	 */

	function save(namespaces) {
	  try {
	    if (null == namespaces) {
	      exports.storage.removeItem('debug');
	    } else {
	      exports.storage.debug = namespaces;
	    }
	  } catch (e) {}
	}

	/**
	 * Load `namespaces`.
	 *
	 * @return {String} returns the previously persisted debug modes
	 * @api private
	 */

	function load() {
	  var r;
	  try {
	    r = exports.storage.debug;
	  } catch (e) {}
	  return r;
	}

	/**
	 * Enable namespaces listed in `localStorage.debug` initially.
	 */

	exports.enable(load());

	/**
	 * Localstorage attempts to return the localstorage.
	 *
	 * This is necessary because safari throws
	 * when a user disables cookies/localstorage
	 * and you attempt to access it.
	 *
	 * @return {LocalStorage}
	 * @api private
	 */

	function localstorage() {
	  try {
	    return window.localStorage;
	  } catch (e) {}
	}

/***/ },
/* 193 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	/**
	 * This is the common logic for both the Node.js and web browser
	 * implementations of `debug()`.
	 *
	 * Expose `debug()` as the module.
	 */

	exports = module.exports = debug;
	exports.coerce = coerce;
	exports.disable = disable;
	exports.enable = enable;
	exports.enabled = enabled;
	exports.humanize = __webpack_require__(194);

	/**
	 * The currently active debug mode names, and names to skip.
	 */

	exports.names = [];
	exports.skips = [];

	/**
	 * Map of special "%n" handling functions, for the debug "format" argument.
	 *
	 * Valid key names are a single, lowercased letter, i.e. "n".
	 */

	exports.formatters = {};

	/**
	 * Previously assigned color.
	 */

	var prevColor = 0;

	/**
	 * Previous log timestamp.
	 */

	var prevTime;

	/**
	 * Select a color.
	 *
	 * @return {Number}
	 * @api private
	 */

	function selectColor() {
	  return exports.colors[prevColor++ % exports.colors.length];
	}

	/**
	 * Create a debugger with the given `namespace`.
	 *
	 * @param {String} namespace
	 * @return {Function}
	 * @api public
	 */

	function debug(namespace) {

	  // define the `disabled` version
	  function disabled() {}
	  disabled.enabled = false;

	  // define the `enabled` version
	  function enabled() {

	    var self = enabled;

	    // set `diff` timestamp
	    var curr = +new Date();
	    var ms = curr - (prevTime || curr);
	    self.diff = ms;
	    self.prev = prevTime;
	    self.curr = curr;
	    prevTime = curr;

	    // add the `color` if not set
	    if (null == self.useColors) self.useColors = exports.useColors();
	    if (null == self.color && self.useColors) self.color = selectColor();

	    var args = Array.prototype.slice.call(arguments);

	    args[0] = exports.coerce(args[0]);

	    if ('string' !== typeof args[0]) {
	      // anything else let's inspect with %o
	      args = ['%o'].concat(args);
	    }

	    // apply any `formatters` transformations
	    var index = 0;
	    args[0] = args[0].replace(/%([a-z%])/g, function (match, format) {
	      // if we encounter an escaped % then don't increase the array index
	      if (match === '%%') return match;
	      index++;
	      var formatter = exports.formatters[format];
	      if ('function' === typeof formatter) {
	        var val = args[index];
	        match = formatter.call(self, val);

	        // now we need to remove `args[index]` since it's inlined in the `format`
	        args.splice(index, 1);
	        index--;
	      }
	      return match;
	    });

	    if ('function' === typeof exports.formatArgs) {
	      args = exports.formatArgs.apply(self, args);
	    }
	    var logFn = enabled.log || exports.log || console.log.bind(console);
	    logFn.apply(self, args);
	  }
	  enabled.enabled = true;

	  var fn = exports.enabled(namespace) ? enabled : disabled;

	  fn.namespace = namespace;

	  return fn;
	}

	/**
	 * Enables a debug mode by namespaces. This can include modes
	 * separated by a colon and wildcards.
	 *
	 * @param {String} namespaces
	 * @api public
	 */

	function enable(namespaces) {
	  exports.save(namespaces);

	  var split = (namespaces || '').split(/[\s,]+/);
	  var len = split.length;

	  for (var i = 0; i < len; i++) {
	    if (!split[i]) continue; // ignore empty strings
	    namespaces = split[i].replace(/\*/g, '.*?');
	    if (namespaces[0] === '-') {
	      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
	    } else {
	      exports.names.push(new RegExp('^' + namespaces + '$'));
	    }
	  }
	}

	/**
	 * Disable debug output.
	 *
	 * @api public
	 */

	function disable() {
	  exports.enable('');
	}

	/**
	 * Returns true if the given mode name is enabled, false otherwise.
	 *
	 * @param {String} name
	 * @return {Boolean}
	 * @api public
	 */

	function enabled(name) {
	  var i, len;
	  for (i = 0, len = exports.skips.length; i < len; i++) {
	    if (exports.skips[i].test(name)) {
	      return false;
	    }
	  }
	  for (i = 0, len = exports.names.length; i < len; i++) {
	    if (exports.names[i].test(name)) {
	      return true;
	    }
	  }
	  return false;
	}

	/**
	 * Coerce `val`.
	 *
	 * @param {Mixed} val
	 * @return {Mixed}
	 * @api private
	 */

	function coerce(val) {
	  if (val instanceof Error) return val.stack || val.message;
	  return val;
	}

/***/ },
/* 194 */
/***/ function(module, exports) {

	'use strict';

	/**
	 * Helpers.
	 */

	var s = 1000;
	var m = s * 60;
	var h = m * 60;
	var d = h * 24;
	var y = d * 365.25;

	/**
	 * Parse or format the given `val`.
	 *
	 * Options:
	 *
	 *  - `long` verbose formatting [false]
	 *
	 * @param {String|Number} val
	 * @param {Object} options
	 * @return {String|Number}
	 * @api public
	 */

	module.exports = function (val, options) {
	  options = options || {};
	  if ('string' == typeof val) return parse(val);
	  return options.long ? long(val) : short(val);
	};

	/**
	 * Parse the given `str` and return milliseconds.
	 *
	 * @param {String} str
	 * @return {Number}
	 * @api private
	 */

	function parse(str) {
	  str = '' + str;
	  if (str.length > 10000) return;
	  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
	  if (!match) return;
	  var n = parseFloat(match[1]);
	  var type = (match[2] || 'ms').toLowerCase();
	  switch (type) {
	    case 'years':
	    case 'year':
	    case 'yrs':
	    case 'yr':
	    case 'y':
	      return n * y;
	    case 'days':
	    case 'day':
	    case 'd':
	      return n * d;
	    case 'hours':
	    case 'hour':
	    case 'hrs':
	    case 'hr':
	    case 'h':
	      return n * h;
	    case 'minutes':
	    case 'minute':
	    case 'mins':
	    case 'min':
	    case 'm':
	      return n * m;
	    case 'seconds':
	    case 'second':
	    case 'secs':
	    case 'sec':
	    case 's':
	      return n * s;
	    case 'milliseconds':
	    case 'millisecond':
	    case 'msecs':
	    case 'msec':
	    case 'ms':
	      return n;
	  }
	}

	/**
	 * Short format for `ms`.
	 *
	 * @param {Number} ms
	 * @return {String}
	 * @api private
	 */

	function short(ms) {
	  if (ms >= d) return Math.round(ms / d) + 'd';
	  if (ms >= h) return Math.round(ms / h) + 'h';
	  if (ms >= m) return Math.round(ms / m) + 'm';
	  if (ms >= s) return Math.round(ms / s) + 's';
	  return ms + 'ms';
	}

	/**
	 * Long format for `ms`.
	 *
	 * @param {Number} ms
	 * @return {String}
	 * @api private
	 */

	function long(ms) {
	  return plural(ms, d, 'day') || plural(ms, h, 'hour') || plural(ms, m, 'minute') || plural(ms, s, 'second') || ms + ' ms';
	}

	/**
	 * Pluralization helper.
	 */

	function plural(ms, n, name) {
	  if (ms < n) return;
	  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
	  return Math.ceil(ms / n) + ' ' + name + 's';
	}

/***/ },
/* 195 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {'use strict';

	/**
	 * Module requirements.
	 */

	var Polling = __webpack_require__(176);
	var inherit = __webpack_require__(190);

	/**
	 * Module exports.
	 */

	module.exports = JSONPPolling;

	/**
	 * Cached regular expressions.
	 */

	var rNewline = /\n/g;
	var rEscapedNewline = /\\n/g;

	/**
	 * Global JSONP callbacks.
	 */

	var callbacks;

	/**
	 * Callbacks count.
	 */

	var index = 0;

	/**
	 * Noop.
	 */

	function empty() {}

	/**
	 * JSONP Polling constructor.
	 *
	 * @param {Object} opts.
	 * @api public
	 */

	function JSONPPolling(opts) {
	  Polling.call(this, opts);

	  this.query = this.query || {};

	  // define global callbacks array if not present
	  // we do this here (lazily) to avoid unneeded global pollution
	  if (!callbacks) {
	    // we need to consider multiple engines in the same page
	    if (!global.___eio) global.___eio = [];
	    callbacks = global.___eio;
	  }

	  // callback identifier
	  this.index = callbacks.length;

	  // add callback to jsonp global
	  var self = this;
	  callbacks.push(function (msg) {
	    self.onData(msg);
	  });

	  // append to query string
	  this.query.j = this.index;

	  // prevent spurious errors from being emitted when the window is unloaded
	  if (global.document && global.addEventListener) {
	    global.addEventListener('beforeunload', function () {
	      if (self.script) self.script.onerror = empty;
	    }, false);
	  }
	}

	/**
	 * Inherits from Polling.
	 */

	inherit(JSONPPolling, Polling);

	/*
	 * JSONP only supports binary as base64 encoded strings
	 */

	JSONPPolling.prototype.supportsBinary = false;

	/**
	 * Closes the socket.
	 *
	 * @api private
	 */

	JSONPPolling.prototype.doClose = function () {
	  if (this.script) {
	    this.script.parentNode.removeChild(this.script);
	    this.script = null;
	  }

	  if (this.form) {
	    this.form.parentNode.removeChild(this.form);
	    this.form = null;
	    this.iframe = null;
	  }

	  Polling.prototype.doClose.call(this);
	};

	/**
	 * Starts a poll cycle.
	 *
	 * @api private
	 */

	JSONPPolling.prototype.doPoll = function () {
	  var self = this;
	  var script = document.createElement('script');

	  if (this.script) {
	    this.script.parentNode.removeChild(this.script);
	    this.script = null;
	  }

	  script.async = true;
	  script.src = this.uri();
	  script.onerror = function (e) {
	    self.onError('jsonp poll error', e);
	  };

	  var insertAt = document.getElementsByTagName('script')[0];
	  if (insertAt) {
	    insertAt.parentNode.insertBefore(script, insertAt);
	  } else {
	    (document.head || document.body).appendChild(script);
	  }
	  this.script = script;

	  var isUAgecko = 'undefined' != typeof navigator && /gecko/i.test(navigator.userAgent);

	  if (isUAgecko) {
	    setTimeout(function () {
	      var iframe = document.createElement('iframe');
	      document.body.appendChild(iframe);
	      document.body.removeChild(iframe);
	    }, 100);
	  }
	};

	/**
	 * Writes with a hidden iframe.
	 *
	 * @param {String} data to send
	 * @param {Function} called upon flush.
	 * @api private
	 */

	JSONPPolling.prototype.doWrite = function (data, fn) {
	  var self = this;

	  if (!this.form) {
	    var form = document.createElement('form');
	    var area = document.createElement('textarea');
	    var id = this.iframeId = 'eio_iframe_' + this.index;
	    var iframe;

	    form.className = 'socketio';
	    form.style.position = 'absolute';
	    form.style.top = '-1000px';
	    form.style.left = '-1000px';
	    form.target = id;
	    form.method = 'POST';
	    form.setAttribute('accept-charset', 'utf-8');
	    area.name = 'd';
	    form.appendChild(area);
	    document.body.appendChild(form);

	    this.form = form;
	    this.area = area;
	  }

	  this.form.action = this.uri();

	  function complete() {
	    initIframe();
	    fn();
	  }

	  function initIframe() {
	    if (self.iframe) {
	      try {
	        self.form.removeChild(self.iframe);
	      } catch (e) {
	        self.onError('jsonp polling iframe removal error', e);
	      }
	    }

	    try {
	      // ie6 dynamic iframes with target="" support (thanks Chris Lambacher)
	      var html = '<iframe src="javascript:0" name="' + self.iframeId + '">';
	      iframe = document.createElement(html);
	    } catch (e) {
	      iframe = document.createElement('iframe');
	      iframe.name = self.iframeId;
	      iframe.src = 'javascript:0';
	    }

	    iframe.id = self.iframeId;

	    self.form.appendChild(iframe);
	    self.iframe = iframe;
	  }

	  initIframe();

	  // escape \n to prevent it from being converted into \r\n by some UAs
	  // double escaping is required for escaped new lines because unescaping of new lines can be done safely on server-side
	  data = data.replace(rEscapedNewline, '\\\n');
	  this.area.value = data.replace(rNewline, '\\n');

	  try {
	    this.form.submit();
	  } catch (e) {}

	  if (this.iframe.attachEvent) {
	    this.iframe.onreadystatechange = function () {
	      if (self.iframe.readyState == 'complete') {
	        complete();
	      }
	    };
	  } else {
	    this.iframe.onload = complete;
	  }
	};
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 196 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {'use strict';

	/**
	 * Module dependencies.
	 */

	var Transport = __webpack_require__(177);
	var parser = __webpack_require__(178);
	var parseqs = __webpack_require__(189);
	var inherit = __webpack_require__(190);
	var yeast = __webpack_require__(191);
	var debug = __webpack_require__(192)('engine.io-client:websocket');
	var BrowserWebSocket = global.WebSocket || global.MozWebSocket;

	/**
	 * Get either the `WebSocket` or `MozWebSocket` globals
	 * in the browser or try to resolve WebSocket-compatible
	 * interface exposed by `ws` for Node-like environment.
	 */

	var WebSocket = BrowserWebSocket;
	if (!WebSocket && typeof window === 'undefined') {
	  try {
	    WebSocket = __webpack_require__(197);
	  } catch (e) {}
	}

	/**
	 * Module exports.
	 */

	module.exports = WS;

	/**
	 * WebSocket transport constructor.
	 *
	 * @api {Object} connection options
	 * @api public
	 */

	function WS(opts) {
	  var forceBase64 = opts && opts.forceBase64;
	  if (forceBase64) {
	    this.supportsBinary = false;
	  }
	  this.perMessageDeflate = opts.perMessageDeflate;
	  Transport.call(this, opts);
	}

	/**
	 * Inherits from Transport.
	 */

	inherit(WS, Transport);

	/**
	 * Transport name.
	 *
	 * @api public
	 */

	WS.prototype.name = 'websocket';

	/*
	 * WebSockets support binary
	 */

	WS.prototype.supportsBinary = true;

	/**
	 * Opens socket.
	 *
	 * @api private
	 */

	WS.prototype.doOpen = function () {
	  if (!this.check()) {
	    // let probe timeout
	    return;
	  }

	  var self = this;
	  var uri = this.uri();
	  var protocols = void 0;
	  var opts = {
	    agent: this.agent,
	    perMessageDeflate: this.perMessageDeflate
	  };

	  // SSL options for Node.js client
	  opts.pfx = this.pfx;
	  opts.key = this.key;
	  opts.passphrase = this.passphrase;
	  opts.cert = this.cert;
	  opts.ca = this.ca;
	  opts.ciphers = this.ciphers;
	  opts.rejectUnauthorized = this.rejectUnauthorized;
	  if (this.extraHeaders) {
	    opts.headers = this.extraHeaders;
	  }

	  this.ws = BrowserWebSocket ? new WebSocket(uri) : new WebSocket(uri, protocols, opts);

	  if (this.ws.binaryType === undefined) {
	    this.supportsBinary = false;
	  }

	  if (this.ws.supports && this.ws.supports.binary) {
	    this.supportsBinary = true;
	    this.ws.binaryType = 'buffer';
	  } else {
	    this.ws.binaryType = 'arraybuffer';
	  }

	  this.addEventListeners();
	};

	/**
	 * Adds event listeners to the socket
	 *
	 * @api private
	 */

	WS.prototype.addEventListeners = function () {
	  var self = this;

	  this.ws.onopen = function () {
	    self.onOpen();
	  };
	  this.ws.onclose = function () {
	    self.onClose();
	  };
	  this.ws.onmessage = function (ev) {
	    self.onData(ev.data);
	  };
	  this.ws.onerror = function (e) {
	    self.onError('websocket error', e);
	  };
	};

	/**
	 * Override `onData` to use a timer on iOS.
	 * See: https://gist.github.com/mloughran/2052006
	 *
	 * @api private
	 */

	if ('undefined' != typeof navigator && /iPad|iPhone|iPod/i.test(navigator.userAgent)) {
	  WS.prototype.onData = function (data) {
	    var self = this;
	    setTimeout(function () {
	      Transport.prototype.onData.call(self, data);
	    }, 0);
	  };
	}

	/**
	 * Writes data to socket.
	 *
	 * @param {Array} array of packets.
	 * @api private
	 */

	WS.prototype.write = function (packets) {
	  var self = this;
	  this.writable = false;

	  // encodePacket efficient as it uses WS framing
	  // no need for encodePayload
	  var total = packets.length;
	  for (var i = 0, l = total; i < l; i++) {
	    (function (packet) {
	      parser.encodePacket(packet, self.supportsBinary, function (data) {
	        if (!BrowserWebSocket) {
	          // always create a new object (GH-437)
	          var opts = {};
	          if (packet.options) {
	            opts.compress = packet.options.compress;
	          }

	          if (self.perMessageDeflate) {
	            var len = 'string' == typeof data ? global.Buffer.byteLength(data) : data.length;
	            if (len < self.perMessageDeflate.threshold) {
	              opts.compress = false;
	            }
	          }
	        }

	        //Sometimes the websocket has already been closed but the browser didn't
	        //have a chance of informing us about it yet, in that case send will
	        //throw an error
	        try {
	          if (BrowserWebSocket) {
	            // TypeError is thrown when passing the second argument on Safari
	            self.ws.send(data);
	          } else {
	            self.ws.send(data, opts);
	          }
	        } catch (e) {
	          debug('websocket closed before onclose event');
	        }

	        --total || done();
	      });
	    })(packets[i]);
	  }

	  function done() {
	    self.emit('flush');

	    // fake drain
	    // defer to next tick to allow Socket to clear writeBuffer
	    setTimeout(function () {
	      self.writable = true;
	      self.emit('drain');
	    }, 0);
	  }
	};

	/**
	 * Called upon close
	 *
	 * @api private
	 */

	WS.prototype.onClose = function () {
	  Transport.prototype.onClose.call(this);
	};

	/**
	 * Closes socket.
	 *
	 * @api private
	 */

	WS.prototype.doClose = function () {
	  if (typeof this.ws !== 'undefined') {
	    this.ws.close();
	  }
	};

	/**
	 * Generates uri for connection.
	 *
	 * @api private
	 */

	WS.prototype.uri = function () {
	  var query = this.query || {};
	  var schema = this.secure ? 'wss' : 'ws';
	  var port = '';

	  // avoid port if default for schema
	  if (this.port && ('wss' == schema && this.port != 443 || 'ws' == schema && this.port != 80)) {
	    port = ':' + this.port;
	  }

	  // append timestamp to URI
	  if (this.timestampRequests) {
	    query[this.timestampParam] = yeast();
	  }

	  // communicate binary support capabilities
	  if (!this.supportsBinary) {
	    query.b64 = 1;
	  }

	  query = parseqs.encode(query);

	  // prepend ? to query
	  if (query.length) {
	    query = '?' + query;
	  }

	  var ipv6 = this.hostname.indexOf(':') !== -1;
	  return schema + '://' + (ipv6 ? '[' + this.hostname + ']' : this.hostname) + port + this.path + query;
	};

	/**
	 * Feature detection for WebSocket.
	 *
	 * @return {Boolean} whether this transport is available.
	 * @api public
	 */

	WS.prototype.check = function () {
	  return !!WebSocket && !('__initialize' in WebSocket && this.name === WS.prototype.name);
	};
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 197 */
/***/ function(module, exports) {

	/* (ignored) */

/***/ },
/* 198 */
/***/ function(module, exports) {

	"use strict";

	var indexOf = [].indexOf;

	module.exports = function (arr, obj) {
	  if (indexOf) return arr.indexOf(obj);
	  for (var i = 0; i < arr.length; ++i) {
	    if (arr[i] === obj) return i;
	  }
	  return -1;
	};

/***/ },
/* 199 */
/***/ function(module, exports) {

	'use strict';

	/**
	 * Parses an URI
	 *
	 * @author Steven Levithan <stevenlevithan.com> (MIT license)
	 * @api private
	 */

	var re = /^(?:(?![^:@]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;

	var parts = ['source', 'protocol', 'authority', 'userInfo', 'user', 'password', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'anchor'];

	module.exports = function parseuri(str) {
	    var src = str,
	        b = str.indexOf('['),
	        e = str.indexOf(']');

	    if (b != -1 && e != -1) {
	        str = str.substring(0, b) + str.substring(b, e).replace(/:/g, ';') + str.substring(e, str.length);
	    }

	    var m = re.exec(str || ''),
	        uri = {},
	        i = 14;

	    while (i--) {
	        uri[parts[i]] = m[i] || '';
	    }

	    if (b != -1 && e != -1) {
	        uri.source = src;
	        uri.host = uri.host.substring(1, uri.host.length - 1).replace(/;/g, ':');
	        uri.authority = uri.authority.replace('[', '').replace(']', '').replace(/;/g, ':');
	        uri.ipv6uri = true;
	    }

	    return uri;
	};

/***/ },
/* 200 */
/***/ function(module, exports) {

	/* WEBPACK VAR INJECTION */(function(global) {'use strict';

	/**
	 * JSON parse.
	 *
	 * @see Based on jQuery#parseJSON (MIT) and JSON2
	 * @api private
	 */

	var rvalidchars = /^[\],:{}\s]*$/;
	var rvalidescape = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
	var rvalidtokens = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
	var rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g;
	var rtrimLeft = /^\s+/;
	var rtrimRight = /\s+$/;

	module.exports = function parsejson(data) {
	  if ('string' != typeof data || !data) {
	    return null;
	  }

	  data = data.replace(rtrimLeft, '').replace(rtrimRight, '');

	  // Attempt to parse using the native JSON parser first
	  if (global.JSON && JSON.parse) {
	    return JSON.parse(data);
	  }

	  if (rvalidchars.test(data.replace(rvalidescape, '@').replace(rvalidtokens, ']').replace(rvalidbraces, ''))) {
	    return new Function('return ' + data)();
	  }
	};
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 201 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;
	exports.TokenStorage = exports.FakeStorage = undefined;

	var _typeof2 = __webpack_require__(50);

	var _typeof3 = _interopRequireDefault(_typeof2);

	var _classCallCheck2 = __webpack_require__(126);

	var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

	exports.authEndpoint = authEndpoint;
	exports.clearAuthTokens = clearAuthTokens;

	var _queryParse = __webpack_require__(202);

	var _queryParse2 = _interopRequireDefault(_queryParse);

	var _Observable = __webpack_require__(2);

	var _fetch = __webpack_require__(203);

	var _fetch2 = _interopRequireDefault(_fetch);

	__webpack_require__(209);

	__webpack_require__(42);

	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : { 'default': obj };
	}

	var HORIZON_JWT = 'horizon-jwt';

	/** @this Horizon **/
	function authEndpoint(name) {
	  var _this = this;

	  var endpointForName = function endpointForName(methods) {
	    if (methods.hasOwnProperty(name)) {
	      return methods[name];
	    } else {
	      throw new Error('Unconfigured auth type: ' + name);
	    }
	  };
	  if (!this._authMethods) {
	    return (0, _fetch2['default'])(this._horizonPath + '/auth_methods')['do'](function (authMethods) {
	      _this._authMethods = authMethods;
	    }).map(endpointForName);
	  } else {
	    return _Observable.Observable.of(this._authMethods).map(endpointForName);
	  }
	}

	// Simple shim to make a Map look like local/session storage

	var FakeStorage = exports.FakeStorage = function () {
	  function FakeStorage() {
	    (0, _classCallCheck3['default'])(this, FakeStorage);
	    this._storage = new Map();
	  }

	  FakeStorage.prototype.setItem = function setItem(a, b) {
	    return this._storage.set(a, b);
	  };

	  FakeStorage.prototype.getItem = function getItem(a) {
	    return this._storage.get(a);
	  };

	  FakeStorage.prototype.removeItem = function removeItem(a) {
	    return this._storage['delete'](a);
	  };

	  return FakeStorage;
	}();

	function getStorage() {
	  var storeLocally = arguments.length <= 0 || arguments[0] === undefined ? true : arguments[0];

	  var storage = void 0;
	  try {
	    if (!storeLocally || (typeof window === 'undefined' ? 'undefined' : (0, _typeof3['default'])(window)) !== 'object' || window.localStorage === undefined) {
	      storage = new FakeStorage();
	    } else {
	      // Mobile safari in private browsing has a localStorage, but it
	      // has a size limit of 0
	      window.localStorage.setItem('$$fake', 1);
	      window.localStorage.removeItem('$$fake');
	      storage = window.localStorage;
	    }
	  } catch (error) {
	    if (window.sessionStorage === undefined) {
	      storage = new FakeStorage();
	    } else {
	      storage = window.sessionStorage;
	    }
	  }
	  return storage;
	}

	var TokenStorage = exports.TokenStorage = function () {
	  function TokenStorage() {
	    var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

	    var _ref$authType = _ref.authType;
	    var authType = _ref$authType === undefined ? 'token' : _ref$authType;
	    var _ref$storage = _ref.storage;
	    var storage = _ref$storage === undefined ? getStorage(authType.storeLocally) : _ref$storage;
	    var _ref$path = _ref.path;
	    var path = _ref$path === undefined ? 'horizon' : _ref$path;
	    (0, _classCallCheck3['default'])(this, TokenStorage);

	    this._storage = storage;
	    this._path = path;
	    if (typeof authType === 'string') {
	      this._authType = authType;
	    } else {
	      this._authType = 'token';
	      this.set(authType.token);
	    }
	  }

	  TokenStorage.prototype._getHash = function _getHash() {
	    var val = this._storage.getItem(HORIZON_JWT);
	    if (val == null) {
	      return {};
	    } else {
	      return JSON.parse(val);
	    }
	  };

	  TokenStorage.prototype._setHash = function _setHash(hash) {
	    this._storage.setItem(HORIZON_JWT, JSON.stringify(hash));
	  };

	  TokenStorage.prototype.set = function set(jwt) {
	    var current = this._getHash();
	    current[this._path] = jwt;
	    this._setHash(current);
	  };

	  TokenStorage.prototype.get = function get() {
	    return this._getHash()[this._path];
	  };

	  TokenStorage.prototype.remove = function remove() {
	    var current = this._getHash();
	    delete current[this._path];
	    this._setHash(current);
	  };

	  TokenStorage.prototype.setAuthFromQueryParams = function setAuthFromQueryParams() {
	    var parsed = typeof window !== 'undefined' ? (0, _queryParse2['default'])(window.location.search) : {};

	    if (parsed.horizon_token != null) {
	      this.set(parsed.horizon_token);
	    }
	  };

	  // Handshake types are implemented here


	  TokenStorage.prototype.handshake = function handshake() {
	    // If we have a token, we should send it rather than requesting a
	    // new one
	    var token = this.get();
	    if (token != null) {
	      return { method: 'token', token: token };
	    } else if (this._authType === 'token') {
	      throw new Error('Attempting to authenticate with a token, but no token is present');
	    } else {
	      return { method: this._authType };
	    }
	  };

	  // Whether there is an auth token for the provided authType


	  TokenStorage.prototype.hasAuthToken = function hasAuthToken() {
	    return Boolean(this.get());
	  };

	  return TokenStorage;
	}();

	function clearAuthTokens() {
	  return getStorage().removeItem(HORIZON_JWT);
	}
	//# sourceMappingURL=auth.js.map

/***/ },
/* 202 */
/***/ function(module, exports) {

	'use strict';

	exports.__esModule = true;

	exports['default'] = function (str) {
	  if (typeof str !== 'string') {
	    return {};
	  }

	  var str2 = str.trim().replace(/^(\?|#|&)/, '');

	  if (!str2) {
	    return {};
	  }

	  return str2.split('&').reduce(function (ret, param) {
	    var parts = param.replace(/\+/g, ' ').split('=');
	    // Firefox (pre 40) decodes `%3D` to `=`
	    // https://github.com/sindresorhus/query-string/pull/37
	    var key = parts.shift();
	    var val = parts.length > 0 ? parts.join('=') : undefined;

	    var key2 = decodeURIComponent(key);

	    // missing `=` should be `null`:
	    // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
	    var val2 = val === undefined ? null : decodeURIComponent(val);

	    if (!ret.hasOwnProperty(key2)) {
	      ret[key2] = val2;
	    } else if (Array.isArray(ret[key2])) {
	      ret[key2].push(val2);
	    } else {
	      ret[key2] = [ret[key2], val2];
	    }

	    return ret;
	  }, {});
	};
	//# sourceMappingURL=query-parse.js.map

/***/ },
/* 203 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {'use strict';

	exports.__esModule = true;
	exports['default'] = fetchJSON;

	var _Observable = __webpack_require__(2);

	__webpack_require__(204);

	__webpack_require__(206);

	global.self = global;
	__webpack_require__(207);

	function fetchJSON(url) {
	  return _Observable.Observable.fromPromise(fetch(url)).mergeMap(function (response) {
	    var contentType = response.headers.get('content-type');
	    if (contentType && contentType.indexOf('application/json') !== -1) {
	      return response.json();
	    } else {
	      return response.text().then(function (resp) {
	        return {
	          error: 'Response was not json',
	          responseBody: resp
	        };
	      });
	    }
	  });
	}
	//# sourceMappingURL=fetch.js.map
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 204 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var Observable_1 = __webpack_require__(2);
	var fromPromise_1 = __webpack_require__(205);
	Observable_1.Observable.fromPromise = fromPromise_1.fromPromise;
	//# sourceMappingURL=fromPromise.js.map

/***/ },
/* 205 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var PromiseObservable_1 = __webpack_require__(28);
	exports.fromPromise = PromiseObservable_1.PromiseObservable.create;
	//# sourceMappingURL=fromPromise.js.map

/***/ },
/* 206 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var Observable_1 = __webpack_require__(2);
	var mergeMap_1 = __webpack_require__(38);
	Observable_1.Observable.prototype.mergeMap = mergeMap_1.mergeMap;
	Observable_1.Observable.prototype.flatMap = mergeMap_1.mergeMap;
	//# sourceMappingURL=mergeMap.js.map

/***/ },
/* 207 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {/*** IMPORTS FROM imports-loader ***/
	(function() {

	'use strict';

	// the whatwg-fetch polyfill installs the fetch() function
	// on the global object (window or self)
	//
	// Return that as the export for use in Webpack, Browserify etc.
	__webpack_require__(208);
	module.exports = self.fetch.bind(self);

	/*** EXPORTS FROM exports-loader ***/
	module.exports = global.fetch;
	}.call(global));
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 208 */
/***/ function(module, exports) {

	'use strict';

	(function (self) {
	  'use strict';

	  if (self.fetch) {
	    return;
	  }

	  var support = {
	    searchParams: 'URLSearchParams' in self,
	    iterable: 'Symbol' in self && 'iterator' in Symbol,
	    blob: 'FileReader' in self && 'Blob' in self && function () {
	      try {
	        new Blob();
	        return true;
	      } catch (e) {
	        return false;
	      }
	    }(),
	    formData: 'FormData' in self,
	    arrayBuffer: 'ArrayBuffer' in self
	  };

	  function normalizeName(name) {
	    if (typeof name !== 'string') {
	      name = String(name);
	    }
	    if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
	      throw new TypeError('Invalid character in header field name');
	    }
	    return name.toLowerCase();
	  }

	  function normalizeValue(value) {
	    if (typeof value !== 'string') {
	      value = String(value);
	    }
	    return value;
	  }

	  // Build a destructive iterator for the value list
	  function iteratorFor(items) {
	    var iterator = {
	      next: function next() {
	        var value = items.shift();
	        return { done: value === undefined, value: value };
	      }
	    };

	    if (support.iterable) {
	      iterator[Symbol.iterator] = function () {
	        return iterator;
	      };
	    }

	    return iterator;
	  }

	  function Headers(headers) {
	    this.map = {};

	    if (headers instanceof Headers) {
	      headers.forEach(function (value, name) {
	        this.append(name, value);
	      }, this);
	    } else if (headers) {
	      Object.getOwnPropertyNames(headers).forEach(function (name) {
	        this.append(name, headers[name]);
	      }, this);
	    }
	  }

	  Headers.prototype.append = function (name, value) {
	    name = normalizeName(name);
	    value = normalizeValue(value);
	    var list = this.map[name];
	    if (!list) {
	      list = [];
	      this.map[name] = list;
	    }
	    list.push(value);
	  };

	  Headers.prototype['delete'] = function (name) {
	    delete this.map[normalizeName(name)];
	  };

	  Headers.prototype.get = function (name) {
	    var values = this.map[normalizeName(name)];
	    return values ? values[0] : null;
	  };

	  Headers.prototype.getAll = function (name) {
	    return this.map[normalizeName(name)] || [];
	  };

	  Headers.prototype.has = function (name) {
	    return this.map.hasOwnProperty(normalizeName(name));
	  };

	  Headers.prototype.set = function (name, value) {
	    this.map[normalizeName(name)] = [normalizeValue(value)];
	  };

	  Headers.prototype.forEach = function (callback, thisArg) {
	    Object.getOwnPropertyNames(this.map).forEach(function (name) {
	      this.map[name].forEach(function (value) {
	        callback.call(thisArg, value, name, this);
	      }, this);
	    }, this);
	  };

	  Headers.prototype.keys = function () {
	    var items = [];
	    this.forEach(function (value, name) {
	      items.push(name);
	    });
	    return iteratorFor(items);
	  };

	  Headers.prototype.values = function () {
	    var items = [];
	    this.forEach(function (value) {
	      items.push(value);
	    });
	    return iteratorFor(items);
	  };

	  Headers.prototype.entries = function () {
	    var items = [];
	    this.forEach(function (value, name) {
	      items.push([name, value]);
	    });
	    return iteratorFor(items);
	  };

	  if (support.iterable) {
	    Headers.prototype[Symbol.iterator] = Headers.prototype.entries;
	  }

	  function consumed(body) {
	    if (body.bodyUsed) {
	      return Promise.reject(new TypeError('Already read'));
	    }
	    body.bodyUsed = true;
	  }

	  function fileReaderReady(reader) {
	    return new Promise(function (resolve, reject) {
	      reader.onload = function () {
	        resolve(reader.result);
	      };
	      reader.onerror = function () {
	        reject(reader.error);
	      };
	    });
	  }

	  function readBlobAsArrayBuffer(blob) {
	    var reader = new FileReader();
	    reader.readAsArrayBuffer(blob);
	    return fileReaderReady(reader);
	  }

	  function readBlobAsText(blob) {
	    var reader = new FileReader();
	    reader.readAsText(blob);
	    return fileReaderReady(reader);
	  }

	  function Body() {
	    this.bodyUsed = false;

	    this._initBody = function (body) {
	      this._bodyInit = body;
	      if (typeof body === 'string') {
	        this._bodyText = body;
	      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
	        this._bodyBlob = body;
	      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
	        this._bodyFormData = body;
	      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
	        this._bodyText = body.toString();
	      } else if (!body) {
	        this._bodyText = '';
	      } else if (support.arrayBuffer && ArrayBuffer.prototype.isPrototypeOf(body)) {
	        // Only support ArrayBuffers for POST method.
	        // Receiving ArrayBuffers happens via Blobs, instead.
	      } else {
	        throw new Error('unsupported BodyInit type');
	      }

	      if (!this.headers.get('content-type')) {
	        if (typeof body === 'string') {
	          this.headers.set('content-type', 'text/plain;charset=UTF-8');
	        } else if (this._bodyBlob && this._bodyBlob.type) {
	          this.headers.set('content-type', this._bodyBlob.type);
	        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
	          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
	        }
	      }
	    };

	    if (support.blob) {
	      this.blob = function () {
	        var rejected = consumed(this);
	        if (rejected) {
	          return rejected;
	        }

	        if (this._bodyBlob) {
	          return Promise.resolve(this._bodyBlob);
	        } else if (this._bodyFormData) {
	          throw new Error('could not read FormData body as blob');
	        } else {
	          return Promise.resolve(new Blob([this._bodyText]));
	        }
	      };

	      this.arrayBuffer = function () {
	        return this.blob().then(readBlobAsArrayBuffer);
	      };

	      this.text = function () {
	        var rejected = consumed(this);
	        if (rejected) {
	          return rejected;
	        }

	        if (this._bodyBlob) {
	          return readBlobAsText(this._bodyBlob);
	        } else if (this._bodyFormData) {
	          throw new Error('could not read FormData body as text');
	        } else {
	          return Promise.resolve(this._bodyText);
	        }
	      };
	    } else {
	      this.text = function () {
	        var rejected = consumed(this);
	        return rejected ? rejected : Promise.resolve(this._bodyText);
	      };
	    }

	    if (support.formData) {
	      this.formData = function () {
	        return this.text().then(decode);
	      };
	    }

	    this.json = function () {
	      return this.text().then(JSON.parse);
	    };

	    return this;
	  }

	  // HTTP methods whose capitalization should be normalized
	  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'];

	  function normalizeMethod(method) {
	    var upcased = method.toUpperCase();
	    return methods.indexOf(upcased) > -1 ? upcased : method;
	  }

	  function Request(input, options) {
	    options = options || {};
	    var body = options.body;
	    if (Request.prototype.isPrototypeOf(input)) {
	      if (input.bodyUsed) {
	        throw new TypeError('Already read');
	      }
	      this.url = input.url;
	      this.credentials = input.credentials;
	      if (!options.headers) {
	        this.headers = new Headers(input.headers);
	      }
	      this.method = input.method;
	      this.mode = input.mode;
	      if (!body) {
	        body = input._bodyInit;
	        input.bodyUsed = true;
	      }
	    } else {
	      this.url = input;
	    }

	    this.credentials = options.credentials || this.credentials || 'omit';
	    if (options.headers || !this.headers) {
	      this.headers = new Headers(options.headers);
	    }
	    this.method = normalizeMethod(options.method || this.method || 'GET');
	    this.mode = options.mode || this.mode || null;
	    this.referrer = null;

	    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
	      throw new TypeError('Body not allowed for GET or HEAD requests');
	    }
	    this._initBody(body);
	  }

	  Request.prototype.clone = function () {
	    return new Request(this);
	  };

	  function decode(body) {
	    var form = new FormData();
	    body.trim().split('&').forEach(function (bytes) {
	      if (bytes) {
	        var split = bytes.split('=');
	        var name = split.shift().replace(/\+/g, ' ');
	        var value = split.join('=').replace(/\+/g, ' ');
	        form.append(decodeURIComponent(name), decodeURIComponent(value));
	      }
	    });
	    return form;
	  }

	  function headers(xhr) {
	    var head = new Headers();
	    var pairs = (xhr.getAllResponseHeaders() || '').trim().split('\n');
	    pairs.forEach(function (header) {
	      var split = header.trim().split(':');
	      var key = split.shift().trim();
	      var value = split.join(':').trim();
	      head.append(key, value);
	    });
	    return head;
	  }

	  Body.call(Request.prototype);

	  function Response(bodyInit, options) {
	    if (!options) {
	      options = {};
	    }

	    this.type = 'default';
	    this.status = options.status;
	    this.ok = this.status >= 200 && this.status < 300;
	    this.statusText = options.statusText;
	    this.headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers);
	    this.url = options.url || '';
	    this._initBody(bodyInit);
	  }

	  Body.call(Response.prototype);

	  Response.prototype.clone = function () {
	    return new Response(this._bodyInit, {
	      status: this.status,
	      statusText: this.statusText,
	      headers: new Headers(this.headers),
	      url: this.url
	    });
	  };

	  Response.error = function () {
	    var response = new Response(null, { status: 0, statusText: '' });
	    response.type = 'error';
	    return response;
	  };

	  var redirectStatuses = [301, 302, 303, 307, 308];

	  Response.redirect = function (url, status) {
	    if (redirectStatuses.indexOf(status) === -1) {
	      throw new RangeError('Invalid status code');
	    }

	    return new Response(null, { status: status, headers: { location: url } });
	  };

	  self.Headers = Headers;
	  self.Request = Request;
	  self.Response = Response;

	  self.fetch = function (input, init) {
	    return new Promise(function (resolve, reject) {
	      var request;
	      if (Request.prototype.isPrototypeOf(input) && !init) {
	        request = input;
	      } else {
	        request = new Request(input, init);
	      }

	      var xhr = new XMLHttpRequest();

	      function responseURL() {
	        if ('responseURL' in xhr) {
	          return xhr.responseURL;
	        }

	        // Avoid security warnings on getResponseHeader when not allowed by CORS
	        if (/^X-Request-URL:/m.test(xhr.getAllResponseHeaders())) {
	          return xhr.getResponseHeader('X-Request-URL');
	        }

	        return;
	      }

	      xhr.onload = function () {
	        var options = {
	          status: xhr.status,
	          statusText: xhr.statusText,
	          headers: headers(xhr),
	          url: responseURL()
	        };
	        var body = 'response' in xhr ? xhr.response : xhr.responseText;
	        resolve(new Response(body, options));
	      };

	      xhr.onerror = function () {
	        reject(new TypeError('Network request failed'));
	      };

	      xhr.ontimeout = function () {
	        reject(new TypeError('Network request failed'));
	      };

	      xhr.open(request.method, request.url, true);

	      if (request.credentials === 'include') {
	        xhr.withCredentials = true;
	      }

	      if ('responseType' in xhr && support.blob) {
	        xhr.responseType = 'blob';
	      }

	      request.headers.forEach(function (value, name) {
	        xhr.setRequestHeader(name, value);
	      });

	      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit);
	    });
	  };
	  self.fetch.polyfill = true;
	})(typeof self !== 'undefined' ? self : undefined);

/***/ },
/* 209 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var Observable_1 = __webpack_require__(2);
	var do_1 = __webpack_require__(210);
	Observable_1.Observable.prototype['do'] = do_1._do;
	//# sourceMappingURL=do.js.map

/***/ },
/* 210 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var __extends = undefined && undefined.__extends || function (d, b) {
	    for (var p in b) {
	        if (b.hasOwnProperty(p)) d[p] = b[p];
	    }function __() {
	        this.constructor = d;
	    }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var Subscriber_1 = __webpack_require__(6);
	/**
	 * Perform a side effect for every emission on the source Observable, but return
	 * an Observable that is identical to the source.
	 *
	 * <span class="informal">Intercepts each emission on the source and runs a
	 * function, but returns an output which is identical to the source.</span>
	 *
	 * <img src="./img/do.png" width="100%">
	 *
	 * Returns a mirrored Observable of the source Observable, but modified so that
	 * the provided Observer is called to perform a side effect for every value,
	 * error, and completion emitted by the source. Any errors that are thrown in
	 * the aforementioned Observer or handlers are safely sent down the error path
	 * of the output Observable.
	 *
	 * This operator is useful for debugging your Observables for the correct values
	 * or performing other side effects.
	 *
	 * Note: this is different to a `subscribe` on the Observable. If the Observable
	 * returned by `do` is not subscribed, the side effects specified by the
	 * Observer will never happen. `do` therefore simply spies on existing
	 * execution, it does not trigger an execution to happen like `subscribe` does.
	 *
	 * @example <caption>Map every every click to the clientX position of that click, while also logging the click event</caption>
	 * var clicks = Rx.Observable.fromEvent(document, 'click');
	 * var positions = clicks
	 *   .do(ev => console.log(ev))
	 *   .map(ev => ev.clientX);
	 * positions.subscribe(x => console.log(x));
	 *
	 * @see {@link map}
	 * @see {@link subscribe}
	 *
	 * @param {Observer|function} [nextOrObserver] A normal Observer object or a
	 * callback for `next`.
	 * @param {function} [error] Callback for errors in the source.
	 * @param {function} [complete] Callback for the completion of the source.
	 * @return {Observable} An Observable identical to the source, but runs the
	 * specified Observer or callback(s) for each item.
	 * @method do
	 * @name do
	 * @owner Observable
	 */
	function _do(nextOrObserver, error, complete) {
	    return this.lift(new DoOperator(nextOrObserver, error, complete));
	}
	exports._do = _do;
	var DoOperator = function () {
	    function DoOperator(nextOrObserver, error, complete) {
	        this.nextOrObserver = nextOrObserver;
	        this.error = error;
	        this.complete = complete;
	    }
	    DoOperator.prototype.call = function (subscriber, source) {
	        return source._subscribe(new DoSubscriber(subscriber, this.nextOrObserver, this.error, this.complete));
	    };
	    return DoOperator;
	}();
	/**
	 * We need this JSDoc comment for affecting ESDoc.
	 * @ignore
	 * @extends {Ignored}
	 */
	var DoSubscriber = function (_super) {
	    __extends(DoSubscriber, _super);
	    function DoSubscriber(destination, nextOrObserver, error, complete) {
	        _super.call(this, destination);
	        var safeSubscriber = new Subscriber_1.Subscriber(nextOrObserver, error, complete);
	        safeSubscriber.syncErrorThrowable = true;
	        this.add(safeSubscriber);
	        this.safeSubscriber = safeSubscriber;
	    }
	    DoSubscriber.prototype._next = function (value) {
	        var safeSubscriber = this.safeSubscriber;
	        safeSubscriber.next(value);
	        if (safeSubscriber.syncErrorThrown) {
	            this.destination.error(safeSubscriber.syncErrorValue);
	        } else {
	            this.destination.next(value);
	        }
	    };
	    DoSubscriber.prototype._error = function (err) {
	        var safeSubscriber = this.safeSubscriber;
	        safeSubscriber.error(err);
	        if (safeSubscriber.syncErrorThrown) {
	            this.destination.error(safeSubscriber.syncErrorValue);
	        } else {
	            this.destination.error(err);
	        }
	    };
	    DoSubscriber.prototype._complete = function () {
	        var safeSubscriber = this.safeSubscriber;
	        safeSubscriber.complete();
	        if (safeSubscriber.syncErrorThrown) {
	            this.destination.error(safeSubscriber.syncErrorValue);
	        } else {
	            this.destination.complete();
	        }
	    };
	    return DoSubscriber;
	}(Subscriber_1.Subscriber);
	//# sourceMappingURL=do.js.map

/***/ }
/******/ ]);
//# sourceMappingURL=client.js.map